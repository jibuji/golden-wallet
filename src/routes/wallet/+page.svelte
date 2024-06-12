<script lang="ts">
	import { onMount } from 'svelte';
	import { getMinerWalletInfo } from '$lib/wallet-utils';
	import {curBcInfo} from '$lib/store';

	import { sleep } from '$lib/utils';
	let availableBalance = 0.0;
	let pendingBalance = 0.0;
	let immatureBalance = 0.0;
	let totalBalance = availableBalance + pendingBalance;
	$: loading = $curBcInfo.initialblockdownload || $curBcInfo.blocks !== $curBcInfo.headers;
	$: loadingProgress = $curBcInfo.headers ? ($curBcInfo.blocks / $curBcInfo.headers) * 100 : 0;
	$: isCaughtUp = loadingProgress === 100 && !loading;

	onMount(() => {
		let cancel = false;
		async function walletInfoUpdateLoop() {
			for (; !cancel; await sleep(10000)) {
				if (!isCaughtUp) {
					continue;
				}
				try {
					const info = await getMinerWalletInfo();
					if (info) {
						availableBalance = info.balance;
						pendingBalance = info.unconfirmed_balance;
						immatureBalance = info.immature_balance;
						totalBalance = availableBalance + pendingBalance + immatureBalance;
					} 
				} catch (e) {
					console.error(e);
				}
			}
		}
		walletInfoUpdateLoop();
		return () => (cancel = true);
	});
</script>


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


<style>
	
	.loading-status {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		font-size: 1.2em;
		color: #888;
	}

	.balances {
		width: 48%;
		max-width: 500px;
		border: 1px solid #e0e0e0;
		padding: 20px;
		background-color: #f8f8f8;
		border-radius: 5px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	.balances h2{
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
</style>
