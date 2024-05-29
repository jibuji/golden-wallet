<script lang="ts">
	import { ensureBitbidIsRunning, sleep } from '$lib/utils';
	import { MinerDefaultWallet, backupWallet, getBlockchainInfo, getDefaultMinerAddr, listWallets } from '$lib/wallet-utils';
	import { onMount } from 'svelte';
	import { save } from '@tauri-apps/api/dialog';

	let miner_enabled = false;

	import type { LayoutData } from './$types';
	import { toast } from '$lib/toast';

	export let data: LayoutData;

	//log onMount event

	onMount(() => {
		let cancel = false;
		async function runEvery10Seconds() {
			// fetch data from the server
			for (; !cancel; ) {
				const addr = await getDefaultMinerAddr();
				miner_enabled = !!addr;
				await ensureBitbidIsRunning();
				await sleep(10000);
			}
		}

		runEvery10Seconds();
		return () => (cancel = true);
	});
	async function backupWalletDialog() {
		// Add your backup wallet logic here
		console.log('Backup Wallet clicked');
		const filePath = await save({
			filters: [
				{
					name: 'Wallet',
					extensions: ['dat']
				}
			]
		});
		console.log('filePath:', filePath);
		if (!filePath) {
			console.log('No file path selected, cancelled');
			return;
		}
		await backupWallet(MinerDefaultWallet, filePath);
		toast('Wallet backed up successfully');
	}
</script>

<main>
	<nav class="sidebar">
		<ul>
			<li class={data.location === '/' ? 'active' : ''}>
				<a href="/"> Welcome </a>
			</li>
			<li class={data.location === '/wallet' ? 'active' : ''}>
				<a href="/wallet"> Wallet </a>
			</li>
			<li class={data.location === '/mine' ? 'active' : ''}>
				<a href="/mine"> Mine </a>
			</li>
		</ul>
	</nav>

	<section class="main-content">
		<div class="menu-bar">
			<ul>
				<li>
					<a href="#">File</a>
					<ul>
						<li><a href="#" on:click|preventDefault={backupWalletDialog}>Backup Wallet...</a></li>
						<!-- <li><a href="#">Submenu 2</a></li> -->
					</ul>
				</li>
				<!-- <li>
					<a href="#">about</a>
					<ul>
						<li><a href="#">Submenu 1</a></li>
						<li><a href="#">Submenu 2</a></li>
					</ul>
				</li> -->
			</ul>
		</div>
		<div class="content">
			<slot></slot>
		</div>
	</section>
</main>

<style>
	main {
		display: flex;
		height: 100vh;
		font-family: Arial, sans-serif;
	}

	nav.sidebar {
		background-color: #f8f9fa;
		width: 120px;
		padding: 20px;
		overflow: auto;
		padding: 1em;
	}

	nav.sidebar ul {
		list-style-type: none;
		padding: 0;
	}

	nav.sidebar ul li {
		margin-bottom: 1em;
	}

	nav.sidebar ul li a {
		color: #333;
		text-decoration: none;
	}

	nav.sidebar ul li a:hover {
		color: #007bff;
	}

	nav.sidebar ul li.active {
		background-color: #007bff;
		color: white;
		padding: 10px 5px;
		border-radius: 5px;
		transition: background-color 0.3s ease;
	}

	nav.sidebar ul li.active a {
		color: white;
		text-decoration: none;
	}

	nav.sidebar ul li.active:hover {
		background-color: #0056b3;
	}

	.main-content {
		flex: 1;
		padding: 0 4px;
		background-color: #f1f1f1;
	}

	.content {
		padding-left: 10px;
		padding-right: 10px;
	}
	
	.menu-bar ul {
		list-style-type: none;
		padding: 0;
		display: flex;
		justify-content: flex-start;
		background-color: #f8f9fa;
		border-radius: 5px;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		margin-block-start: 0px;
	}

	.menu-bar li {
		position: relative;
		padding: 10px 20px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.menu-bar li:hover {
		background-color: #e0e0e0;
	}

	.menu-bar li ul {
		display: none;
		position: absolute;
		top: 100%;
		left: 0;
		padding: 0;
		list-style-type: none;
		width: 15em;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		border-radius: 5px;
	}

	.menu-bar li ul li {
		padding: 10px 20px;
		background-color: #f8f9fa;
		transition: background-color 0.3s ease;
	}

	.menu-bar li ul li:hover {
		background-color: #e0e0e0;
	}

	.menu-bar li:hover ul {
		display: block;
	}

	.menu-bar a {
		text-decoration: none;
		color: #333;
		transition: color 0.3s ease;
	}

	.menu-bar a:hover {
		color: #007bff;
	}
</style>
