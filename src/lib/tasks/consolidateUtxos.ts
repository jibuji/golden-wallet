import { gRpcClient } from "../bitbi-rpc";

interface ConsolidationState {
    walletName: string;
    maxInputsPerTx: number;
    consolidationCount: number;
    isComplete: boolean;
}

const STORAGE_KEY = 'utxo_consolidation_state';

function saveState(state: ConsolidationState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): ConsolidationState | null {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

export async function consolidateAllUtxos(walletName: string, maxInputsPerTx: number = 900): Promise<number> {
    const state: ConsolidationState =  {
        walletName,
        maxInputsPerTx,
        consolidationCount: 0,
        isComplete: false
    };

    if (state.isComplete) {
        console.log("Consolidation already complete.");
        return state.consolidationCount;
    }

    try {
        // Call listUnspent only once
        const unspent = await gRpcClient.listUnspent(walletName, {
            minconf: 1,
            maxconf: 9999999,
            addresses: [],
            include_unsafe: false,
            query_options: {
                minimumAmount: 0,
                maximumAmount: 999999999,
                include_immature_coinbase: false
            }
        });
        console.log("consolidation unspent count:", unspent.length);
        if (unspent.length < 1000) {
            console.log("consolidation not enough utxos to consolidate");
            return 0;
        }
        // Sort UTXOs by amount in descending order
        unspent.sort((a, b) => b.amount - a.amount);

        while (unspent.length > 1) {
            const inputs = unspent.splice(0, state.maxInputsPerTx);
            const totalAmount = inputs.reduce((sum, utxo) => sum + utxo.amount, 0);

            const consolidatedAddress = await gRpcClient.getRawChangeAddress(walletName, "bech32");

            const feeRate = 0.00001; // 1 sat/byte, adjust as needed
            const estimatedSize = inputs.length * 148 + 34 + 10;
            const estimatedFee = estimatedSize * feeRate;
            const outputs = [{[consolidatedAddress]: totalAmount - estimatedFee}];

            const rawTx = await gRpcClient.createRawTransaction(walletName, inputs, outputs);
            const signedTx = await gRpcClient.signRawTransactionWithWallet(walletName, rawTx);
            console.log("consolidation signedTx:", signedTx);
            if (signedTx.complete) {
                const txid = await gRpcClient.sendRawTransaction(walletName, signedTx.hex);
                console.log(`UTXO consolidation transaction ${state.consolidationCount + 1} sent. TXID: ${txid}`);
                
                state.consolidationCount++;
                saveState(state);

                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            } else {
                console.log("consolidation Failed to sign the consolidation transaction");
                break;
            }
        }

        state.isComplete = true;
        saveState(state);

        console.log(`Consolidation complete. Total consolidation transactions: ${state.consolidationCount}`);
        return state.consolidationCount;
    } catch (error) {
        console.error(`Consolidation failed: An error occurred in consolidateAllUtxos: ${error}`, error);
        saveState(state);
        throw error;
    }
}

export function getConsolidationStatus(): ConsolidationState | null {
    return loadState();
}

export async function resumeConsolidation(): Promise<number | null> {
    const state = loadState();
    if (state && !state.isComplete) {
        return await consolidateAllUtxos(state.walletName, state.maxInputsPerTx);
    }
    return null;
}

export function clearConsolidationState(): void {
    localStorage.removeItem(STORAGE_KEY);
}
