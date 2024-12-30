import { gRpcClient } from "./bitbi-rpc/index";
import type { IListUnspentResponse } from "./types/index";
import { stringToHex } from "./utils";
import Web3 from 'web3';
import {  BRIDGE_SERVER_URL, DEFAULT_WALLET_NAME } from "./config";

export async function createSignedBtbTransaction(walletId: string, toAddress: string, returnEthAddress: string, amountBtb: number) {
    try {
        // Convert BTB to satoshis (1 BTB = 100,000,000 satoshis)
        const amountSatoshis = BigInt(Math.round(amountBtb * 100_000_000));
        const feeSatoshis = BigInt(100_000); // 0.001 BTB in satoshis

        // Get and sort unspent transactions
        let unspent;
        try {
            unspent = await gRpcClient.listUnspent(DEFAULT_WALLET_NAME, {
                minconf: 6,
                maxconf: 99999999,
                addresses: [],
                include_unsafe: false,
                query_options: {
                    minimumAmount: 0.01,
                    maximumAmount: "9999999999",
                    minimumSumAmount: Number(amountSatoshis + feeSatoshis) / 100_000_000,
                    include_immature_coinbase: false
                }
            });
            if (!unspent || unspent.length === 0) {
                return { error: 'No UTXOs found with minimum 6 confirmations and minimum amount of 0.01 BTB' };
            }
        } catch (error) {
            console.error("Error fetching unspent transactions:", error);
            return { error: `Failed to fetch unspent transactions: ${error instanceof Error ? error.message : String(error)}` };
        }
        unspent.sort((a: IListUnspentResponse, b: IListUnspentResponse) => b.amount - a.amount);

        let totalSatoshis = BigInt(0);
        const inputs = [];

        // Select inputs
        for (const utxo of unspent) {
            if (totalSatoshis >= amountSatoshis + feeSatoshis) break;
            inputs.push({ txid: utxo.txid, vout: utxo.vout });
            totalSatoshis += BigInt(Math.round(utxo.amount * 100_000_000));
        }

        // Check for insufficient funds
        if (totalSatoshis < amountSatoshis + feeSatoshis) {
            const availableBTB = Number(totalSatoshis) / 100_000_000;
            const requiredBTB = Number(amountSatoshis + feeSatoshis) / 100_000_000;
            return { error: `Insufficient confirmed funds. Available: ${availableBTB} BTB, Required: ${requiredBTB} BTB (including 0.001 BTB fee)` };
        }

        // Define dust threshold (e.g., 0.00001 BTB or 1000 satoshis)
        const dustThresholdSatoshis = BigInt(10_1000);

        // Get change address
        let changeAddress;
        try {
            changeAddress = await gRpcClient.getRawChangeAddress(DEFAULT_WALLET_NAME, "bech32");
        } catch (error) {
            console.error("Error getting change address:", error);
            return { error: `Failed to get change address: ${error instanceof Error ? error.message : String(error)}` };
        }
        
        // Add OP_RETURN data
        const opReturnData = `wrp:${walletId}-${returnEthAddress.startsWith('0x') ? returnEthAddress.slice(2) : returnEthAddress}`;
        
        // Calculate change amount
        const changeAmount = totalSatoshis - amountSatoshis - feeSatoshis;

        // Prepare outputs
        const outputs: { [key: string]: number|string }[] = [
            {[toAddress]: Number(amountSatoshis) / 100_000_000},
        ];

        // Add change output only if it's above dust threshold
        if (changeAmount > dustThresholdSatoshis) {
            outputs.push({[changeAddress]: Number(changeAmount) / 100_000_000});
        } else {
            console.log(`Change amount (${changeAmount} satoshis) is below dust threshold. Adding to fee.`);
        }

        // Add OP_RETURN output
        outputs.push({data: stringToHex(opReturnData)});

        // Create and sign raw transaction
        let rawTx;
        try {
            rawTx = await gRpcClient.createRawTransaction(DEFAULT_WALLET_NAME, inputs, outputs);
        } catch (error) {
            console.error("Error creating raw transaction:", error);
            return { error: `Failed to create raw transaction: ${error instanceof Error ? error.message : String(error)}` };
        }

        let signedTx;
        try {
            signedTx = await gRpcClient.signRawTransactionWithWallet(DEFAULT_WALLET_NAME, rawTx);
        } catch (error) {
            console.error("Error signing raw transaction:", error);
            return { error: `Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}` };
        }

        if (signedTx.complete) {
            return { hex: signedTx.hex };
        } else {
            return { error: 'Transaction signing incomplete. Some inputs may be missing or invalid.' };
        }
    } catch (error) {
        console.error(`An error occurred in createSignedBtbTransaction:`, error);
        return { error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` };
    }
}



const MaxGasPriceWei = BigInt(400 * 10**9); // 400 Gwei

async function getUnwrapEthTransactionCount(address: string): Promise<{final_nonce: number | null, chainId: number | null}> {
    try {
        const response = await fetch(`${BRIDGE_SERVER_URL}/unwrap-eth-transaction-count/${address}`);
        if (response.ok) {
            const data = await response.json();
            return {final_nonce: data.final_nonce, chainId: data.chain_id};
        } else {
            console.error(`Failed to get transaction count. Status code: ${response.status}`);
            console.error(`Response content: ${await response.text()}`);
            return {final_nonce: null, chainId: null};
        }
    } catch (error) {
        console.error(`An error occurred while getting transaction count: ${error}`);
        return {final_nonce: null, chainId: null};
    }
}


export async function createSignedEthTransaction(walletId: string, wbtbAmount: number, btbReceivingAddress: string, privateKey: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractAbi: any, contractAddress: string, gasPriceWei?: string, gasLimit?: number) {
    try {
        const web3 = new Web3();
        console.log("gasPricewei:", gasPriceWei)
        console.log("privateKey:", privateKey)
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);

        const senderAddress = account.address;
        console.log("Sender Address:", senderAddress);
        const {final_nonce: nonce, chainId: chainId} = await getUnwrapEthTransactionCount(senderAddress);
        console.log("Nonce:", nonce);
        console.log("Chain ID:", chainId);

        if (nonce === null || chainId === null) {
            console.error("Failed to get transaction count from server. Aborting transaction.");
            return null;
        }

        console.log("nonce:", nonce);

        const satoshis = BigInt(Math.round(wbtbAmount * 100000000)); // 1 BTB = 100,000,000 satoshis
        console.log("satoshis:", satoshis.toString());
        // Prepare the custom data
        const customData = web3.utils.asciiToHex(`unw:${walletId}-${btbReceivingAddress}`);
        console.log("custom_data:", customData);

        // Create the contract instance
        const wbtbContract = new web3.eth.Contract(contractAbi, contractAddress);

        // Prepare the burn function call
        const burnFunction = wbtbContract.methods.burn(satoshis, customData);

        // Convert MaxGasPrice to Wei if it's not already

        // Convert provided gas price from Gwei to Wei, or use MaxGasPriceWei
        const providedGasPriceWei = gasPriceWei ? BigInt(gasPriceWei) : MaxGasPriceWei;
        const finalGasPriceWei = (providedGasPriceWei < MaxGasPriceWei ? providedGasPriceWei : MaxGasPriceWei);
        
        console.log("gas_price (Wei):", finalGasPriceWei.toString());
        console.log("gas_price (Gwei):", (finalGasPriceWei / BigInt(10**9)).toString());

        // Prepare transaction data
        const transaction = {
            from: senderAddress,
            to: contractAddress,
            data: burnFunction.encodeABI(),
            gas: gasLimit,
            gasPrice: finalGasPriceWei.toString(),
            nonce: nonce,
            chainId: chainId
        };
        console.log("sendingtransaction:", transaction);
        // Sign the transaction
        const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
        console.log("signedTx:", signedTx);
        return signedTx.rawTransaction;
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        return null;
    }
}

export async function estimateGasForEthTransfer(
    fromAddress: string,
    toAddress: string,
    amount: bigint
): Promise<{ gasLimit: bigint; gasPrice: bigint }> {
    try {
        const response = await fetch(`${BRIDGE_SERVER_URL}/estimate-eth-transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_address: fromAddress,
                to_address: toAddress,
                amount: amount.toString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to estimate gas');
        }

        const data = await response.json();
        return {
            gasLimit: BigInt(data.gas_limit),
            gasPrice: BigInt(data.gas_price)
        };
    } catch (error) {
        console.error('Error estimating gas:', error);
        throw error;
    }
}

export async function sendEthTransaction(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    privateKey: string
): Promise<string> {
    try {
        // Get gas estimates from backend
        const gasEstimate = await estimateGasForEthTransfer(fromAddress, toAddress, amount);
        
        // Create Web3 instance
        const web3 = new Web3();
        
        // Get the nonce
        const nonce = await web3.eth.getTransactionCount(fromAddress);
        
        // Prepare the transaction
        const tx = {
            from: fromAddress,
            to: toAddress,
            value: amount.toString(),
            gas: gasEstimate.gasLimit.toString(),
            gasPrice: gasEstimate.gasPrice.toString(),
            nonce: nonce,
            chainId: await web3.eth.getChainId()
        };

        // Sign the transaction locally
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        
        if (!signedTx.rawTransaction) {
            throw new Error('Failed to sign transaction');
        }

        // Send the signed transaction to backend for broadcasting
        const response = await fetch(`${BRIDGE_SERVER_URL}/broadcast-eth-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                signed_transaction: signedTx.rawTransaction
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to broadcast transaction');
        }

        const result = await response.json();
        return result.transaction_hash;
    } catch (error) {
        console.error('Error sending ETH:', error);
        throw error;
    }
}


