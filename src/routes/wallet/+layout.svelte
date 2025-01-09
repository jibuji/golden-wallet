<script>
	import { page } from '$app/stores';
	import { curBcInfo, curWalletInfoStore } from '$lib/store';

	$: isCaughtUp = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;
	$: walletReady = !!$curWalletInfoStore && isCaughtUp;
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
		padding: 20px;
		font-family: Arial, sans-serif;
		color: #333;
		height: 100%;
		max-width: 1200px;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.nav-bar {
		display: flex;
		justify-content: space-around;
		background-color: #ffffff;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 25px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-bar a, .nav-bar span {
		text-decoration: none;
		color: #666;
		font-weight: 600;
		padding: 8px 20px;
		flex: 1;
		text-align: center;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.nav-bar a:hover {
		background-color: #f5f5f5;
		color: #333;
	}

	.nav-bar a.active {
		color: #4CAF50;
		background-color: #E8F5E9;
	}

	.nav-bar span {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		background-color: #ffffff;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 20px;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f5f5f5;
		min-height: 100vh;
	}
</style>
