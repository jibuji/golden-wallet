<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import { curWalletStore } from '$lib/store';
	import type { ITransaction } from '$lib/types';
	import { formatUnixSec, getShorter } from '$lib/utils';
	import {  listTransactions } from '$lib/wallet-utils';
	import { onMount } from 'svelte';
	import uniqBy from 'lodash-es/uniqBy';

	let pageTxes: ITransaction[] = [];
	let page = 1;
	let pageSize = 10; // Adjust this to change the number of transactions per page
	let wallet: string;
	$: {
		wallet = $curWalletStore;
		if (wallet) {
			console.log('wallet changed to:', wallet);
			pageSize = 1;
			pageSize = 10;
			fetchPagedTx();
		}
	}

	

	async function fetchPagedTx() {
		try {
			const tx = await listTransactions(wallet, '*', pageSize*2, (page - 1) * pageSize);
			// Remove duplicates based on txid using Lodash
			const uniqueTx = uniqBy(tx, 'txid');
			// Sort the unique transactions
			pageTxes = uniqueTx.sort((a: ITransaction, b: ITransaction) => b.time - a.time).slice(0, pageSize);
		} catch (e) {
			console.error('fetchPagedTx e:', e);
		}
	}
	onMount( () => {
		// Fetch the transactions for the current page
		fetchPagedTx();
	});

	const changePage = async (newPage: number) => {
		page = newPage;
		await fetchPagedTx();
	};

	function openTransactionDetails(txid: string) {
		open(`https://explorer.bitbi.org/tx/${txid}`);
	}
</script>

<div class="transactions">
	<h2>Transaction History</h2>

	<table>
		<thead>
			<tr>
				<th>Time</th>
				<th>Amount</th>
				<th>Category</th>
				<!-- <th>Address</th> -->
				<th>TxID</th>
				<th>Comment</th>
			</tr>
		</thead>
		<tbody>
			{#each pageTxes as transaction (transaction.txid)}
				<tr>
					<td>{formatUnixSec(transaction.time)}</td>
					<td>{transaction.amount}</td>
					<td>{transaction.category}</td>
					<!-- <td>
						<div class="align-horiz">
							<span>{getShorter(transaction.address)}</span>
							<button on:click={() => navigator.clipboard.writeText(transaction.address)}
								>Copy</button
							>
						</div>
					</td> -->
					<td>
						<div class="align-horiz">
							<!-- svelte-ignore a11y-invalid-attribute -->
							<a href="#" on:click|preventDefault={() => openTransactionDetails(transaction.txid)}>
								{getShorter(transaction.txid)}
							</a>
							<button on:click={() => navigator.clipboard.writeText(transaction.txid)}>Copy</button>
						</div>
					</td>
					<td>{transaction.comment || ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<div class="pagination">
		<button on:click={() => changePage(page - 1)} disabled={page === 1}>Previous</button>
		<span>Page {page}</span>
		<button on:click={() => changePage(page + 1)}>Next</button>
	</div>
</div>

<style>
	.transactions {
		width: 100%;
		max-width: 1000px;
		margin: 0 auto;
		padding: 30px;
		box-sizing: border-box;
		background-color: #ffffff;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.transactions h2 {
		margin: 0 0 25px 0;
		color: #333;
		font-size: 1.75rem;
		padding-bottom: 15px;
		border-bottom: 2px solid #E8F5E9;
	}

	.transactions table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
	}

	.transactions table th,
	.transactions table td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	.transactions table th {
		font-weight: 600;
		color: #333;
		background-color: #F5F5F5;
		white-space: nowrap;
	}

	.transactions table tr:hover {
		background-color: #F9F9F9;
	}

	.transactions button {
		padding: 8px 16px;
		border: none;
		background-color: #4CAF50;
		color: white;
		cursor: pointer;
		font-size: 0.95rem;
		border-radius: 6px;
		transition: background-color 0.2s ease;
	}

	.transactions button:hover:not(:disabled) {
		background-color: #43A047;
	}

	.transactions button:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
	}

	.align-horiz {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	.align-horiz a {
		color: #4CAF50;
		text-decoration: none;
		font-weight: 500;
	}

	.align-horiz a:hover {
		text-decoration: underline;
	}

	.pagination {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 15px;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #f0f0f0;
	}

	.pagination button {
		margin: 0;
	}

	.pagination span {
		font-size: 1rem;
		color: #666;
	}
</style>
