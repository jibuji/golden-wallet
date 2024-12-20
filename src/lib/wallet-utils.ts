import {gRpcClient} from "./bitbi-rpc/index";
import type { AddrType, DescriptorType, IAddressInfo, IBlockchainInfo, ITransaction, IWalletInfo, TransactionCategory } from "./types/index";
import { generateRandomBytes, uint8ArrayToHex } from "./utils";
import * as secp256k1 from '@noble/secp256k1';
import { bech32 } from 'bech32'; // Add this line
import bs58check from 'bs58check';
import { ripemd160 as hashRipemd160 } from 'hash.js';
import ecc from '@bitcoinerlab/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils';
import Web3 from 'web3';

const web3 = new Web3();

// import { BIP32Factory } from 'bip32';
import { DEFAULT_WALLET_NAME } from "./config";

// // Simple ECPair implementation
// interface ECPair {
//     privateKey: Uint8Array;
//     publicKey: Uint8Array;
// }

// function createECPair(privateKey: Uint8Array): ECPair {
//     const publicKey = secp256k1.getPublicKey(privateKey, true);
//     return { privateKey, publicKey };
// }


export const MinerDefaultWallet = DEFAULT_WALLET_NAME;
export const MinerReceiveAddrLabel = "miner";
const gCli = gRpcClient;

export async function listWallets() {
    const info = await gCli.listWallets()
    console.log("listWallets info:", info);
    return info;
}

export async function loadWallet(name: string) {
    return await gCli.loadWallet(name);
}

export async function backupWallet(name: string, path: string) {
    return await gCli.backupWallet(name, path);
}

export async function restoreWallet(name: string, path: string, load_on_startup = true) {
    return await gCli.restoreWallet(name, path, load_on_startup);
}

export async function listWalletDir() {
    return await gCli.listWalletDir();
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
        await gCli.createWallet(name, true, true);
        await loadWallet(name);
    } catch (e) {
        console.error('createWallet failed', e);
    }
}

async function isAddressGoodForMiner(wallet: string, address: string): Promise<boolean> {

    // skip non bech32 address
    if (!address.startsWith("bc1")) {
        return false;
    }
    try {
        const addrInfo = await gCli.getAddressInfo(wallet, address);
        // not support bech32m address to miner
        if (!addrInfo.ismine || addrInfo.ischange || addrInfo.witness_version === 1) {
            return false;
        }
        // Check if the address has received any coins
        const received = await gCli.getReceivedByAddress(wallet, address, 0); // minconf=0 to include unconfirmed
        console.log("received ", received, " of address:", address);
        return received === 0;
    } catch (e) {
        console.error('isAddressGoodForMiner error:', e);
        return false;
    }
}

export async function getNewMinerAddress(wallet: string): Promise<string | null> {
    try {
        // First try to find an unused address from existing miner addresses
        const existingAddrs = await gCli.getAddressesByLabel(wallet, MinerReceiveAddrLabel);
        if (existingAddrs && existingAddrs.length > 0) {
            // Sort addresses randomly to distribute usage
            const shuffledAddrs = existingAddrs.sort(() => Math.random() - 0.5);
            for (const addr of shuffledAddrs) {
                if (await isAddressGoodForMiner(wallet, addr)) {
                    console.log('Found unused existing miner address:', addr);
                    return addr;
                }
            }
        }

        // If no unused existing address found, generate a new one
        const newAddr = await gCli.getNewAddress(wallet, MinerReceiveAddrLabel, 'bech32');
        console.log('Generated new miner address:', newAddr);
        return newAddr;
    } catch (e) {
        console.error('getNewMinerAddress error:', e);
        return null;
    }
}

// Keep the getMinerAddresses as is for backward compatibility
export async function getMinerAddresses(wallet: string, n: number) {
    console.warn('getMinerAddresses is deprecated. Use getNewMinerAddress instead.');
    try {
        const addr = await getNewMinerAddress(wallet);
        return addr ? [addr] : [];
    } catch (e) {
        console.error(`wallet[${wallet}]getMinerAddresses`, e)
        return [];
    }
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

export async function getBlockchainInfo():Promise<IBlockchainInfo> {
    const info = await gCli.getBlockchainInfo();
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
    return Array.from(new Set(sents.map(tx => tx.txid)))
                .map(txid => sents.find(tx => tx.txid === txid) as ITransaction);
}


// Helper functions

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}


// async function generatePrivateDescriptor2(derivationPath: string) {
//     // Generate a random 32-byte seed
//     const seed = generateRandomBytes(32);
//     // Create a master key from the seed
//     const root = BIP32.fromSeed(seed);
//     // Get the xprv
//     const xprv = root.toBase58();
    
//     // Create the private descriptor
//     const privateDescriptor = `wpkh(${xprv}/${derivationPath})`;
//     console.log("privateDescriptor:", privateDescriptor);
    
//     return privateDescriptor;
// }


// function hasSpecificDerivationPath(descriptor: string, targetPath: string) {
//     // Regular expression to match the derivation path within wpkh()
//     const descriptorRegex = /wpkh\((xprv|xpub)[\w]+\/(.+?)\)/;
//     const pathRegex = /(\d+)(['hH]?)/g;
  
//     // Extract the derivation path from the descriptor
//     const match = descriptor.match(descriptorRegex);
//     if (!match) return false;
  
//     const descriptorPath = match[2];
  
//     // Parse the descriptor path
//     const descriptorSteps = [];
//     let step;
//     while ((step = pathRegex.exec(descriptorPath)) !== null) {
//       descriptorSteps.push(`${step[1]}${step[2].toLowerCase()}`);
//     }
  
//     // Parse the target path
//     const targetSteps = targetPath.split('/').filter(s => s !== '');
  
//     // Compare the paths
//     if (descriptorSteps.length !== targetSteps.length) return false;
  
//     for (let i = 0; i < descriptorSteps.length; i++) {
//       if (descriptorSteps[i] !== targetSteps[i]) return false;
//     }
  
//     return true;
//   }
  
// function findDescriptorByDerivationPath(descriptors: DescriptorType[], derivationPath: string) {
//     // sort descriptors by timestamp time, the first one is the oldest
//     const sortedDescriptors = descriptors.sort((a, b) => a.timestamp - b.timestamp);
//     console.log("sortedDescriptors:", sortedDescriptors);
//     return sortedDescriptors.find(d => {
//         const desc = d.desc;
//         // how to check if desc is a derivation path of derivationPath
//         return hasSpecificDerivationPath(desc, derivationPath);
//     });
// }

// async function generateEthPrivateKeyFromXprvKey(key: string) {
//     let privateKey: Uint8Array;

//     if (key.startsWith('xprv')) {
//         // Handle xprv key
//         const node = BIP32.fromBase58(key);
//         privateKey = node.privateKey!;
//     } else if (key.startsWith('xpub')) {
//         // Handle xpub key (note: this won't give us a private key)
//         throw new Error("Cannot generate wallet ID from xpub key");
//     } else {
//         // Assume it's a WIF private key
//         privateKey = bs58check.decode(key).slice(1, 33);
//     }

//     // Hash the private key to get a 32-byte value
//     return await sha256(privateKey);
// }

// async function getEthAddressFromPrivateKey(privateKey: Uint8Array) {
//     const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1); // We want the uncompressed public key without the prefix
//     const address = keccak256(publicKey).slice(-20);
//     return '0x' + bytesToHex(address);
// }

// function toEthChecksumAddress(address: string): string {
//     return web3.utils.toChecksumAddress(address);
// }

// async function generateEthAddressFromXprvKey(key: string) {
//     const prvKeyBytes = await generateEthPrivateKeyFromXprvKey(key);
//     const ethAddress = await getEthAddressFromPrivateKey(prvKeyBytes);
//     // encode ethAddress to base58
//     const base58Address = bs58check.encode(hexToBytes(ethAddress));
//     // convert ethAddress to checksum address
//     const checksumAddress = toEthChecksumAddress(ethAddress);
//     const privateKey = "0x" + bytesToHex(prvKeyBytes);
//     console.log("checksumAddress:", checksumAddress, "ethAddress:", ethAddress, "privateKey:", privateKey);
//     // Return the address with the '0x' prefix
//     return {privateKey, ethAddress: checksumAddress, walletId: "w" + base58Address};
// }


// const WalletIdMagicalDerivationPath = "5h/20h/8h/5h/18h/5h/21h/12h/44h/60h/0h/0";

// async function generateWalletIdInfo(wallet: string) {
//     const descriptors = await gCli.listDescriptors(wallet, true);
//     let desc = findDescriptorByDerivationPath(descriptors, WalletIdMagicalDerivationPath);
//     console.log("found? desc:", desc);
//     if (!desc) {
//         const privateDescriptor = await generatePrivateDescriptor2(WalletIdMagicalDerivationPath);
//         const  descInfo = await gCli.getDescriptorInfo(wallet, privateDescriptor);
//         const checksum = descInfo.checksum;
//         const descriptor = `${privateDescriptor}#${checksum}`;
//         try {
//             desc = {
//                 desc: descriptor,
//                 timestamp: Math.floor(Date.now()/1000),
//                 active: false,
//                 internal: false,
//             }
//             console.log("descriptor to import:", desc)
//             const result = await gCli.importDescriptors(wallet, [desc]);
//             console.log("importDescriptors result:", result);
//         } catch (e) {
//             console.error("importDescriptors failed", e);
//             throw e;
//         }
//     }   
//     // get the key of the descriptor
//     const key = desc.desc.split("(")[1].split("/")[0];
//     return await generateEthAddressFromXprvKey(key);
// }


// export async function getWalletEthPrvKey(walletname: string) {
//     const descInfo = await generateWalletIdInfo(walletname)
//     return descInfo.privateKey;
// }
