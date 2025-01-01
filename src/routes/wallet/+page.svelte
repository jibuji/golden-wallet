<script lang="ts">
	import { curBcInfo, curWalletInfoStore, curWalletStore } from '$lib/store';
	import { formatNumber } from '$lib/utils';
	import { consolidateAllUtxos } from '$lib/tasks/consolidateUtxos';
	import { makeRpcRequest } from '$lib/test';
	import { onMount } from 'svelte';

	let availableBalance = 0.0;
	let pendingBalance = 0.0;
	let immatureBalance = 0.0;
	let totalBalance = availableBalance + pendingBalance;
	$: loading = $curBcInfo.initialblockdownload || $curBcInfo.blocks !== $curBcInfo.headers;
	$: loadingProgress = $curBcInfo.headers ? ($curBcInfo.blocks / $curBcInfo.headers) * 100 : 0;
	$: isCaughtUp = loadingProgress === 100 && !loading;
	
	$: {
		console.log('wallet page isCaughtUp:', isCaughtUp, loadingProgress)
		console.log('wallet page curWalletStore:', $curWalletStore)
		console.log('wallet page curWalletInfoStore:', $curWalletInfoStore)
		const wInfo = $curWalletInfoStore;
		if (isCaughtUp && wInfo) {
			availableBalance = wInfo.balance || 0;
			pendingBalance = wInfo.unconfirmed_balance || 0;
			immatureBalance = wInfo.immature_balance || 0;
			totalBalance = availableBalance + pendingBalance + immatureBalance;
			if (totalBalance > 0) {
				consolidateAllUtxos($curWalletStore).then(count => {
					console.log("consolidation count:", count);
				}).catch(err => {
					console.error("consolidation error:", err);
				}).finally(() => {
					console.log("consolidation complete");
				});
			}
		}
	}

	const uniswapLink = "https://app.uniswap.org/explore/tokens/ethereum/0x8defe5b69c162cd9bb5e4d2b61cf68602d442eb1";
	onMount(() => {
		window.makeRpcRequest = makeRpcRequest;
	});
</script>

<div class="main">
	<div class="balances">
		<div>
			<h2>
				Balances

				<!-- <img src="alert-icon.png" alt="Alert Icon" width="20" height="20" /> -->
			</h2>
			<!-- {#if loading}
            <span class="loading-status"> Loading...</span>
        {/if} -->
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
		<!-- <div class="swap-link">
			<a href={uniswapLink} target="_blank" rel="noopener noreferrer">Swap eBTB for ETH on Uniswap</a>
			<p class="swap-tip">Tip: Click Swap to quickly sell your eBTB(wrapped BTB on ethereum) on Uniswap.</p>
		</div> -->
	</div>
	{#if loadingProgress < 100}
		<div class="popup">
			<div class="popup-content">
				<h2>Please wait...</h2>
				<p>We're preparing your wallet information. This may take a few minutes.</p>
				<div class="progress-bar">
					<div class="progress-bar-fill" style="width: {loadingProgress}%;"></div>
				</div>
				<p>Progress: {formatNumber(loadingProgress)}%</p>
			</div>
		</div>
		
	{/if}
</div>

<style>
	.main {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.popup {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.popup-content {
		background-color: white;
		padding: 20px;
		border-radius: 10px;
		width: 80%;
		text-align: center;
	}

	.progress-bar {
		background-color: #f3f3f3;
		border-radius: 5px;
		width: 100%;
		height: 20px;
		margin: 10px 0;
	}

	.progress-bar-fill {
		background-color: #4caf50;
		height: 100%;
		border-radius: 5px;
	}

	.balances {
		width: 100%;
		max-width: 500px;
		height: 100%;
		border: 1px solid #e0e0e0;
		padding: 20px;
		background-color: #f8f8f8;
		border-radius: 5px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	.balances h2 {
		display: flex;
		align-items: center;
		font-size: 1.5em;
		margin-bottom: 20px;
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

	.swap-link {
		margin-top: 20px;
		text-align: center;
	}

	.swap-link a {
		display: inline-block;
		background-color: #1969ff;
		color: white;
		padding: 10px 15px;
		border-radius: 5px;
		text-decoration: none;
		font-weight: bold;
		transition: background-color 0.3s ease;
	}

	.swap-link a:hover {
		background-color: #0052cc;
	}

	.swap-tip {
		font-size: 0.9em;
		color: #666;
		margin-top: 10px;
	}
</style>
