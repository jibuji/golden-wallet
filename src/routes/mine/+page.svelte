<script lang="ts">
	import { ensureSidecarIsRunning, isSidecarRunning, sleep, stopSidecar } from '$lib/utils';
	import { onMount } from 'svelte';

	let threads = 1;
	let isRunning = false;
	let isInputVisible = true;

	onMount( () => {
	    let cancel = false;
		async function checkRunningLoop() {
			const nThreads = localStorage.getItem('threads');
			threads = nThreads && parseInt(nThreads) || 1;
	        isRunning = await isSidecarRunning("minerd");
	        for (;!cancel;) {
	            await sleep(10000);
	            isRunning = await isSidecarRunning("minerd");
	            console.log("get minerd running:", isRunning);
	        }
	    }
	    checkRunningLoop();
	    return () => (cancel = true);
	})



	async function startMining() {
		console.log('start mining with', threads, 'threads');
		await ensureSidecarIsRunning('minerd', threads);
		localStorage.setItem('threads', threads.toString());
		isRunning = true;
		isInputVisible = false;
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
			<button class="start-mining" on:click={startMining}>Start Mining</button>
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
		padding: 0px;
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
