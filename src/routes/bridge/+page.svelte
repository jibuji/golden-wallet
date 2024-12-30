<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { curWalletStore } from '$lib/store';
	import { getAddressesByLabel, getNewAddress } from '$lib/wallet-utils';
	import type { ITransaction, IUnwrapTransaction, IWrapTransaction } from '$lib/types/index';
	import { createSignedEthTransaction, createSignedBtbTransaction } from '$lib/bridge-utils';
	import { BRIDGE_SERVER_URL } from '$lib/config';
	import ClosableModal from '$lib/components/ClosableModel.svelte';
	import { goto } from '$app/navigation';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { walletId, ethAddress, ethPrivateKey } from '$lib/stores/wallet-store';


	let currentWallet: string;
	let btbReceivingAddress: string = '';
	let ethReceivingAddress: string = '';
	let amount: number = 0;
	let direction: 'btb_to_wbtb' | 'wbtb_to_btb' = 'btb_to_wbtb';
	let wrapFee: { btb_fee: number; eth_fee_in_wbtb: number } = { btb_fee: 0, eth_fee_in_wbtb: 0 };
	let unwrapFee: { btb_fee: number; eth_fee: number, eth_gas_price: string, eth_gas_limit: number } = { btb_fee: 0, eth_fee: 0, eth_gas_price: '0', eth_gas_limit: 0 };
    let min_wrap_amount: number = 0;
    let max_wrap_amount: number = 0;
    let bridge_btb_address: string = '';
    let wbtb_contract_address: string = '';
    let wbtb_contract_abi: any[] = [];
	let wrapHistory: IWrapTransaction[] = [];
	let unwrapHistory: IUnwrapTransaction[] = [];
	let feeUpdateInterval: ReturnType<typeof setInterval>;
	let historyUpdateInterval: ReturnType<typeof setInterval>;
	let balanceUpdateInterval: ReturnType<typeof setInterval>;
	let minUnwrapAmount: number = 0;
	let walletEthAddress: string = '';
	let walletEthBalance: number = 0;
	let walletWbtbBalance: number = 0;
	let isLoading = false;
	let showErrorModal = false;
	let errorMessage = '';
	
	
	$: {
		currentWallet = $curWalletStore;
		if (currentWallet) {
			loadBTBAddress();
		}
		console.log("ethAddress:", $ethAddress)
	}

	async function loadBTBAddress() {
		const addresses = await getAddressesByLabel(currentWallet, 'bridge');
		if (addresses && addresses.length > 0) {
			btbReceivingAddress = addresses[0];
		} else {
			btbReceivingAddress = await getNewAddress(currentWallet, 'bridge', 'bech32')
		}
		walletEthAddress = $ethAddress || '';
	}
	interface WrapFee {
		btb_fee: number;
		eth_fee_in_wbtb: number;
	}

	interface UnwrapFee {
			btb_fee: number;
			eth_fee: number;
			eth_gas_price: string;
			eth_gas_limit: number;
	}

	interface BridgeInfo {
		wbtb_contract_abi: any[];
		wrap_fee: WrapFee;
		unwrap_fee: UnwrapFee;
        min_wrap_amount: number;
        max_wrap_amount: number;
        min_unwrap_amount: number;
        bridge_btb_address: string;
        wbtb_contract_address: string;
	}

	async function fetchBridgeInfo() {
		try {
			const response = await fetch(`${BRIDGE_SERVER_URL}/bridge-info`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: BridgeInfo = await response.json();
            if (data.wbtb_contract_abi && JSON.stringify(data.wbtb_contract_abi) !== JSON.stringify(wbtb_contract_abi)) {
                wbtb_contract_abi = data.wbtb_contract_abi;
            }
            if (data.wrap_fee && (data.wrap_fee.btb_fee !== wrapFee.btb_fee || data.wrap_fee.eth_fee_in_wbtb !== wrapFee.eth_fee_in_wbtb)) {
                wrapFee = data.wrap_fee;
            }
            if (data.unwrap_fee && (data.unwrap_fee.btb_fee !== unwrapFee.btb_fee || data.unwrap_fee.eth_fee !== unwrapFee.eth_fee || data.unwrap_fee.eth_gas_price !== unwrapFee.eth_gas_price || data.unwrap_fee.eth_gas_limit !== unwrapFee.eth_gas_limit)) {
                unwrapFee = data.unwrap_fee;
            }
            if (data.min_wrap_amount && data.min_wrap_amount !== min_wrap_amount) {
                min_wrap_amount = data.min_wrap_amount;
            }
            if (data.max_wrap_amount && data.max_wrap_amount !== max_wrap_amount) {
                max_wrap_amount = data.max_wrap_amount;
            }
            if (data.bridge_btb_address && data.bridge_btb_address !== bridge_btb_address) {
                bridge_btb_address = data.bridge_btb_address;
            }
            if (data.wbtb_contract_address && data.wbtb_contract_address !== wbtb_contract_address) {
                wbtb_contract_address = data.wbtb_contract_address;
            }
            if (data.min_unwrap_amount && data.min_unwrap_amount !== minUnwrapAmount) {
                minUnwrapAmount = data.min_unwrap_amount;
            }
		} catch (error) {
			console.error('Error fetching bridge info:', error);
			throw error;
		}
	}

	async function fetchEthBalance() {
		if (!walletEthAddress) {
			console.error('No Ethereum address available');
			return;
		}

		try {
			const response = await fetch(`${BRIDGE_SERVER_URL}/eth-address/${walletEthAddress}/balance`);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log("fetchEthBalance data:", data);
			walletEthBalance = data.eth_balance || 0;
			walletWbtbBalance = data.wbtb_balance || 0;

		} catch (error) {
			console.error('Error fetching ETH and WBTB balances:', error);
		}
	}

	$: {
		if (direction === 'wbtb_to_btb' && walletEthAddress) {
			fetchEthBalance();
		}
	}

	function startPeriodicUpdates() {
		fetchBridgeInfo();
		fetchBridgeHistory();
		if (walletEthAddress) {
			fetchEthBalance();
		}
		feeUpdateInterval = setInterval(fetchBridgeInfo, 60000);
		historyUpdateInterval = setInterval(fetchBridgeHistory, 60000);
		balanceUpdateInterval = setInterval(() => {
			if (walletEthAddress) {
				fetchEthBalance();
			}
		}, 60000);
	}

	async function fetchBridgeHistory() {
        if (!$walletId) {
            console.error('No wallet ID available');
            return;
        }
        const wrapResponse = await fetch(`${BRIDGE_SERVER_URL}/wrap-history/${$walletId}`);
        wrapHistory = await wrapResponse.json();
        wrapHistory.sort((a: IWrapTransaction, b: IWrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
        
        const unwrapResponse = await fetch(`${BRIDGE_SERVER_URL}/unwrap-history/${$walletId}`);
        unwrapHistory = await unwrapResponse.json();
        unwrapHistory.sort((a: IUnwrapTransaction, b: IUnwrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
	}

	async function initiateBridge() {
		isLoading = true;
		try {
			if (direction === 'btb_to_wbtb') {
				if (!$walletId) {
					throw new Error('Wallet ID not available');
				}
				const result = await createSignedBtbTransaction($walletId, bridge_btb_address, ethReceivingAddress, amount);
				if (result.error) {
					errorMessage = result.error;
					showErrorModal = true;
					return;
				}
				if (result.hex) {
					const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-wrap/`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							signed_btb_tx: result.hex
						})
					});
					const responseData = await response.json();
					if (response.status !== 200) {
						if (responseData.detail && responseData.detail.includes("Error broadcasting transaction: -26: tx-size")) {
							errorMessage = "The transaction size is too large. Please try reducing the amount you're attempting to wrap.";
						} else {
							errorMessage = responseData.detail || 'An error occurred while initiating the wrap. Please try again.';
						}
						showErrorModal = true;
					} else {
						console.log('Wrap initiated:', responseData);
						// Optionally, show a success message to the user
					}
				}
			} else {
				// Implement WBTB to BTB unwrapping logic
				if (!$ethPrivateKey) {
					throw new Error('ETH private key not available');
				}
				if (!$walletId) {
					throw new Error('Wallet ID not available');
				}
				const signedEthTransaction = await createSignedEthTransaction($walletId, amount, btbReceivingAddress, 
					$ethPrivateKey, wbtb_contract_abi, wbtb_contract_address, unwrapFee.eth_gas_price, unwrapFee.eth_gas_limit);

				if (!signedEthTransaction || signedEthTransaction.error) {
					errorMessage = signedEthTransaction?.error || 'Failed to create signed transaction';
					showErrorModal = true;
					return;
				}

				const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-unwrap`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						signed_eth_tx: signedEthTransaction.rawTransaction
					})
				});
				const result = await response.json();
				console.log('Unwrap initiated:', result);
			}
			fetchBridgeHistory();
		} catch (error: unknown) {
			console.error('Error during bridge initiation:', error);
			errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during bridge initiation. Please try again.';
			showErrorModal = true;
		} finally {
			isLoading = false;
		}
	}

	function closeErrorModal() {
		showErrorModal = false;
		errorMessage = '';
	}

	onMount(() => {
		startPeriodicUpdates();
		if (walletEthAddress) {
			console.log("onMount fetchEthBalance direction:", direction, walletEthAddress);
			fetchEthBalance();
		}
	});

	onDestroy(() => {
		if (feeUpdateInterval) {
			clearInterval(feeUpdateInterval);
		}
		if (historyUpdateInterval) {
			clearInterval(historyUpdateInterval);
		}
		if (balanceUpdateInterval) {
			clearInterval(balanceUpdateInterval);
		}
	});

	function isWrapTransaction(transaction: IWrapTransaction | IUnwrapTransaction): transaction is IWrapTransaction {
		return 'receiving_address' in transaction;
	}

	function handleSendEth() {
		goto('/bridge/send-eth');
	}
</script>

<div class="container">
	<h1 class="page-title">Bridge BTB and WBTB</h1>

	<div class="card">
		<div class="direction-selector">
			<label class="block text-sm font-medium mb-2">
				Direction:
				<select bind:value={direction}>
					<option value="btb_to_wbtb">BTB to WBTB</option>
					<option value="wbtb_to_btb">WBTB to BTB</option>
				</select>
			</label>
		</div>

		{#if direction === 'btb_to_wbtb'}
			<div class="input-group">
				<label for="amount">
					Amount:
				</label>
				<input 
					type="number" 
					id="amount"
					bind:value={amount} 
					min={direction === 'btb_to_wbtb' ? min_wrap_amount : 0} 
					max={direction === 'btb_to_wbtb' ? max_wrap_amount : walletWbtbBalance}
					step="1000" 
				/>
			</div>

			<div class="input-group">
				<label for="eth-address">
					Receiving Ethereum Address:
				</label>
				<input 
					id="eth-address"
					type="text" 
					bind:value={ethReceivingAddress} 
					required 
				/>
			</div>

			{#if direction === 'btb_to_wbtb' && ethReceivingAddress.trim() === ''}
				<p class="error-message">Ethereum address is required</p>
			{/if}

			{#if direction === 'btb_to_wbtb' && amount < min_wrap_amount}
				<p class="error-message">Minimum wrap amount is {min_wrap_amount} BTB</p>
			{/if}
			{#if direction === 'btb_to_wbtb' && amount > max_wrap_amount}
				<p class="error-message">Maximum wrap amount is {max_wrap_amount} BTB</p>
			{/if}
		{:else}
			<div class="address-container">
				<p>Send WBTB to this Ethereum address for unwrapping:</p>
				<div class="address-display-container">
					<p class="address-display">{walletEthAddress}</p>
					<CopyButton text={walletEthAddress} />
				</div>
			</div>

			<div class="info-box">
				<div class="balance-grid">
					<div class="balance-box">
						<label>WBTB Balance</label>
						<div class="balance-amount">{walletWbtbBalance} WBTB</div>
					</div>
					<div class="balance-box">
						<label>ETH Balance</label>
						<div class="eth-balance-row">
							<div class="balance-amount">{walletEthBalance.toFixed(6)} ETH</div>
							<button class="secondary-button" on:click={handleSendEth}>
								Send ETH Out
							</button>
						</div>
					</div>
				</div>
			</div>

			<div class="input-group">
				<label for="unwrap-amount">
					Amount to Unwrap:
				</label>
				<input 
					type="number" 
					id="unwrap-amount"
					bind:value={amount} 
					min={minUnwrapAmount}
					max={walletWbtbBalance}
					step="1000"
				/>
			</div>

			{#if amount < minUnwrapAmount}
				<p class="error-message">Minimum unwrap amount is {minUnwrapAmount} WBTB</p>
			{/if}
			{#if amount > walletWbtbBalance}
				<p class="error-message">Amount exceeds your WBTB balance</p>
			{/if}
			{#if walletEthBalance < unwrapFee.eth_fee}
				<p class="error-message">Insufficient ETH balance for unwrapping. You need at least {unwrapFee.eth_fee} ETH to cover the fee.</p>
			{/if}
		{/if}

		<button 
			class="primary-button"
			on:click={initiateBridge} 
			disabled={
				isLoading ||
				(direction === 'btb_to_wbtb' && (ethReceivingAddress.trim() === '' || amount < min_wrap_amount || amount > max_wrap_amount)) ||
				(direction === 'wbtb_to_btb' && (amount < minUnwrapAmount || amount > walletWbtbBalance || walletEthBalance < unwrapFee.eth_fee))
			}
		>
			{#if isLoading}
				<span class="loading-spinner"></span>
				Processing...
			{:else}
				Initiate Bridge
			{/if}
		</button>
	</div>

	<div class="card mt-6">
		<h2>Current Fees</h2>
		{#if direction === 'btb_to_wbtb'}
			<div class="fee-item">
				Wrap Fee (Estimated): {wrapFee.btb_fee} BTB + {wrapFee.eth_fee_in_wbtb} WBTB
				<span class="tooltip">?
					<span class="tooltiptext">
						The fee for wrapping BTB to WBTB includes a BTB fee and an ETH fee (in WBTB).
					</span>
				</span>
			</div>
		{:else}
			<div class="fee-item">
				Unwrap Fee (Estimated): {unwrapFee.btb_fee} BTB + {unwrapFee.eth_fee} ETH
				<span class="tooltip">?
					<span class="tooltiptext">
						The fee for unwrapping WBTB to BTB includes a BTB fee and an ETH fee.
					</span>
				</span>
			</div>
		{/if}
	</div>

	<div class="card mt-6">
		<h2>{direction === 'btb_to_wbtb' ? 'Wrap' : 'Unwrap'} History</h2>
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Amount</th>
					<th>Status</th>
					<th>Details</th>
				</tr>
			</thead>
			<tbody>
				{#each (direction === 'btb_to_wbtb' ? wrapHistory : unwrapHistory) as transaction}
					<tr>
						<td>{new Date(transaction.create_time).toLocaleString()}</td>
						<td>{transaction.amount} {direction === 'btb_to_wbtb' ? 'BTB' : 'WBTB'}</td>
						<td>{transaction.status}</td>
						<td>
							<details>
								<summary>View Details</summary>
								{#if isWrapTransaction(transaction)}
									<p>BTB Transaction ID: {transaction.btb_tx_id}</p>
									{#if transaction.eth_tx_hash}
										<p>ETH Transaction Hash: {transaction.eth_tx_hash}</p>
									{/if}
									<p>Receiving Address: {transaction.receiving_address}</p>
									{#if transaction.minted_wbtb_amount !== null}
										<p>Minted WBTB: {transaction.minted_wbtb_amount}</p>
									{/if}
								{:else}
									<p>ETH Transaction Hash: {transaction.eth_tx_hash}</p>
									{#if transaction.btb_tx_id}
										<p>BTB Transaction ID: {transaction.btb_tx_id}</p>
									{/if}
									<p>Receiving Address: {transaction.btb_receiving_address}</p>
								{/if}
								{#if transaction.exception_count > 0}
									<p>Exceptions: {transaction.exception_count}</p>
									<p>Last Exception: {transaction.last_exception_time ? new Date(transaction.last_exception_time).toLocaleString() : 'N/A'}</p>
									<p>Exception Details: {transaction.exception_details}</p>
								{/if}
							</details>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if showErrorModal}
		<ClosableModal on:close={closeErrorModal}>
			<h2>Error</h2>
			<p>{errorMessage}</p>
			<button on:click={closeErrorModal}>Close</button>
		</ClosableModal>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	.page-title {
		font-size: 28px;
		font-weight: bold;
		margin-bottom: 24px;
		color: #333;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.mt-6 {
		margin-top: 24px;
	}

	.direction-selector {
		margin-bottom: 24px;
	}

	.direction-selector select {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 16px;
		margin-top: 8px;
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

	.info-box {
		background: #f5f5f5;
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 24px;
	}

	.address-display {
		font-family: monospace;
		background: #e0e0e0;
		padding: 12px;
		border-radius: 6px;
		word-break: break-all;
		margin: 12px 0;
	}

	.balance-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin: 16px 0;
	}

	.balance-box {
		background: white;
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

	.eth-balance-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-message {
		display: flex;
		align-items: center;
		background: #fff2f0;
		border-left: 4px solid #ff4d4f;
		padding: 12px;
		margin-bottom: 20px;
		border-radius: 4px;
		color: #cf1322;
	}

	.primary-button {
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

	.primary-button:hover:not(:disabled) {
		background: #357abd;
	}

	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-button {
		background: #6c757d;
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.secondary-button:hover {
		background: #5a6268;
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

	.fee-item {
		background: #f8f9fa;
		padding: 16px;
		border-radius: 8px;
		margin-top: 12px;
	}

	.tooltip {
		position: relative;
		display: inline-block;
		border-bottom: 1px dotted #666;
		cursor: help;
		margin-left: 8px;
	}

	.tooltip .tooltiptext {
		visibility: hidden;
		width: 200px;
		background-color: #555;
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 5px;
		position: absolute;
		z-index: 1;
		bottom: 125%;
		left: 50%;
		margin-left: -100px;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.tooltip:hover .tooltiptext {
		visibility: visible;
		opacity: 1;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}

	th, td {
		border: 1px solid #ddd;
		padding: 12px;
		text-align: left;
	}

	th {
		background-color: #f8f9fa;
		font-weight: 600;
	}

	tr:hover {
		background-color: #f8f9fa;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.mt-2 {
		margin-top: 8px;
	}

	.address-container {
		margin: 1rem 0;
	}

	.address-display-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #f5f5f5;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.address-display {
		margin: 0;
		font-family: monospace;
		word-break: break-all;
	}
</style>

