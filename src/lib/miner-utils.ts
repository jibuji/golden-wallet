import { derived, type Readable } from "svelte/store";
import { CodeError, ErrorCode } from "./error";
import { curWalletStore, errStore, nodeCaughtUpStore } from "./store";
import { ensureMinerdIsRunning, isSidecarRunning, sleep, stopSidecar } from "./utils";
import { getMinerAddresses } from "./wallet-utils";

const needMine: Readable<string> = derived([nodeCaughtUpStore, curWalletStore], ([$nodeCaughtUp, $curWallet], set) => {
    if (!$nodeCaughtUp || !$curWallet) {
        return;
    }
    set($curWallet);
});

needMine.subscribe((walletName) => {
    if (!isMinerScheduled()) {
        return;
    }
    stopMiner().finally(() => {
        switchMinerAddrLoop(walletName);
    });
});

let gCancel = false;
let isSwitching = false;
export async function switchMinerAddrLoop(walletName: string) {
    for (; !gCancel;) {
        isSwitching = true;
        try {
            await stopSidecar('minerd');
            const N = 20;
            const addresses = await getMinerAddresses(walletName, N);
            if (!addresses.length) {
                throw new CodeError(
                    ErrorCode.GET_MINER_ADDRESSES_FAILED,
                    'Failed to get miner addresses'
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
            isSwitching = false;
        }
        await sleep(60 * 60 * 1000); //60 minutes
    }
    isSwitching = false;
}

export async function startMiner(walletName: string) {
    gCancel = false;
    isSwitching = true;
    switchMinerAddrLoop(walletName);
    while (isSwitching) {
        await sleep(500);
    }
}

export async function stopMiner() {
    gCancel = true;
    isSwitching = true;
    try {
      await stopSidecar('minerd');
      while (isSwitching) {
          await sleep(500);
      }
    }finally {
      isSwitching = false;
    }
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
    try {
        while (isSwitching) {
            await sleep(500);
        }
        return await isSidecarRunning('minerd');
    } catch (e) {
        console.error("isMinerRunning:", e);
        return false;
    }
}
