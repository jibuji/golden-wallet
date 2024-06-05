import type { IWalletInfo } from '$lib/types';
import { getWalletInfo } from '$lib/wallet-utils';
import { derived, writable } from 'svelte/store';

export const loadedWalletsStore = writable([]); // list of wallet names
// the curWalletStore must be one of the loadedWallets
export const curWalletStore = writable("default");

export const curWalletInfo = derived(curWalletStore,  ($curWallet, set) => {
    getWalletInfo($curWallet).then(set);
    const interval = setInterval(() => {
        getWalletInfo($curWallet).then(set);
    }, 10*1000);
    return () => clearInterval(interval);
}, {} as IWalletInfo)