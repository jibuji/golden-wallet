<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { ethBalance, ethGasPrice, curWalletStore } from '$lib/store';
    import { formatEther, parseEther } from 'ethers';
    import { estimateGasForEthTransfer, sendEthTransaction } from '$lib/bridge-utils';
    import ClosableModal from '$lib/components/ClosableModel.svelte';
	import { BRIDGE_SERVER_URL } from '$lib/config';
    import { goto } from '$app/navigation';
    import { ethAddress, ethPrivateKey } from '$lib/stores/wallet-store';
    
    let amount = '';
    let recipient = '';
    let maxAmount = '0';
    let error = '';
    let isLoading = false;
    let showSuccessModal = false;
    let transactionHash: string | null = '';
    let walletEthAddress = '';
    let updateInterval: number;

    function handleBack() {
        goto('/bridge');
    }

    onMount(async () => {
        if ($curWalletStore && $ethAddress) {
            walletEthAddress = $ethAddress;
            // Fetch initial balances and gas price
            await updateEthInfo();
            
            // Set up interval to update every 60 seconds
            updateInterval = window.setInterval(updateEthInfo, 60000);
        }
    });

    onDestroy(() => {
        // Clean up interval when component is destroyed
        if (updateInterval) {
            window.clearInterval(updateInterval);
        }
    });

    async function updateEthInfo() {
        try {
            if (!walletEthAddress) {
                console.error('No ETH address available');
                return;
            }
            const { gasPrice } = await estimateGasForEthTransfer(walletEthAddress, "0x0000000000000000000000000000000000000000", 0n);
            console.log("gasPrice:", gasPrice);
            ethGasPrice.set(gasPrice);
            
            // Fetch ETH balance
            const response = await fetch(`${BRIDGE_SERVER_URL}/eth-address/${walletEthAddress}/balance`);
            const data = await response.json();
            ethBalance.set(data.eth_balance);
        } catch (err) {
            console.error('Error updating ETH info:', err);
        }
    }
    
    $: {
        try {
            if ($ethBalance && $ethGasPrice) {
                const gasLimit = 21000n; // Standard ETH transfer gas limit
                const gasCost = Number(formatEther($ethGasPrice * gasLimit));
                const safetyBuffer = gasCost * 2; // Double the gas cost as buffer
                const remains = $ethBalance - safetyBuffer;
                maxAmount = (remains > 0 ? remains : 0).toFixed(6);
                console.log("maxAmount:", maxAmount);
            }
        } catch (err) {
            console.error('Error calculating max amount:', err);
            maxAmount = '0';
            console.log("error maxAmount:", maxAmount);
        }
    }

    async function handleSend() {
        try {
            isLoading = true;
            error = '';
            
            if (!amount || !recipient) {
                error = 'Please fill in all fields';
                return;
            }

            const amountWei = parseEther(amount);
            if (amountWei <= 0n) {
                error = 'Invalid amount';
                return;
            }

            const maxAmountWei = parseEther(maxAmount);
            if (amountWei > maxAmountWei) {
                error = 'Amount exceeds maximum available balance';
                return;
            }

            if (!$ethPrivateKey) {
                error = 'ETH private key not available';
                return;
            }

            transactionHash = await sendEthTransaction(
                walletEthAddress,
                recipient,
                amountWei,
                $ethPrivateKey
            );

            if (transactionHash) {
                showSuccessModal = true;
                amount = '';
                recipient = '';
                await updateEthInfo(); // Update balances after successful send
            } else {
                error = 'Failed to send ETH - no transaction hash returned';
            }
            
        } catch (err: any) {
            console.error('Send error:', err);
            error = err.message || 'Failed to send ETH';
        } finally {
            isLoading = false;
        }
    }

    function closeSuccessModal() {
        showSuccessModal = false;
        transactionHash = null;
        updateEthInfo(); // Update ETH info after closing modal
    }
</script>

<div class="container">
    <div class="header">
        <button class="back-button" on:click={handleBack}>
            <svg class="back-arrow" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
        </button>
        <h2>Send ETH</h2>
    </div>

    <div class="card">
        <div class="balance-grid">
            <div class="balance-box">
                <label>Available Balance</label>
                <div class="balance-amount">{($ethBalance || 0).toFixed(6)} ETH</div>
            </div>

            <div class="balance-box">
                <label>Maximum Sendable</label>
                <div class="balance-amount">{maxAmount} ETH</div>
            </div>
        </div>

        <div class="input-group">
            <label for="recipient">Recipient Address</label>
            <input
                type="text"
                id="recipient"
                bind:value={recipient}
                placeholder="0x..."
            />
        </div>

        <div class="input-group">
            <label for="amount">Amount (ETH)</label>
            <div class="amount-input-container">
                <input
                    type="number"
                    id="amount"
                    bind:value={amount}
                    max={maxAmount}
                    step="0.000000000000000001"
                    placeholder="0.0"
                />
                <button class="max-button" on:click={() => amount = maxAmount}>
                    MAX
                </button>
            </div>
        </div>

        {#if error}
            <div class="error-message">
                <svg class="error-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{error}</span>
            </div>
        {/if}

        <button
            class="send-button"
            on:click={handleSend}
            disabled={isLoading || !amount || !recipient || !!error}
        >
            {#if isLoading}
                <span class="loading-spinner"></span>
                Sending...
            {:else}
                Send ETH
            {/if}
        </button>
    </div>
</div>

{#if showSuccessModal}
    <ClosableModal on:close={closeSuccessModal}>
        <div class="success-modal">
            <div class="success-icon">✓</div>
            <h2>Transaction Sent Successfully</h2>
            <p>Your ETH has been sent successfully.</p>
            {#if transactionHash}
                <p class="hash-container">
                    Transaction Hash: <br/>
                    <a 
                        href={`https://etherscan.io/tx/${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {transactionHash}
                    </a>
                </p>
            {/if}
            <button class="close-button" on:click={closeSuccessModal}>
                Close
            </button>
        </div>
    </ClosableModal>
{/if}

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }

    .header {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
    }

    .back-button {
        background: none;
        border: none;
        padding: 8px;
        margin-right: 16px;
        cursor: pointer;
    }

    .back-button:hover {
        opacity: 0.8;
    }

    .back-arrow {
        width: 24px;
        height: 24px;
        fill: currentColor;
    }

    h2 {
        font-size: 24px;
        font-weight: bold;
        margin: 0;
    }

    .card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .balance-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
    }

    .balance-box {
        background: #f5f5f5;
        padding: 16px;
        border-radius: 8px;
    }

    .balance-box label {
        display: block;
        font-size: 14px;
        color: #666;
        margin-bottom: 4px;
    }

    .balance-amount {
        font-size: 18px;
        font-weight: bold;
    }

    .input-group {
        margin-bottom: 20px;
    }

    .input-group label {
        display: block;
        font-size: 14px;
        margin-bottom: 8px;
        color: #333;
    }

    input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
    }

    input:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
    }

    .amount-input-container {
        position: relative;
    }

    .max-button {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #4a90e2;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
    }

    .max-button:hover {
        color: #357abd;
    }

    .error-message {
        display: flex;
        align-items: center;
        background: #fff2f0;
        border-left: 4px solid #ff4d4f;
        padding: 12px;
        margin-bottom: 20px;
        border-radius: 4px;
    }

    .error-icon {
        width: 20px;
        height: 20px;
        fill: #ff4d4f;
        margin-right: 8px;
    }

    .send-button {
        width: 100%;
        padding: 12px;
        background: #4a90e2;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .send-button:hover:not(:disabled) {
        background: #357abd;
    }

    .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top: 2px solid transparent;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .success-modal {
        padding: 24px;
        text-align: center;
    }

    .success-icon {
        width: 48px;
        height: 48px;
        background: #52c41a;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin: 0 auto 16px;
    }

    .hash-container {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 8px;
        word-break: break-all;
        margin: 16px 0;
    }

    .hash-container a {
        color: #4a90e2;
        text-decoration: none;
    }

    .hash-container a:hover {
        text-decoration: underline;
    }

    .close-button {
        background: #4a90e2;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        width: 100%;
    }

    .close-button:hover {
        background: #357abd;
    }
</style> 