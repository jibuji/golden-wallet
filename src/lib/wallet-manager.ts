import { gRpcClient, type RPCError } from './bitbi-rpc';
import type { BitcoinDescriptor } from './bitcoin-utils';
import { DEFAULT_WALLET_NAME } from './config';
import type { ImportDescriptorItem, DescriptorInfo } from './types';

export class WalletManager {
    private static readonly WALLET_NAME = DEFAULT_WALLET_NAME;

    static async initializeWallet(): Promise<boolean> {
        try {
            // Check if wallet exists
            const wallets = await gRpcClient.listWallets();
            
            if (wallets.includes(this.WALLET_NAME)) {
                // Wallet exists, load it
                await gRpcClient.loadWallet(this.WALLET_NAME);
            } else {
                // Create new blank wallet with private keys enabled
                await gRpcClient.createWallet(this.WALLET_NAME, true, true);
            }
            
            return true;
        } catch (error) {
            if ((error as RPCError).message.includes("already loaded")) {
                console.log("already-loaded:", this.WALLET_NAME);
                return true;
            }
            console.error('Failed to initialize wallet:', error);
            return false;
        }
    }

    static async getDescriptorChecksum(descriptor: string): Promise<string> {
        try {
            const info = await gRpcClient.getDescriptorInfo(this.WALLET_NAME, descriptor);
            return '#' + info.checksum;
        } catch (error) {
            console.error('Failed to get descriptor checksum:', error);
            throw error;
        }
    }

    static async importDescriptors(descriptors: BitcoinDescriptor[]): Promise<boolean> {
        try {
            // First, get existing descriptors
            const existingDescriptors = await gRpcClient.listDescriptors(this.WALLET_NAME, true);
            
            // Deactivate all existing descriptors that don't match our derived ones
            const deactivateRequests = existingDescriptors.map(desc => ({
                desc: desc.desc,
                active: false,
                internal: desc.internal,
                timestamp: "now"
            }));
            console.log("deactivateRequests: ", deactivateRequests);
            if (deactivateRequests.length > 0) {
                await gRpcClient.importDescriptors(this.WALLET_NAME, deactivateRequests as ImportDescriptorItem[]);
            }

            // Add checksums to descriptors while keeping private keys
            const importRequests = await Promise.all(descriptors.flatMap(async desc => {
                const receiveChecksum = await this.getDescriptorChecksum(desc.receiveDescriptor);
                const changeChecksum = await this.getDescriptorChecksum(desc.changeDescriptor);
                
                return [
                    {
                        desc: desc.receiveDescriptor + receiveChecksum,
                        active: true,
                        internal: false,
                        timestamp: "now"
                    },
                    {
                        desc: desc.changeDescriptor + changeChecksum,
                        active: true,
                        internal: true,
                        timestamp: "now"
                    }
                ];
            }));

            console.log("importRequests: ", importRequests.flat());
            await gRpcClient.importDescriptors(this.WALLET_NAME, importRequests.flat() as ImportDescriptorItem[]);
            return true;
        } catch (error) {
            console.error('Failed to import descriptors:', error);
            return false;
        }
    }
} 