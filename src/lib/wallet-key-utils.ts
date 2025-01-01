import { wordlist } from '@scure/bip39/wordlists/english';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { hmac } from '@noble/hashes/hmac';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { createBase58check } from '@scure/base';
import { bech32 } from 'bech32';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { keccak_256 } from '@noble/hashes/sha3';

export interface WalletKeys {
    masterPrivateKey: Uint8Array;
    masterPublicKey: Uint8Array;
    mnemonic: string;
    walletId: string;
    ethAddress: string;
    ethPrivateKey: string;
}

// Special derivation path for wallet ID (using BIP84 - Native SegWit)
export const WALLET_ID_PATH = "m/84'/0'/0'/0/0";

function generateRandomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
}

function entropyToMnemonic(entropy: Uint8Array): string {
    // Get entropy in binary string
    let binaryString = Array.from(entropy)
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join('');
    
    // Calculate checksum length (entropy length in bits / 32)
    const checksumLength = entropy.length * 8 / 32;
    
    // Calculate checksum
    const hash = sha256(entropy);
    const checksumBits = Array.from(hash)[0]
        .toString(2)
        .padStart(8, '0')
        .slice(0, checksumLength);
    
    // Add checksum to binary string
    binaryString += checksumBits;
    
    // Split into groups of 11 bits
    const words: string[] = [];
    for (let i = 0; i < binaryString.length; i += 11) {
        const wordIndex = parseInt(binaryString.slice(i, i + 11), 2);
        words.push(wordlist[wordIndex]);
    }
    
    return words.join(' ');
}

export function validateMnemonic(mnemonic: string): boolean {
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    
    // Check word count (must be multiple of 3)
    if (words.length % 3 !== 0 || words.length < 12 || words.length > 24) {
        return false;
    }
    
    // Verify all words are in wordlist
    if (!words.every(word => wordlist.includes(word))) {
        return false;
    }
    
    // Convert words to indices
    const indices = words.map(word => wordlist.indexOf(word));
    
    // Convert to binary string
    let binaryString = indices
        .map(index => index.toString(2).padStart(11, '0'))
        .join('');
    
    // Calculate entropy length and checksum length
    const checksumLength = words.length / 3;
    const entropyLength = binaryString.length - checksumLength;
    
    // Split entropy and checksum
    const entropyBits = binaryString.slice(0, entropyLength);
    const checksumBits = binaryString.slice(entropyLength);
    
    // Convert entropy bits to bytes
    const entropyBytes = new Uint8Array(entropyLength / 8);
    for (let i = 0; i < entropyLength; i += 8) {
        entropyBytes[i / 8] = parseInt(entropyBits.slice(i, i + 8), 2);
    }
    
    // Calculate checksum
    const hash = sha256(entropyBytes);
    const calculatedChecksumBits = Array.from(hash)[0]
        .toString(2)
        .padStart(8, '0')
        .slice(0, checksumLength);
    
    return checksumBits === calculatedChecksumBits;
}

export function generateNewWallet(): WalletKeys {
    console.log('generateNewWallet');
    try {
        // Generate 32 bytes (256 bits) of entropy using Web Crypto API
        const entropy = generateRandomBytes(32);
        console.log('entropy', entropy);
        const mnemonic = entropyToMnemonic(entropy);
        console.log('mnemonic', mnemonic);
        return deriveWalletKeys(mnemonic);
    } catch (e) {
        console.error('Error generating new wallet', e);
        throw e;
    }
}

export function deriveWalletKeys(mnemonic: string): WalletKeys {
    if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic');
    }

    // Convert mnemonic to seed
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    const indices = words.map(word => wordlist.indexOf(word));
    const entropyBits = indices
        .map(index => index.toString(2).padStart(11, '0'))
        .join('')
        .slice(0, 256);
    
    const entropyBytes = new Uint8Array(32);
    for (let i = 0; i < 256; i += 8) {
        entropyBytes[i / 8] = parseInt(entropyBits.slice(i, i + 8), 2);
    }
    
    // Generate seed using PBKDF2
    const salt = new TextEncoder().encode('mnemonic');
    const seed = pbkdf2(sha256, entropyBytes, salt, {
        c: 2048,
        dkLen: 64
    });

    // Derive master key using HMAC-SHA512
    const hmacKey = new TextEncoder().encode('Bitcoin seed');
    const I = hmac(sha256, seed, hmacKey);
    const IL = I.slice(0, 32); // Master private key
    const IR = I.slice(32); // Chain code
    
    // Generate master public key
    const masterPublicKey = secp256k1.getPublicKey(IL, true);
    
    // Derive ETH key (m/44'/60'/0'/0/0)
    const ethPrivateKey = derivePrivateKey(IL, "m/44'/60'/0'/0/0");
    const ethPublicKey = secp256k1.getPublicKey(ethPrivateKey, false);
    
    // Generate ETH address from public key
    const ethAddress = generateEthAddress(ethPublicKey);
    
    // Generate wallet ID from master public key
    const walletId = generateWalletId(masterPublicKey);
    console.log("walletId: ", walletId);
    return {
        masterPrivateKey: IL,
        masterPublicKey,
        mnemonic,
        walletId,
        ethAddress,
        ethPrivateKey: `0x${bytesToHex(ethPrivateKey)}`
    };
}

export function derivePrivateKey(masterKey: Uint8Array, path: string): Uint8Array {
    const segments = path.split('/').slice(1); // Remove 'm'
    let key = masterKey;

    for (const segment of segments) {
        const hardened = segment.endsWith("'");
        const index = parseInt(hardened ? segment.slice(0, -1) : segment);
        
        // Derive key for this level
        const data = new Uint8Array(37);
        if (hardened) {
            data[0] = 0;
            data.set(key, 1);
            data.set(new Uint8Array(new Uint32Array([index + 0x80000000]).buffer), 33);
        } else {
            const pubKey = secp256k1.getPublicKey(key, true);
            data.set(pubKey, 0);
            data.set(new Uint8Array(new Uint32Array([index]).buffer), 33);
        }
        
        const I = hmac(sha256, data, key);
        key = I.slice(0, 32);
    }

    return key;
}

function toChecksumAddress(address: string): string {
    address = address.toLowerCase().replace('0x', '');
    const hash = bytesToHex(keccak_256(address));
    let ret = '0x';
    
    for (let i = 0; i < address.length; i++) {
        if (parseInt(hash[i], 16) >= 8) {
            ret += address[i].toUpperCase();
        } else {
            ret += address[i];
        }
    }
    
    return ret;
}

function generateEthAddress(publicKey: Uint8Array): string {
    // Remove first byte (0x04 which indicates uncompressed public key)
    const pubKeyHash = keccak_256(publicKey.slice(1));
    // Take last 20 bytes and convert to checksum address
    const address = '0x' + bytesToHex(pubKeyHash.slice(-20));
    return toChecksumAddress(address);
}

function generateWalletId(masterPrivateKey: Uint8Array): string {
    // Derive the special key for wallet ID
    const walletIdKey = derivePrivateKey(masterPrivateKey, WALLET_ID_PATH);
    const publicKey = secp256k1.getPublicKey(walletIdKey, true);
    
    // Generate Native SegWit address (P2WPKH)
    const sha = sha256(publicKey);
    const pubKeyHash = ripemd160(sha);
    
    // Encode as bech32 address
    const words = bech32.toWords(pubKeyHash);
    const address = bech32.encode('bc', words);
    return bech32ToBase62(address);
}

// Convert bech32 address to base62 string (0-9A-Za-z)
export function bech32ToBase62(bech32Address: string): string {
    const decoded = bech32.decode(bech32Address);
    const data = bech32.fromWords(decoded.words);
    
    // Convert to base62 characters
    const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    let num = BigInt('0x' + bytesToHex(new Uint8Array(data)));
    
    while (num > 0n) {
        const remainder = Number(num % 62n);
        result = BASE62_CHARS[remainder] + result;
        num = num / 62n;
    }
    
    // Add prefix to indicate it's a converted bech32 address
    return 'B' + result;
}

// Convert base62 string back to bech32 address
export function base62ToBech32(base62String: string): string {
    if (!base62String.startsWith('B')) {
        throw new Error('Invalid base62 string format');
    }
    
    const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const input = base62String.slice(1); // Remove the 'B' prefix
    
    // Convert from base62 to number
    let num = 0n;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const value = BigInt(BASE62_CHARS.indexOf(char));
        num = num * 62n + value;
    }
    
    // Convert to bytes
    const hexString = num.toString(16).padStart(40, '0');
    const data = hexToBytes(hexString);
    
    // Convert back to bech32
    const words = bech32.toWords(data);
    return bech32.encode('bc', words);
}

export function deriveExtendedKey(masterKey: Uint8Array, path: string): string {
    const segments = path.split('/').slice(1); // Remove 'm'
    let key = masterKey;
    let chainCode = new Uint8Array(32); // Initial chain code
    
    // Derive key and chain code for each path segment
    for (const segment of segments) {
        const hardened = segment.endsWith("'");
        const index = parseInt(hardened ? segment.slice(0, -1) : segment);
        
        const data = new Uint8Array(37);
        if (hardened) {
            data[0] = 0;
            data.set(key, 1);
            data.set(new Uint8Array(new Uint32Array([index + 0x80000000]).buffer), 33);
        } else {
            const pubKey = secp256k1.getPublicKey(key, true);
            data.set(pubKey, 0);
            data.set(new Uint8Array(new Uint32Array([index]).buffer), 33);
        }
        
        const I = hmac(sha256, data, chainCode);
        key = I.slice(0, 32);
        chainCode = I.slice(32);
    }

    // Construct extended private key
    const version = new Uint8Array([0x04, 0x88, 0xAD, 0xE4]); // Version bytes for mainnet xprv
    const depth = segments.length;
    const parentFingerprint = new Uint8Array(4);
    const childNumber = new Uint8Array(4);
    
    const extendedKeyData = new Uint8Array(78);
    extendedKeyData.set(version, 0);
    extendedKeyData[4] = depth;
    extendedKeyData.set(parentFingerprint, 5);
    extendedKeyData.set(childNumber, 9);
    extendedKeyData.set(chainCode, 13);
    extendedKeyData[45] = 0; // Private key prefix
    extendedKeyData.set(key, 46);

    return createBase58check(sha256).encode(extendedKeyData);
}
