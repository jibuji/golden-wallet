import Client from "./bitbi-rpc/index";

export const MinerDefaultWallet = "default";

const gCli = new Client({
    protocol: "http",
    host: "localhost",
    port: 9800,
    user: "golden",
    pass: "wallet",
});

export async function listWallets() {
    const info = await gCli.listWallets()
    console.log("info:", info);
    return info;
}

export async function loadWallet(name: string) {
    return await gCli.loadWallet(name);
}

export async function backupWallet(name: string, path: string) {
    return await gCli.backupWallet(name, path);
}

export async function ensureLoadWallet(name: string) {
    try {
        const succ = await loadWallet(name);
        if (succ) {
            return;
        }
    } catch (e) {
        console.error('load wallet failed', e);
    }
    try {
        //try to create wallet then load it again
        await gCli.createWallet(name);
    } catch (e) {
        console.error('createWallet failed', e);
    }
}

export async function getDefaultMinerAddr() {
    try {
        await ensureLoadWallet(MinerDefaultWallet);
        let addrs = await gCli.getAddressesByLabel(MinerDefaultWallet, 'miner');
        console.log("address:", addrs);
        if (!addrs) {
            const newaddr = await gCli.getNewAddress(MinerDefaultWallet, 'miner');
            console.log("new address:", newaddr);
            addrs = [newaddr];
        }
        return addrs[0];
    } catch (e) {
        console.error('getDefaultMinerAddr', e)
    }
}

export async function getMinerAddresses(n: number) {
    try {
        await ensureLoadWallet(MinerDefaultWallet);
        let addrs = await gCli.getAddressesByLabel(MinerDefaultWallet, 'miner');
        console.log("address:", addrs);
        if (!addrs) {
            addrs = []
        }
        while (addrs.length < n) {
            const newaddr = await gCli.getNewAddress(MinerDefaultWallet, 'miner');
            console.log("new address:", newaddr);
            addrs.push(newaddr);
        }
        return addrs;
    } catch (e) {
        console.error('getMinerAddresses', e)
        return [];
    }
}


export interface IWalletInfo {
    balance: number
    immature_balance: number
    unconfirmed_balance: number
    descriptor: boolean
    walletname: string
    lastBlock: string
    height: number
} 
export async function getMinerWalletInfo(): Promise<IWalletInfo> {
    const info = await gCli.getWalletInfo(MinerDefaultWallet);
    console.log("wallet info:", info);
    if (!info) {
        return info;
    }
    const walletInfo: IWalletInfo = {
        balance: info.balance,
        immature_balance: info.immature_balance,
        unconfirmed_balance: info.unconfirmed_balance,
        descriptor: info.descriptors,
        walletname: info.walletname,
        lastBlock: info.lastprocessedblock.hash,
        height: info.lastprocessedblock.height
    }
    return walletInfo;
}

export async function getBlockchainInfo() {
    const info = await gCli.getBlockchainInfo();
    console.log("blockchain info:", info);
    return info;
}