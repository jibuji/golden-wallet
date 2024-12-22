<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isWalletInitialized, isWalletLocked } from '$lib/storage-utils';
	import { walletStore } from '$lib/stores/wallet-store';
	import { get } from 'svelte/store';
	import Navigation from '$lib/components/Navigation.svelte';
	import { fade } from 'svelte/transition';

	// Define route groups
	const ROUTES = {
		SETUP: {
			PASSWORD: '/setup/password',
			MNEMONIC: '/setup/mnemonic'
		},
		AUTH: {
			LOGIN: '/login',
			RESTORE: '/restore'
		},
		APP: {
			WALLET: '/wallet',
			BRIDGE: '/bridge',
			MINE: '/mine',
			APPS: '/apps',
			HOME: '/'
		}
	};

	// Routes that don't require wallet initialization
	const PUBLIC_ROUTES = [
		ROUTES.SETUP.PASSWORD,
		ROUTES.SETUP.MNEMONIC,
		ROUTES.AUTH.LOGIN,
		ROUTES.AUTH.RESTORE,
		ROUTES.APP.APPS
	];

	let isLoading = true;

	function handleRouteChange(path: string) {
		const initialized = isWalletInitialized();
		const locked = isWalletLocked();
		const isPublicRoute = PUBLIC_ROUTES.includes(path);
		const state = get(walletStore);

		// Case 1: Not initialized - allow both password setup and restore pages
		if (!initialized) {
			if (![ROUTES.SETUP.PASSWORD, ROUTES.AUTH.RESTORE].includes(path)) {
				goto(ROUTES.SETUP.PASSWORD);
			}
			return;
		}
		console.log("debug: initialized: ", initialized);
		console.log("debug: locked: ", locked);
		console.log("debug: path: ", path);
		console.log("debug: isPublicRoute: ", isPublicRoute);
		console.log("debug: state: ", state);
		// Case 2: Initialized but locked
		if (initialized && locked) {
			// Allow only login and restore pages
			if (![ROUTES.AUTH.LOGIN, ROUTES.AUTH.RESTORE].includes(path)) {
				goto(ROUTES.AUTH.LOGIN);
			}
			return;
		}

		// Case 3: Need to show mnemonic
		if (state.showMnemonic ) {
			if (path !== ROUTES.SETUP.MNEMONIC) {
				goto(ROUTES.SETUP.MNEMONIC);
			}
			return;
		}

		// Case 4: Initialized and unlocked
		if (initialized && !locked) {
			// Redirect from public routes to wallet, except for the apps page
			if ((isPublicRoute && path !== ROUTES.APP.APPS) || path === ROUTES.APP.HOME) {
				goto(ROUTES.APP.WALLET);
			}
			return;
		}
	}

	// Watch route changes
	$: {
		if (!isLoading) {
			handleRouteChange($page.url.pathname);
		}
	}

	onMount(() => {
		// Initial route check
		handleRouteChange($page.url.pathname);
		isLoading = false;
	});

	// Add a function to check if we should show navigation
	function shouldShowNavigation(path: string): boolean {
		// Show navigation if not loading and either not a public route or is the apps page
		return (!PUBLIC_ROUTES.includes(path) || path === ROUTES.APP.APPS) && !isLoading;
	}

	// Track route changes for transitions
	let key = $page.url.pathname;
	$: key = $page.url.pathname;
</script>

{#if !isLoading}
	<main class="main-content">
		{#key key}
			<div >
				<slot />
			</div>
		{/key}
	</main>
	{#if shouldShowNavigation($page.url.pathname)}
		<Navigation />
	{/if}
{:else}
	<div class="loading" in:fade>
		<div class="spinner"></div>
		<div class="text">Loading...</div>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		margin-bottom: 1rem;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #3498db;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.text {
		font-size: 1.2rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.main-content {
		padding-bottom: 80px; /* Space for navigation */
		min-height: 100vh;
		background: #f9f9f9;
	}
</style>