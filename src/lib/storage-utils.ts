import { AES, enc, HmacSHA256 } from 'crypto-js';
import type { BitcoinDescriptor, BitcoinWalletData } from './bitcoin-utils';
import { deriveDescriptors } from './bitcoin-utils';
import type { WalletKeys } from './wallet-key-utils';
import { deriveWalletKeys } from './wallet-key-utils';

const WALLET_DATA_KEY = 'wallet_data';
const WALLET_INIT_KEY = 'wallet_initialized';
const WALLET_LOCK_KEY = 'wallet_locked';
const BITCOIN_DATA_KEY = 'bitcoin_data';
const LAST_ACTIVITY_KEY = 'last_activity';

export interface EncryptedWalletData {
    walletId: string;
    ethAddress: string;
    encryptedData: string;
}

export interface EncryptedBitcoinData {
    masterFingerprint: string;
    encryptedDescriptors: string;
}

interface EncryptedData {
    ciphertext: string;
    hmac: string;
}

function encryptWithHMAC(data: string, key: string): EncryptedData {
    const ciphertext = AES.encrypt(data, key).toString();
    const hmac = HmacSHA256(ciphertext, key).toString();
    return { ciphertext, hmac };
}

function decryptWithHMAC(encryptedData: EncryptedData, key: string): string {
    // Verify HMAC first
    const computedHmac = HmacSHA256(encryptedData.ciphertext, key).toString();
    if (computedHmac !== encryptedData.hmac) {
        throw new Error('Data integrity check failed');
    }
    
    // If HMAC is valid, decrypt the data
    const decryptedBytes = AES.decrypt(encryptedData.ciphertext, key);
    return decryptedBytes.toString(enc.Utf8);
}

export function isWalletInitialized(): boolean {
    return localStorage.getItem(WALLET_INIT_KEY) === 'true';
}

export function isWalletLocked(): boolean {
    // Always return true if there's no last activity (first time or cleared)
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;

    // Check if the page was reloaded or reopened
    const pageLoadTime = window.performance.timing.navigationStart;
    const lastActivityTime = parseInt(lastActivity);

    // If the page load time is after the last activity, it means the page was reloaded/reopened
    if (pageLoadTime > lastActivityTime) {
        return true;
    }

    // Otherwise, check the normal lock state
    return localStorage.getItem(WALLET_LOCK_KEY) === 'true';
}

export function updateLastActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export async function storeWalletData(walletKeys: WalletKeys, encryptionKey: string): Promise<void> {
    // Encrypt wallet data
    const walletDataStr = JSON.stringify({
        mnemonic: walletKeys.mnemonic,
        ethPrivateKey: walletKeys.ethPrivateKey
    });
    const encryptedWalletData = encryptWithHMAC(walletDataStr, encryptionKey);

    const walletData: EncryptedWalletData = {
        walletId: walletKeys.walletId,
        ethAddress: walletKeys.ethAddress,
        encryptedData: JSON.stringify(encryptedWalletData)
    };

    // Encrypt Bitcoin data
    const bitcoinData = deriveDescriptors(walletKeys.masterPrivateKey, walletKeys.masterPublicKey);
    const encryptedBitcoinData = encryptWithHMAC(
        JSON.stringify(bitcoinData),
        encryptionKey
    );

    const bitcoinStorageData: EncryptedBitcoinData = {
        masterFingerprint: walletKeys.walletId,
        encryptedDescriptors: JSON.stringify(encryptedBitcoinData)
    };

    // Store data
    localStorage.setItem(WALLET_DATA_KEY, JSON.stringify(walletData));
    localStorage.setItem(BITCOIN_DATA_KEY, JSON.stringify(bitcoinStorageData));
    localStorage.setItem(WALLET_INIT_KEY, 'true');
    localStorage.setItem(WALLET_LOCK_KEY, 'false');
    updateLastActivity();
}

export async function retrieveWalletData(encryptionKey: string): Promise<{
    walletKeys: WalletKeys;
    bitcoinData: BitcoinWalletData;
} | null> {
    const storedWalletData = localStorage.getItem(WALLET_DATA_KEY);
    const storedBitcoinData = localStorage.getItem(BITCOIN_DATA_KEY);
    
    if (!storedWalletData || !storedBitcoinData) return null;

    try {
        // Decrypt wallet data
        const walletData: EncryptedWalletData = JSON.parse(storedWalletData);
        const encryptedWalletData: EncryptedData = JSON.parse(walletData.encryptedData);
        const decryptedWalletData = decryptWithHMAC(encryptedWalletData, encryptionKey);
        const parsedWalletData = JSON.parse(decryptedWalletData);
        const walletKeys = deriveWalletKeys(parsedWalletData.mnemonic);

        // Decrypt Bitcoin data
        const bitcoinData: EncryptedBitcoinData = JSON.parse(storedBitcoinData);
        const encryptedDescriptors: EncryptedData = JSON.parse(bitcoinData.encryptedDescriptors);
        const decryptedDescriptors = decryptWithHMAC(encryptedDescriptors, encryptionKey);
        const bitcoinDescriptors: BitcoinDescriptor[] = JSON.parse(decryptedDescriptors);
        const bitcoinWalletData: BitcoinWalletData = {
            descriptors: bitcoinDescriptors,
            masterFingerprint: bitcoinData.masterFingerprint
        };
        // console.log('walletKeys', walletKeys);
        // console.log('bitcoinWalletData', bitcoinWalletData);
        return { walletKeys, bitcoinData: bitcoinWalletData };
    } catch (error) {
        console.error('Failed to decrypt wallet data:', error);
        return null;
    }
}

export function clearWalletData(): void {
    localStorage.removeItem(WALLET_DATA_KEY);
    localStorage.removeItem(BITCOIN_DATA_KEY);
    localStorage.setItem(WALLET_INIT_KEY, 'false');
    localStorage.setItem(WALLET_LOCK_KEY, 'true');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
}