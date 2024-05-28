<script lang="ts">
	import { ensureSidecarIsRunning, sleep } from '$lib/utils';
	import { getBlockchainInfo, getDefaultMinerAddr, listWallets } from '$lib/wallet-utils';
	import { onMount } from 'svelte';

	let miner_enabled = false;

	import type { LayoutData } from './$types';
	
	export let data: LayoutData;

	//log onMount event
	onMount(() => {
		console.log('onMount event');
		return () => console.log('onDestroy event');
	});
	// onMount(() => {
	//     let cancel = false;
	//     async function runEvery10Seconds() {
	//         // fetch data from the server
	//         for (;!cancel;) {
	//           const addr = await getDefaultMinerAddr();
	//           miner_enabled = !!addr;
	//           await ensureSidecarIsRunning("bitbid");
	//           await sleep(10000);
	//         }
	//     }

	//     runEvery10Seconds();
	//     return () => (cancel = true);
	// });
</script>

<main>
	<nav class="sidebar">
		<ul>
			<li class={data.location === '/' ? 'active':''}>
				<a href="/"> Welcome </a>
			</li>
			<li class={data.location === '/wallet' ? 'active':''}>
				<a href="/wallet"> Wallet </a>
			</li>
			<li class={data.location === '/mine' ? 'active':''}>
				<a href="/mine"> Mine </a>
			</li>
		</ul>
	</nav>

	<section class="main-content">
		<slot></slot>
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
		padding-left: 20px;
		padding-right: 20px;
		background-color: #f1f1f1;
	}
</style>
