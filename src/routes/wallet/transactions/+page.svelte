<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import { curWalletStore } from '$lib/store';
	import type { ITransaction } from '$lib/types';
	import { formatUnixSec, getShorter } from '$lib/utils';
	import {  listTransactions } from '$lib/wallet-utils';
	import { onMount } from 'svelte';

	let wallet: string;
	$: {
		wallet = $curWalletStore;
	}

	let pageTxes: ITransaction[] = [];
	let page = 1;
	let pageSize = 10; // Adjust this to change the number of transactions per page

	async function fetchPagedTx() {
		try {
			const tx = await listTransactions(wallet, '*', pageSize, (page - 1) * pageSize);
			pageTxes = tx.sort((a, b) => b.time - a.time);
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
		width: 90%;
		margin: 20px auto;
		padding: 20px;
		box-sizing: border-box;
		background-color: #f9f9f9;
		border-radius: 10px;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
	}

	.transactions h2 {
		text-align: center;
		margin-bottom: 20px;
		color: #333;
		font-size: 24px;
	}

	.transactions table {
		width: 100%;
		border-collapse: collapse;
	}

	.transactions table th,
	.transactions table td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}

	.transactions table tr:nth-child(even) {
		background-color: #f2f2f2;
	}

	.transactions table th {
		background-color: #4caf50;
		color: white;
	}

	.transactions button {
		margin: 0;
		padding: 10px;
		border: none;
		background-color: #4caf50;
		color: white;
		cursor: pointer;
		font-size: 1em;
	}

	.transactions button:disabled {
		background-color: #ddd;
		cursor: not-allowed;
	}
	.align-horiz {
		display: flex;
		justify-content: space-between;
		padding: 2px 10px;
		align-items: baseline;
	}

	.pagination {
		margin: 20px;
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.pagination button {
		padding: 10px 20px;
		background-color: #4caf50;
		color: white;
		border: none;
		border-radius: 5px;
		cursor: pointer;
	}

	.pagination button:disabled {
		background-color: #ddd;
		cursor: not-allowed;
	}

	.pagination span {
		font-size: 18px;
		color: #333;
		margin: 20px;
	}
</style>
