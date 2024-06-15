import { listen as gListen } from '@tauri-apps/api/event';
import type { IBlockchainInfo, IWalletInfo } from '$lib/types';
import { ensureBitbidIsRunning, sleep } from '$lib/utils';
import { ensureLoadWallet, getBlockchainInfo, getWalletInfo } from '$lib/wallet-utils';
import { derived, writable } from 'svelte/store';

// wallet sections


export const loadedWalletsStore = writable([]); // list of wallet names
// the curWalletStore must be one of the loadedWallets
export const curWalletStore = writable("default");

let curWalletInfSetFn = (value: IWalletInfo) => {};
let walletName = "";
export const curWalletInfo = derived(curWalletStore, ($curWallet, set) => {
    curWalletInfSetFn = set;
    walletName = $curWallet;
    
    ensureLoadWallet($curWallet).then(() => {
        return getWalletInfo($curWallet);
    }).then(set);
    const interval = setInterval(() => {
        ensureLoadWallet($curWallet).then(() => {
            return getWalletInfo($curWallet);
        }).then(set);
    }, 10 * 1000);
    return () => clearInterval(interval);
}, {} as IWalletInfo)


// node sections

// current blockchain info
export const curBcInfo = writable({initialblockdownload: true} as IBlockchainInfo);

let gNodeLoopCancelled = false;
async function nodeLoop() {
    for (; !gNodeLoopCancelled; await sleep(10 * 1000)) {
        try {
            await ensureBitbidIsRunning();
            await sleep(2000);
            const bcInfo = await getBlockchainInfo();
            curBcInfo.set(bcInfo);
            // if we have caught up with the blockchain, we update the wallet info
            if (walletName && !bcInfo.initialblockdownload && bcInfo.headers === bcInfo.blocks) {
                await getWalletInfo(walletName).then(curWalletInfSetFn);
            }
        } catch (e) {
            console.error("nodeLoop", e);
        }
    }
}

nodeLoop();

gListen('tauri://close-requested', () => {
  // The user is trying to close the window
    gNodeLoopCancelled = true;
});