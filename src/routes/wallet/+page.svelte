<script lang="ts">
	import { onMount } from 'svelte';
	import { sleep } from '$lib/utils';
	import { getMinerWalletInfo } from '$lib/wallet-utils';
	let availableBalance = 0.0;
	let pendingBalance = 0.0;
	let immatureBalance = 0.0;
	let totalBalance = availableBalance + pendingBalance;
	let loading = true;

	onMount(() => {
		let cancel = false;
		async function walletInfoUpdateLoop() {
			for (; !cancel; ) {
				try {
					const info = await getMinerWalletInfo();
					if (info) {
						loading = false;
						availableBalance = info.balance;
						pendingBalance = info.unconfirmed_balance;
						immatureBalance = info.immature_balance;
						totalBalance = availableBalance + pendingBalance + immatureBalance;
					} else {
						loading = true;
					}
				} catch (e) {
					console.error(e);
					loading = true;
				}
				await sleep(10000);
			}
		}
		walletInfoUpdateLoop();
		return () => (cancel = true);
	});
</script>

<div class="container">

	<div class="nav-bar">
		<a href="#">Overview</a>
		<!-- <a href="#">Send</a>
		<a href="#">Receive</a>
		<a href="#">Transactions</a> -->
	</div>

	<div class="main-content">
		<div class="balances">
			<div>
				<h2>
					Balances

					<!-- <img src="alert-icon.png" alt="Alert Icon" width="20" height="20" /> -->
				</h2>
				{#if loading}
					<span class="loading-status"> Loading...</span>
				{/if}
			</div>
			<div class="balance-item">
				<span>Available:</span> <span>{availableBalance.toFixed(4)} BTB</span>
			</div>
			<div class="balance-item">
				<span>Pending:</span> <span>{pendingBalance.toFixed(4)} BTB</span>
			</div>
			<div class="balance-item">
				<span>Immature:</span> <span>{immatureBalance.toFixed(4)} BTB</span>
			</div>
			<hr />
			<div class="balance-item">
				<span>Total:</span> <span>{totalBalance.toFixed(4)} BTB</span>
			</div>
		</div>
		<!-- <div class="transactions">
        <h2>
          Recent transactions
          <img src="alert-icon.png" alt="Alert Icon" width="20" height="20">
        </h2>
      </div> -->
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		padding: 10px;
		font-family: Arial, sans-serif;
		color: #333;
	}


	.nav-bar {
		display: flex;
		justify-content: space-around;
		background-color: #f8f8f8;
		padding: 10px;
		border-bottom: 1px solid #e0e0e0;
		border-radius: 5px;
		margin-bottom: 20px;
	}

	.nav-bar a {
		text-decoration: none;
		color: #333;
		font-weight: bold;
	}

	.main-content {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
	}

	.loading-status {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		font-size: 1.2em;
		color: #888;
	}

	.balances,
	.transactions {
		width: 48%;
		max-width: 500px;
		border: 1px solid #e0e0e0;
		padding: 20px;
		background-color: #f8f8f8;
		border-radius: 5px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	.balances h2,
	.transactions h2 {
		display: flex;
		align-items: center;
		font-size: 1.5em;
		margin-bottom: 20px;
	}

	.balances h2 img,
	.transactions h2 img {
		margin-left: 10px;
	}

	.balances p {
		margin: 5px 0;
	}

	.balance-item {
		display: flex;
		justify-content: space-between;
		padding: 10px;
		border-bottom: 1px solid #e0e0e0;
		font-size: 1.1em;
	}

	.balance-item:last-child {
		border-bottom: none;
	}

	.balance-item span:first-child {
		font-weight: bold;
	}
</style>
