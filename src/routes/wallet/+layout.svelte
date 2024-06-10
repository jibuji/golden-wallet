<script>
	import { page } from '$app/stores';
	import { getIsNodeCaughtUp } from '$lib/non-reactive-state';
	import { sleep } from '$lib/utils';
	import { MinerDefaultWallet, ensureLoadWallet, getMinerWalletInfo } from '$lib/wallet-utils';
	import { onMount } from 'svelte';
	let walletReady = false;
	onMount(() => {
		let cancel = false;
		async function walletInfoUpdateLoop() {
			for (; !cancel; await sleep(10000)) {
				const caughtUp = getIsNodeCaughtUp();
				if (!caughtUp) {
					continue;
				}
				try {
					await ensureLoadWallet(MinerDefaultWallet);
					const info = await getMinerWalletInfo();
					walletReady = !!info;
				} catch (e) {
					console.error('wallet layout', e);
					walletReady = false;
				}
			}
		}
		walletInfoUpdateLoop();
		return () => (cancel = true);
	});
</script>

<div class="container">
	<div class="nav-bar">
		<a href="/wallet" class:active={$page.url.pathname === '/wallet'}>Overview</a>
		{#if walletReady}
			<a href="/wallet/send" class:active={$page.url.pathname === '/wallet/send'}>Send</a>
			<a href="/wallet/receive" class:active={$page.url.pathname === '/wallet/receive'}>Receive</a>
			<a href="/wallet/transactions" class:active={$page.url.pathname === '/wallet/transactions'}
				>Transactions</a
			>
		{:else}
			<span>Send</span>
			<span>Receive</span>
			<span>Transactions</span>
		{/if}
	</div>

	<div class="main-content">
		<slot></slot>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		padding: 10px;
		font-family: Arial, sans-serif;
		color: #333;
		height: 100%;
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

	.nav-bar a.active {
		color: #007bff;
	}

	.main-content {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
	}
</style>
