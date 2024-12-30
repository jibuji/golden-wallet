<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { curWalletStore, curWalletInfoStore } from '$lib/store';
	import { getAddressesByLabel, getNewAddress } from '$lib/wallet-utils';
	import type { ITransaction, IUnwrapTransaction, IWrapTransaction } from '$lib/types/index';
	import { createSignedEthTransaction, createSignedBtbTransaction } from '$lib/bridge-utils';
	import { BRIDGE_SERVER_URL } from '$lib/config';
	import ClosableModal from '$lib/components/ClosableModel.svelte';
	import { goto } from '$app/navigation';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { walletId, ethAddress, ethPrivateKey } from '$lib/stores/wallet-store';
	import { slide } from 'svelte/transition';

	let currentWallet: string;
	let btbReceivingAddress: string = '';
	let ethReceivingAddress: string = '';
	let amount: number = 0;
	let receivedAmount: number = 0;
	let fromNetwork: 'Bitbi' | 'Ethereum' = 'Bitbi';
	let toNetwork: 'Bitbi' | 'Ethereum' = 'Ethereum';
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
	let walletBtbBalance: number = 0;
	let isLoading = false;
	let showErrorModal = false;
	let errorMessage = '';
	let showSuccessModal = false;
	let successMessage = '';
	let showAddressInfo = false;
	let showBridgeInfo = false;

	function swapDirection() {
		[fromNetwork, toNetwork] = [toNetwork, fromNetwork];
		direction = fromNetwork === 'Bitbi' ? 'btb_to_wbtb' : 'wbtb_to_btb';
	}

	$: {
		direction = fromNetwork === 'Bitbi' ? 'btb_to_wbtb' : 'wbtb_to_btb';
		// Calculate received amount accounting for fees
		if (direction === 'btb_to_wbtb') {
			receivedAmount = Math.max(0, amount - wrapFee.btb_fee - wrapFee.eth_fee_in_wbtb);
		} else {
			receivedAmount = Math.max(0, amount - unwrapFee.btb_fee);
		}
	}

	$: {
		// Prevent selecting the same network for both sides
		if (fromNetwork === toNetwork) {
			toNetwork = fromNetwork === 'Bitbi' ? 'Ethereum' : 'Bitbi';
		}
	}

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

	$: {
		const wInfo = $curWalletInfoStore;
		if (wInfo) {
			walletBtbBalance = wInfo.balance || 0;
		}
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
			console.error('Error fetching ETH and BTB balances:', error);
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
						successMessage = 'Wrap transaction initiated successfully! You can track its progress in the history section below.';
						showSuccessModal = true;
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
				successMessage = 'Unwrap transaction initiated successfully! You can track its progress in the history section below.';
				showSuccessModal = true;
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

	function closeSuccessModal() {
		showSuccessModal = false;
		successMessage = '';
	}

	function getStatusStyle(status: string): string {
		// Completed statuses
		if (status === 'WRAP_COMPLETED' || status === 'UNWRAP_COMPLETED') {
			return 'status-completed';
		}
		
		// Progress statuses for wrap
		if (['WRAP_BTB_TRANSACTION_BROADCASTED', 'WRAP_BTB_TRANSACTION_CONFIRMING', 'WBTB_MINTING_IN_PROGRESS'].includes(status)) {
			return 'status-progress';
		}
		
		// Progress statuses for unwrap
		if (['UNWRAP_ETH_TRANSACTION_INITIATED', 'UNWRAP_ETH_TRANSACTION_CONFIRMING', 
			'UNWRAP_ETH_TRANSACTION_CONFIRMED', 'WBTB_BURN_CONFIRMED',
			'UNWRAP_BTB_TRANSACTION_CREATING', 'UNWRAP_BTB_TRANSACTION_BROADCASTED'].includes(status)) {
			return 'status-progress';
		}
		
		// Error statuses
		if (['FAILED_INSUFFICIENT_AMOUNT', 'FAILED_TRANSACTION_NOT_FOUND', 
			'FAILED_INSUFFICIENT_FUNDS', 'FAILED_TRANSACTION_UNKNOWN',
			'FAILED_TRANSACTION_MAX_ATTEMPTS'].includes(status)) {
			return 'status-error';
		}
		
		return '';
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
	<h1 class="page-title">Bridge BTB</h1>

	<div class="card">
		<div class="bridge-form">
			<div class="network-selector">
				<div class="network-section">
					<label class="section-label">From this network</label>
					<div class="network-dropdown">
						<select bind:value={fromNetwork} class="network-select">
							<option value="Bitbi">
								Bitbi
							</option>
							<option value="Ethereum">
								Ethereum
							</option>
						</select>
					</div>
				</div>

				<button class="swap-button" on:click={swapDirection} aria-label="Swap direction">
					↔
				</button>

				<div class="network-section">
					<label class="section-label">To this network</label>
					<div class="network-dropdown">
						<select bind:value={toNetwork} class="network-select">
							<option value="Bitbi">
								Bitbi
							</option>
							<option value="Ethereum">
								Ethereum
							</option>
						</select>
					</div>
				</div>
			</div>

			<div class="bridge-info-toggle">
				<button class="toggle-button" on:click={() => showBridgeInfo = !showBridgeInfo}>
					Tips: {showBridgeInfo ? 'Show less' : 'Show more'}
				</button>
			</div>

			{#if showBridgeInfo}
				{#if direction === 'btb_to_wbtb'}
					<div class="bridge-info" transition:slide>
						<h3>Bridge BTB from Bitbi to Ethereum</h3>
						<p>To bridge your BTB tokens to Ethereum:</p>
						<ol>
							<li>Enter the amount of BTB you want to bridge</li>
							<li>Provide your Ethereum address where you want to receive the bridged tokens</li>
							<li>Click "Bridge" to initiate the transfer</li>
						</ol>
						<p class="note">Note: The bridging process may take a few minutes to complete.</p>
					</div>
				{:else}
					<div class="bridge-info" transition:slide>
						<h3>Bridge BTB from Ethereum to Bitbi</h3>
						<p>To bridge your BTB tokens from Ethereum:</p>
						<ol>
							<li>Make sure you have enough ETH in your wallet's Ethereum address to pay for gas fees</li>
							<li>Enter the amount of BTB you want to bridge</li>
							<li>Send your BTB tokens to the Ethereum address shown below</li>
							<li>Click "Bridge" to initiate the transfer</li>
						</ol>
						<p class="note">Note: Insufficient ETH balance will cause the bridge transaction to fail.</p>
					</div>
				{/if}
			{/if}

			<div class="amount-section">
				<div class="amount-inputs-row">
					<div class="amount-input">
						<label>You send</label>
						<div class="amount-field">
							<input 
								type="number" 
								bind:value={amount}
								min={direction === 'btb_to_wbtb' ? min_wrap_amount : 0}
								max={direction === 'btb_to_wbtb' ? max_wrap_amount : walletWbtbBalance}
								step="0.00000001"
								placeholder="0.00000000"
							/>
							<span class="token-symbol">BTB</span>
						</div>
						{#if direction === 'btb_to_wbtb'}
							<div class="available-amount">
								Available: {walletBtbBalance.toFixed(8)} BTB
							</div>
						{:else}
							<div class="available-amounts">
								<div>Available: {walletWbtbBalance.toFixed(6)} BTB</div>
								<div>ETH Balance: {walletEthBalance.toFixed(6)} ETH</div>
								<button class="toggle-button" on:click={() => showAddressInfo = !showAddressInfo}>
									{showAddressInfo ? 'Show less' : 'Show more'}
								</button>
							</div>
						{/if}
					</div>

					<div class="amount-input">
						<label>You receive (estimated)</label>
						<div class="amount-field">
							<input 
								type="number" 
								value={receivedAmount}
								disabled
								placeholder="0.00000000"
							/>
							<span class="token-symbol">BTB</span>
						</div>
					</div>
				</div>

				{#if direction === 'btb_to_wbtb'}
					<div class="fee-info">
						Network fee: {wrapFee.btb_fee + wrapFee.eth_fee_in_wbtb} BTB
					</div>
				{/if}
			</div>

			{#if direction === 'btb_to_wbtb'}
				<div class="address-input">
					<label>BTB Receiving Address on Ethereum</label>
					<input 
						type="text" 
						bind:value={ethReceivingAddress}
						placeholder="Enter your Ethereum address"
						class="eth-address-input"
					/>
				</div>
			{:else if showAddressInfo}
				<div class="address-info" class:show={showAddressInfo} transition:slide>
					<div class="address-info-content">
						<div class="address-section">
							<label>Wallet's ETH Address:</label>
							<div class="address-display-container">
								<code class="address-display">{walletEthAddress}</code>
								<CopyButton text={walletEthAddress} />
							</div>
						</div>
						<div class="send-eth-button">
							<button class="secondary-button" on:click={handleSendEth}>
								Send ETH Out
							</button>
						</div>
					</div>
				</div>
			{/if}
			{#if direction === 'wbtb_to_btb'}
				<div class="fee-info">
						Network fee: {unwrapFee.btb_fee} BTB + {unwrapFee.eth_fee} ETH
				</div>
			{/if}
			{#if direction === 'btb_to_wbtb' && ethReceivingAddress.trim() === ''}
				<p class="error-message">Ethereum address is required</p>
			{/if}

			{#if direction === 'btb_to_wbtb' && amount < min_wrap_amount}
				<p class="error-message">Minimum wrap amount is {min_wrap_amount} BTB</p>
			{/if}
			{#if direction === 'btb_to_wbtb' && amount > max_wrap_amount}
				<p class="error-message">Maximum wrap amount is {max_wrap_amount} BTB</p>
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
					Bridge
				{/if}
			</button>
		</div>
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
						<td class={getStatusStyle(transaction.status)}>{transaction.status}</td>
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

	{#if showSuccessModal}
		<div class="modal-overlay" on:click={closeSuccessModal}></div>
		<div class="success-modal">
			<div class="success-icon">✓</div>
			<h2>Success!</h2>
			<p>{successMessage}</p>
			<button on:click={closeSuccessModal}>Close</button>
		</div>
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

	.bridge-form {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.network-selector {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 4px;
	}

	.network-section {
		flex: 1;
	}

	.section-label {
		display: block;
		font-size: 14px;
		color: #666;
		margin-bottom: 8px;
	}

	.network-dropdown {
		position: relative;
	}

	.network-select {
		width: 100%;
		padding: 12px;
		padding-left: 40px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 16px;
		appearance: none;
		background: white;
		cursor: pointer;
	}

	.swap-button {
		width: 40px;
		height: 40px;
		border: 1px solid #ddd;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		margin-top: 24px;
		transition: all 0.2s;
	}

	.swap-button:hover {
		background: #f5f5f5;
		transform: scale(1.05);
	}

	.amount-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.amount-inputs-row {
		display: flex;
		gap: 16px;
	}

	.amount-input {
		flex: 1;
		background: #f8f9fa;
		padding: 16px;
		border-radius: 12px;
	}

	.amount-field {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
	}

	.amount-field input {
		flex: 1;
		background: transparent;
		border: none;
		font-size: 24px;
		padding: 8px 0;
	}

	.amount-field input:focus {
		outline: none;
		box-shadow: none;
	}

	.amount-field input:disabled {
		color: #666;
	}

	.token-symbol {
		font-size: 20px;
		font-weight: 500;
		color: #333;
	}

	.available-amount {
		font-size: 14px;
		color: #666;
		margin-top: 8px;
	}

	.fee-info {
		font-size: 14px;
		color: #666;
		background: #f8f9fa;
		padding: 16px;
		border-radius: 12px;
		text-align: center;
	}

	.address-input {
		margin-top: 16px;
	}

	.eth-address-input {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 16px;
		font-family: monospace;
	}

	.eth-address-input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
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

	.status-completed {
		color: #52c41a;
		font-weight: 500;
		background: #f6ffed;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #b7eb8f;
	}

	.status-progress {
		color: #1890ff;
		font-weight: 500;
		background: #e6f7ff;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #91d5ff;
	}

	.status-error {
		color: #f5222d;
		font-weight: 500;
		background: #fff1f0;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #ffa39e;
	}

	.success-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		max-width: 400px;
		width: 90%;
		text-align: center;
	}

	.success-modal h2 {
		color: #52c41a;
		margin-bottom: 16px;
	}

	.success-modal button {
		background: #52c41a;
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 16px;
	}

	.success-modal button:hover {
		background: #389e0d;
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

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}

	.address-info {
		background: #f8f9fa;
		padding: 12px;
		border-radius: 12px;
		margin-top: 8px;
		opacity: 0;
		max-height: 0;
		overflow: hidden;
		transition: all 0.3s ease-in-out;
	}

	.address-info.show {
		opacity: 1;
		max-height: 150px;
	}

	.address-info-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.address-section {
		flex: 1;
	}

	.address-section label {
		font-size: 14px;
		color: #666;
		margin-bottom: 4px;
		display: block;
	}

	.address-display-container {
		display: flex;
		align-items: center;
		gap: 8px;
		background: white;
		padding: 8px;
		border-radius: 6px;
		height: 38px;
	}

	.send-eth-button {
		display: flex;
		align-items: center;
	}

	.bridge-info-toggle {
		text-align: right;
		margin: 0;
		padding: 0;
	}

	.toggle-button {
		background: none;
		border: none;
		color: #4a90e2;
		padding: 0;
		cursor: pointer;
		font-size: 14px;
		text-align: left;
	}

	.bridge-info {
		background: #f0f7ff;
		padding: 10px;
		border-radius: 12px;
		margin: 8px 0;
		border: 1px solid #bae0ff;
	}

	.amount-section {
		margin-top: 8px;
	}

	.bridge-info h3 {
		color: #1890ff;
		margin: 0 0 8px 0;
		font-size: 16px;
	}

	.bridge-info p {
		margin: 0 0 8px 0;
		color: #333;
		font-size: 14px;
	}

	.bridge-info ol {
		margin: 0 0 8px 0;
		padding-left: 20px;
	}

	.bridge-info li {
		margin-bottom: 4px;
		color: #333;
		font-size: 14px;
	}

	.bridge-info .note {
		font-style: italic;
		color: #666;
		margin: 0;
		font-size: 13px;
	}

	.bridge-info-toggle {
		text-align: right;
		margin-bottom: 4px;
	}

	.available-amounts {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 8px;
		color: #666;
		font-size: 14px;
	}

	.toggle-button {
		background: none;
		border: none;
		color: #4a90e2;
		padding: 4px 0;
		cursor: pointer;
		font-size: 14px;
		text-align: left;
		margin-top: 4px;
	}

	.toggle-button:hover {
		text-decoration: underline;
	}
</style>

