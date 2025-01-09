<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import { curWalletStore, curBcInfo } from '$lib/store';

	import { listRecentTransactions, sendToAddress } from '$lib/wallet-utils';
	import { formatUnixSec, getShorter, sleep } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { ITransaction } from '$lib/types';
	let recipient = '';
	let comment = '';
	let transactionFee = 100;
	let currentBalance = 0.0;
	let amount = 0.0;
	let txLoading = true;
	let isSending = false;
	$: wallet = $curWalletStore;
	$: {
		if (wallet && isCaughtUp) {
			txLoading = true;
			listRecentTransactions(wallet, 5, 'send').then(txes => {
				sentTransactions = txes;
			}).finally(() => {
				txLoading = false;
			});
		}
	}
	$: isCaughtUp = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;

	let showModal = false;
	let curTxId = '';
	async function sendBitbi() {
		// Form validation
		if (!recipient) {
			alert('Please enter a recipient address');
			return;
		}
		if (!transactionFee || transactionFee <= 0) {
			alert('Please enter a valid transaction fee');
			return;
		}
		if (!amount || amount <= 0) {
			alert('Please enter a valid amount');
			return;
		}

		console.log(
			`Sending Bitbi from wallet ${wallet} to ${recipient} with comment ${comment}.
             Transaction fee: ${transactionFee}. `
		);
		if (!wallet) {
			alert('Please select a wallet');
			return;
		}
		isSending = true;
		try {
			curTxId = await sendToAddress(wallet, recipient, amount, comment, transactionFee);
			console.log('Transaction ID:', curTxId);
			sentTransactions = await listRecentTransactions(wallet, 5, 'send');

			// Show the modal with the transaction ID
			showModal = true;
		} catch (e) {
			console.log(`sendBitbi error:`, e);
		} finally {
			isSending = false;
		}
	}

	let sentTransactions: ITransaction[] = [];
	function openTransactionDetails(txid: string) {
		open(`https://explorer.bitbi.org/tx/${txid}`);
	}

	onMount(() => {
		let cancel = false;
		async function recentTxLoop() {
			for (; !cancel; await sleep(10000)) {
				if (!isCaughtUp) {
					txLoading = true;
					continue;
				}
				txLoading = true;
				const txes = await listRecentTransactions(wallet, 5, 'send');
				sentTransactions = txes;
				txLoading = false;
			}
		}
		recentTxLoop();
		return () => (cancel = true);
	});
</script>

<div>
	<form on:submit|preventDefault={sendBitbi}>
		<div>
			<label for="recipient">Recipient:</label>
			<input id="recipient" bind:value={recipient} placeholder="Enter recipient's address " />
		</div>
		<div>
			<label for="amount">Amount:</label>
			<div class="input-with-unit">
				<input
					type="number"
					id="amount"
					step="0.00001"
					bind:value={amount}
					placeholder="Enter the amount to send"
				/>
				<span class="unit">BTB</span>
			</div>
		</div>
		<div>
			<label for="comment">Comment:</label>
			<input id="comment" bind:value={comment} placeholder="Add a comment" />
		</div>

		<div class="tx-fee">
			<label for="transactionFee"> Fee Rate:</label>
			<div class="input-with-unit">
				<input
					type="number"
					id="transactionFee"
					bind:value={transactionFee}
					placeholder="Enter custom transaction fee rate in sat/vB"
				/>
				<span class="unit">sat/vB</span>
			</div>
		</div>
		<div class="balance-and-submit">
			<button type="submit">Send Bitbi</button>
			<div class="current-balance">
				<span>Current Balance: </span>
				<span>{currentBalance} BTB</span>
			</div>
		</div>
	</form>
	<div class="sent-transactions">
		<h2>Sent Transactions</h2>
		{#if txLoading && !sentTransactions.length}
			<p>Loading...</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>TxID</th>
						<th>Comment</th>
						<th>Date Time</th>
					</tr>
				</thead>
				<tbody>
					{#each sentTransactions as tx, index (tx.txid + index)}
						<tr>
							<td>
								<!-- svelte-ignore a11y-invalid-attribute -->
								<a href="#" on:click|preventDefault={() => openTransactionDetails(tx.txid)}
									>{getShorter(tx.txid)}</a
								>
							</td>
							<td>{tx.comment || ''}</td>
							<td>{formatUnixSec(tx.time)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
	{#if isSending}
		<div class="loading-popup">Sending transaction...</div>
	{/if}
	{#if showModal}
		<div class="modal">
			<div class="modal-content">
				<h2>Transaction successful!</h2>
				<p>
					Transaction ID: <a href="https://explorer.bitbi.org/tx/{curTxId}" target="_blank">{curTxId}</a>
				</p>
				<button on:click={() => (showModal = false)}>Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	form {
		max-width: 800px;
		margin: 0 auto 30px;
		padding: 30px;
		background-color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border-radius: 12px;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 8px;
		color: #333;
	}

	input {
		width: 100%;
		padding: 12px;
		box-sizing: border-box;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		font-size: 1rem;
		transition: all 0.2s ease;
		margin-bottom: 20px;
	}

	input:focus {
		border-color: #4CAF50;
		box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
		outline: none;
	}

	button {
		background-color: #4CAF50;
		color: white;
		border: none;
		padding: 12px 24px;
		cursor: pointer;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}

	button:hover:not(:disabled) {
		background-color: #43A047;
	}

	button:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
	}

	.tx-fee {
		margin-top: 25px;
		padding: 20px;
		background-color: #F5F5F5;
		border-radius: 8px;
	}

	.input-with-unit {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.unit {
		font-weight: 500;
		color: #666;
		min-width: 60px;
	}

	.balance-and-submit {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 30px;
		padding-top: 20px;
		border-top: 1px solid #f0f0f0;
	}

	.current-balance {
		font-size: 1.1rem;
	}

	.current-balance span:first-child {
		color: #666;
	}

	.current-balance span:last-child {
		font-weight: 600;
		color: #4CAF50;
		margin-left: 8px;
	}

	.sent-transactions {
		max-width: 800px;
		margin: 0 auto;
		padding: 30px;
		background-color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border-radius: 12px;
	}

	.sent-transactions h2 {
		margin: 0 0 25px 0;
		color: #333;
		font-size: 1.5rem;
		padding-bottom: 15px;
		border-bottom: 2px solid #E8F5E9;
	}

	.sent-transactions table {
		width: 100%;
		border-collapse: collapse;
	}

	.sent-transactions th,
	.sent-transactions td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	.sent-transactions th {
		font-weight: 600;
		color: #333;
		background-color: #F5F5F5;
	}

	.sent-transactions tr:hover {
		background-color: #F9F9F9;
	}

	.sent-transactions a {
		color: #4CAF50;
		text-decoration: none;
		font-weight: 500;
	}

	.sent-transactions a:hover {
		text-decoration: underline;
	}

	.loading-popup {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 1.5rem;
		z-index: 1000;
	}

	.modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		padding: 30px;
		border-radius: 12px;
		max-width: 500px;
		width: 90%;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-content h2 {
		margin: 0 0 20px 0;
		color: #333;
	}

	.modal-content p {
		margin: 0 0 20px 0;
		color: #666;
	}

	.modal-content a {
		color: #4CAF50;
		text-decoration: none;
		font-weight: 500;
	}

	.modal-content a:hover {
		text-decoration: underline;
	}
</style>
