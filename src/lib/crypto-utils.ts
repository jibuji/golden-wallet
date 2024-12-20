import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

const CLIENT_KEY_SALT = 'golden-wallet-client-key';
const PBKDF2_ITERATIONS = 10000;
const MEMORY_COST = 100 * 1024 * 1024; // 100MB in bytes

export async function generateClientHmac(password: string): Promise<string> {
    // Generate initial HMAC using password and salt
    const message = utf8ToBytes(`${password}${CLIENT_KEY_SALT}`);
    const hmac = sha512(message);
    return bytesToHex(hmac);
}

export async function deriveClientEncryptionKey(password: string, serverBlindedKey: string): Promise<string> {
    // Convert hex string to bytes
    const blindedKeyBytes = hexToBytes(serverBlindedKey);
    
    // Combine password with blinded key
    const saltBytes = new Uint8Array([...utf8ToBytes(password), ...blindedKeyBytes]);
    
    // Use PBKDF2 with high memory cost
    const keyBytes = pbkdf2(sha256, utf8ToBytes(password), saltBytes, {
        c: PBKDF2_ITERATIONS,
        dkLen: 32, // 32 bytes = 256 bits
    });

    // Simulate memory cost by allocating and using a large array
    const memoryBuffer = new Uint8Array(MEMORY_COST);
    for (let i = 0; i < MEMORY_COST; i += 32) {
        memoryBuffer.set(keyBytes, i % (MEMORY_COST - 32));
    }
    
    // XOR the entire memory buffer into the final key
    const finalKey = new Uint8Array(32);
    for (let i = 0; i < MEMORY_COST; i += 32) {
        for (let j = 0; j < 32; j++) {
            finalKey[j] ^= memoryBuffer[i + j];
        }
    }

    return bytesToHex(finalKey);
}