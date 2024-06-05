import Client from "./bitbi-rpc/index";
import type { AddrType, IAddressInfo, ITransaction, IWalletInfo, TransactionCategory } from "./types";

export const MinerDefaultWallet = "default";
export const MinerReceiveAddrLabel = "miner";
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
        let addrs = await gCli.getAddressesByLabel(MinerDefaultWallet, MinerReceiveAddrLabel);
        console.log("address:", addrs);
        if (!addrs) {
            const newaddr = await gCli.getNewAddress(MinerDefaultWallet, MinerReceiveAddrLabel);
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
        let addrs = await gCli.getAddressesByLabel(MinerDefaultWallet, MinerReceiveAddrLabel);
        console.log("address:", addrs);
        if (!addrs) {
            addrs = []
        }
        while (addrs.length < n) {
            const newaddr = await gCli.getNewAddress(MinerDefaultWallet, MinerReceiveAddrLabel);
            console.log("new address:", newaddr);
            addrs.push(newaddr);
        }
        return addrs;
    } catch (e) {
        console.error('getMinerAddresses', e)
        return [];
    }
}



export async function getMinerWalletInfo(): Promise<IWalletInfo> {
    return await getWalletInfo(MinerDefaultWallet);
}

export async function getAddressesByLabel(wallet: string, label: string) {
    return await gCli.getAddressesByLabel(wallet, label);
}

export async function getWalletInfo(name: string): Promise<IWalletInfo> {
    const info = await gCli.getWalletInfo(name);
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

export async function listLabels(wallet: string): Promise<string[]> {
    return await gCli.listLabels(wallet);
}

export async function getAddressInfo(wallet: string, addr: string) {
    const addrInfo = await gCli.getAddressInfo(wallet, addr);
    console.log("address info:", addrInfo);
    addrInfo.type = determineAddrTypeFromAddressInfo(addrInfo);
    return addrInfo;
}

export async function getNewAddress(wallet: string, label: string, addrType: AddrType) {
    return await gCli.getNewAddress(wallet, label, addrType);
}

function determineAddrTypeFromAddressInfo(addrInfo: IAddressInfo): AddrType {
    if (addrInfo.iswitness) {
        if (addrInfo.witness_version >= 1) {
            return 'bech32m';
        } else {
            return 'bech32';
        }
    } else if (addrInfo.isscript) {
        return 'p2sh-segwit';
    } else {
        return 'legacy';
    }
}

export async function sendToAddress(wallet: string, addr: string, amount: number, comment: string, feeRate: number) {
    return await gCli.sendToAddress(wallet, addr, amount, comment, feeRate);
}

export async function listTransactions(wallet: string, label: string, count: number, skip: number): Promise<ITransaction[]> {
    return await gCli.listTransactions(wallet, label, count, skip, true);
}

export async function listRecentTransactions(wallet: string, count: number, category: TransactionCategory = '*'): Promise<ITransaction[]> {
    let sents: ITransaction[] = [];
    let skip = 0;
    const FarMostAgo = 30 * 24 * 3600;//30 days
    const batchSize = 1000;
    for (; sents.length < count;) {
        let tx = await listTransactions(wallet, "*", batchSize, skip);
        if (tx.length > 0) {
            tx = tx.sort((a, b) => b.time - a.time);
            const fsent = tx.filter(t => t.category === category || category === '*');
            sents = sents.concat(fsent);
            skip += batchSize;
            //check if the last tx is too old
            if (tx.length > 0 && Date.now() - tx[tx.length - 1].time * 1000 > FarMostAgo * 1000) {
                console.log("listTransactions last tx is too old, break");
                break;
            }
        } else {
            console.log("listTransactions no more tx, break");
            break;
        }
    }
    return sents;
}