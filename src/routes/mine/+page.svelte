<script lang="ts">
	import { ensureMinerdIsRunning, isSidecarRunning, sleep, stopSidecar } from '$lib/utils';
	import { getMinerAddresses } from '$lib/wallet-utils';
	import { onMount } from 'svelte';

	let threads = 1;
	let isRunning = false;
	$: isInputVisible = !isRunning;
	let addresses:string[] = [];
	let curAddrPos = 0;
	var isSwitching = false;
	$: isReady = !!addresses.length;
	$: {
		console.log('isReady:', isReady);
		console.log('addresses:', addresses);
	}

	onMount( () => {
	    let cancel = false;
		async function checkRunningLoop() {
			//load saved threads number set on last time
			const nThreads = localStorage.getItem('threads');
			threads = nThreads && parseInt(nThreads) || 1;
			//generate a list of addresses for mining
			const N = 20;
			addresses = await getMinerAddresses(N);
			if (!addresses?.length) {
				return;
			}
	        isRunning = await isSidecarRunning("minerd");
	        for (;!cancel;) {
	            await sleep(10000);
				if (!isSwitching) {
	            	isRunning = await isSidecarRunning("minerd");
				}
	            console.log("get minerd running:", isRunning);
	        }
	    }
	    checkRunningLoop();
	    return () => (cancel = true);
	})

	async function switchMinerAddrLoop() {
		
		for (;isRunning;) {
			isSwitching = true;
			try {
				await stopSidecar('minerd');
				await ensureMinerdIsRunning(threads, addresses[curAddrPos]);
			}catch(e) {
				console.log('error switching miner address');
				console.error(e);
			} finally {
				isSwitching = false;
			}
			console.log('switched mining to address:', addresses[curAddrPos]);
			curAddrPos = (curAddrPos + 1) % addresses.length;
			await sleep(10*60*1000); //10 minutes
		}
	}

	async function startMining() {
		console.log('start mining with', threads, 'threads');
		localStorage.setItem('threads', threads.toString());
		isRunning = true;
		isInputVisible = false;
		switchMinerAddrLoop();
	}

	async function stopMining() {
		console.log('stop mining');
		await stopSidecar('minerd');
		isRunning = false;
		isInputVisible = true;
	}
</script>

<div class="main">
	<div class="status-section">
		{#if isRunning}
			<div class="status running">{`Miner working with ${threads} threads`}</div>
		{:else}
			<div class="status stopped">Miner stopped</div>
		{/if}
	</div>
	{#if isInputVisible}
		<div class="input-group">
			<label for="threads">Number of threads:</label>
			<input id="threads" type="number" min="1" bind:value={threads} />
		</div>
		<div class="button-group">
			<button class="start-mining" on:click={startMining} disabled={!isReady}>Start Mining</button>
		</div>
	{:else}
		<div class="button-group">
			<button class="stop-mining" on:click={stopMining}>Stop Mining</button>
		</div>
	{/if}
</div>

<style>
	.main {
		margin: 20px;
		font-family: Arial, sans-serif;
	}
	.status-section {
		margin-bottom: 30px;
		padding: 10px 0;
		border-radius: 5px;
	}
	.status {
		font-size: 2em;
		font-weight: bold;
	}
	.running {
		color: #4caf50; /* A more pleasing shade of green */
		background-color: #c8e6c9; /* Light green background */
	}
	.stopped {
		color: #f44336; /* A more pleasing shade of red */
		background-color: #ffcdd2; /* Light red background */
	}
	.input-group {
		margin-bottom: 20px;
	}

	.input-group input {
		width: 100px; /* Adjust as needed */
		height: 1.5em;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.button-group {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.button-group button {
		padding: 10px 20px;
		font-size: 1em;
		border: none;
		border-radius: 5px;
		color: white;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}
	.button-group button:disabled {
		background-color: #ccc;
		color: #888;
		cursor: not-allowed;
	}
	button.start-mining {
		background-color: #4caf50;
	}

	button.start-mining:hover {
		background-color: #45a049;
	}

	button.stop-mining {
		background-color: #f44336;
	}

	button.stop-mining:hover {
		background-color: #d32f2f;
	}
</style>
