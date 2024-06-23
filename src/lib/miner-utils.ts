import { derived, type Readable } from "svelte/store";
import { CodeError, ErrorCode } from "./error";
import { curWalletInfoStore, errStore, nodeCaughtUpStore } from "./store";
import { ensureMinerdIsRunning, isSidecarRunning, sleep, stopSidecar } from "./utils";
import { getMinerAddresses } from "./wallet-utils";


class MinerLooper {
    private static instance: MinerLooper;
    private walletName: string;
    private constructor(walletName: string = '') {
        this.walletName = walletName;
    }
    public static getInstance() {
        if (!MinerLooper.instance) {
            MinerLooper.instance = new MinerLooper();
        }
        return MinerLooper.instance;
    }

    public static async switchWallet(walletName: string) {
        if (MinerLooper.instance && MinerLooper.instance.walletName === walletName) {
            return MinerLooper.instance;
        }
        let isSwitchingLoopRunning = false;
        if (MinerLooper.instance) {
            isSwitchingLoopRunning = MinerLooper.instance.isSwitchingLoopRunning;
            await MinerLooper.instance.stopMiner();
        }
        //create a new instance
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
        for (; !this.exitLoop; count++, await sleep(6 * 1000)) {
            let assumeMinerIsRunning = true;
            //check if minerd is running every 10*6 seconds
            if (count % 10 === 0) {
                assumeMinerIsRunning = await isSidecarRunning('minerd');
            }
            // switch miner address every 60 minutes
            if (count % 600 !== 0 && assumeMinerIsRunning) {
                continue;
            }
            this.isSwitching = true;
            try {
                await stopSidecar('minerd').catch(e => {
                    console.error('needMine stopSidecar minerd failed:', e);
                });
                const N = 20;
                const addresses = await getMinerAddresses(this.walletName, N);
                if (!addresses.length) {
                    throw new CodeError(
                        ErrorCode.GET_MINER_ADDRESSES_FAILED,
                        `Failed to get miner addresses from wallet ${this.walletName}`
                    );
                }
                //randomly get an addr from addresses
                const curAddrPos = Math.floor(Math.random() * addresses.length);
                const threads = getMinerThreads();
                await ensureMinerdIsRunning(threads, addresses[curAddrPos]);
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
        if (!this.isSwitchingLoopRunning) {
            return;
        }
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

const needMine: Readable<string> = derived([nodeCaughtUpStore, curWalletInfoStore], ([$nodeCaughtUp, $curWalletInfoStore], set) => {
    if (!$nodeCaughtUp || !$curWalletInfoStore?.walletname) {
        return;
    }
    set($curWalletInfoStore.walletname);
});

needMine.subscribe((walletName) => {
    if (!isMinerScheduled() || !walletName) {
        return;
    }
    MinerLooper.switchWallet(walletName).then(looper => {
        looper.startMiner();
    }).catch(e => {
    });
});



export async function startMiner() {
    await MinerLooper.getInstance().startMiner();
}

export async function stopMiner() {
    await MinerLooper.getInstance().stopMiner();
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
    return await MinerLooper.getInstance().isMinerRunning();
}
