import { derived, writable, type Readable } from "svelte/store";
import { CodeError, ErrorCode } from "./error";
import { curWalletInfoStore, curWalletStore, errStore, nodeCaughtUpStore } from "./store";
import { ensureMinerdIsRunning, isSidecarRunning, sleep, stopSidecar } from "./utils";
import { getMinerAddresses, getNewMinerAddress } from "./wallet-utils";


class MinerLooper {
    private static instance: MinerLooper;
    private walletName: string;
    private constructor(walletName: string = '') {
        this.walletName = walletName;
    }
    public static getInstance() {
        // if (!MinerLooper.instance) {
        //     MinerLooper.instance = new MinerLooper();
        // }
        return MinerLooper.instance;
    }

    public static async switchWallet(walletName: string) {
        // console.log('switchWallet:', walletName);
        if (MinerLooper.instance && MinerLooper.instance.walletName === walletName) {
            return MinerLooper.instance;
        }
        let isSwitchingLoopRunning = false;
        if (MinerLooper.instance) {
            isSwitchingLoopRunning = MinerLooper.instance.isSwitchingLoopRunning;
            await MinerLooper.instance.stopMiner();
        }
        //create a new instance
        // console.log('switchWallet create a new instance isSwitchingLoopRunning:', isSwitchingLoopRunning);
        MinerLooper.instance = new MinerLooper(walletName);
        if (isSwitchingLoopRunning) {
            await MinerLooper.instance.startMiner();
        }
        return MinerLooper.instance;
    }

    private exitLoop = false;
    private isSwitching = false;
    // switchMinerAddrLoop is running
    private isSwitchingLoopRunning = false;


    public async switchMinerAddrLoop() {
        if (this.isSwitchingLoopRunning) {
            return;
        }
        this.isSwitchingLoopRunning = true;
        // check exitLoop every 6 seconds and switch miner address every 60 minutes
        this.exitLoop = false;
        let count = 0;
        let currentMinerAddress: string | null = null;
        
        for (; !this.exitLoop; count++, await sleep(6 * 1000)) {
            let assumeMinerIsRunning = true;
            //check if minerd is running every 10*6 seconds
            if (count % 10 === 0) {
                assumeMinerIsRunning = await isSidecarRunning('minerd');
            }
            // switch miner address every 120 minutes
            if (count % 1200 !== 0 && assumeMinerIsRunning) {
                continue;
            }
            
            this.isSwitching = true;
            try {
                await stopSidecar('minerd').catch(e => {
                    console.error('needMine stopSidecar minerd failed:', e);
                });

                // Get a new unused address
                const newAddress = await getNewMinerAddress(this.walletName);
                if (!newAddress) {
                    throw new CodeError(
                        ErrorCode.GET_MINER_ADDRESSES_FAILED,
                        `Failed to get new miner address from wallet ${this.walletName}`
                    );
                }

                // Only update if we got a new address
                currentMinerAddress = newAddress;
                const threads = getMinerThreads();
                await ensureMinerdIsRunning(threads, currentMinerAddress);
                
            } catch (e) {
                console.log('error switching miner address');
                console.error(e);
                if (e instanceof CodeError) {
                    errStore.set(e);
                }
            } finally {
                this.isSwitching = false;
            }
        }
        this.isSwitching = false;
        this.isSwitchingLoopRunning = false;
    }


    public async startMiner() {
        if (this.isSwitchingLoopRunning) {
            return;
        }
        this.isSwitching = true;
        this.switchMinerAddrLoop();
        //wait until this.isSwitching equals false
        while (this.isSwitching) {
            await sleep(500);
        }
    }

    public async stopMiner() {
        this.exitLoop = true;
        this.isSwitching = true;
        try {
            await stopSidecar('minerd');
            let count = 0;
            while (this.isSwitching || this.isSwitchingLoopRunning) {
                await sleep(1000);
                if (count++ > 10) {
                    break;
                }
            }
        } finally {
            // in case of stopSidecar execption
            this.isSwitching = false;
            this.isSwitchingLoopRunning = false;
        }
    }

    async isMinerRunning() {
        return this.isSwitchingLoopRunning;
    }

    async isMinerProcessAlive() {
        try {
            while (this.isSwitching) {
                await sleep(500);
            }
            return await isSidecarRunning('minerd');
        } catch (e) {
            console.error("isMinerProcessAlive:", e);
            return false;
        }
    }
}

export const minerIsSwitchingWalletStore = writable(false);
const needMine: Readable<string> = derived([nodeCaughtUpStore, curWalletInfoStore, curWalletStore], ([$nodeCaughtUp, $curWalletInfoStore, $curwalletStore], set) => {
    if (!$nodeCaughtUp || !$curWalletInfoStore?.walletname || !$curwalletStore) {
        return;
    }
    if ($curwalletStore !== $curWalletInfoStore?.walletname) {
        //wallet is loading
        return;
    }
    set($curWalletInfoStore.walletname);
});

let isMinerSwitchWallet = false;
needMine.subscribe((walletName) => {
    if (!walletName) {
        return;
    }
    if (isMinerSwitchWallet) {
        errStore.set(new CodeError(ErrorCode.MINER_SWITCH_WALLET_FAILED, "Miner is switching wallet, You can't switch wallet now."));
        return;
    }
    isMinerSwitchWallet = true;
    minerIsSwitchingWalletStore.set(true);
    MinerLooper.switchWallet(walletName).then(looper => {
        if (!isMinerScheduled()) {
            return;
        }
        return looper.startMiner();
    }).catch(e => {
        console.log('switchWallet failed:', e);
    }).finally(() => {
        isMinerSwitchWallet = false;
        minerIsSwitchingWalletStore.set(false);
    });
});



export async function startMiner() {
    await MinerLooper.getInstance()?.startMiner();
}

export async function stopMiner() {
    await MinerLooper.getInstance()?.stopMiner();
}

export function getMinerThreads() {
    const nThreads = localStorage.getItem('miner:threads');
    return (nThreads && parseInt(nThreads)) || 1;
}

export function setMinerThreads(nThreads: number) {
    localStorage.setItem('miner:threads', nThreads.toString());
}

export function isMinerScheduled() {
    const bScheduled = localStorage.getItem('miner:scheduled');
    return bScheduled === true.toString();
}

export function scheduleMiner() {
    localStorage.setItem('miner:scheduled', true.toString());
}


export function unscheduleMiner() {
    localStorage.setItem('miner:scheduled', false.toString());
}

export async function isMinerRunning() {
    return !!await MinerLooper.getInstance()?.isMinerRunning();
}
