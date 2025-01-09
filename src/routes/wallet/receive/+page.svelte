<script lang="ts">
	import type { AddrType, IAddressInfo } from '$lib/types';
	import {
		getAddressInfo,
		getAddressesByLabel,
		getNewAddress,
		listLabels
	} from '$lib/wallet-utils';
	import { curWalletStore } from '$lib/store';
	import { getShorter } from '$lib/utils';
	let addressType: AddrType = 'bech32';
	let label = '';
	let addresses: IAddressInfo[] = [];
	let addressTypes: AddrType[] = ['p2sh-segwit', 'bech32', 'bech32m'];
	let curWallet: string;
	$: {
		curWallet = $curWalletStore;
		loadAddresses(curWallet);
	}

	function isAddrLoaded(addr: string) {
		return addresses.some((a) => a.address === addr && a.timestamp);
	}

	async function loadAddressesForLabel(wallet: string, label: string) {
		const labeledAddrs:IAddressInfo[] = [] ;
		const addrs = (await getAddressesByLabel(wallet, label)) || [];
		for (const addr of addrs) {
			if (isAddrLoaded(addr)) {
				continue;
			}
			const addrInfo = await getAddressInfo(wallet, addr);
			labeledAddrs.push(addrInfo);
		}
		//force update
		return labeledAddrs;
	}

	async function loadAddresses(wallet: string) {
		//1. loadlabels of current wallet
		//2. load addresses for each label of current wallet
		//3. get addresses info for each address
		let newAddrs: IAddressInfo[] = [];
		try {
			const labels = await listLabels(wallet);
			for (const label of labels) {
				const a = await loadAddressesForLabel(wallet, label);
				newAddrs = [...newAddrs, ...a];
			}
			// sort addresses by timestamp decending
			newAddrs.sort((a, b) => b.timestamp - a.timestamp);
			addresses = newAddrs;
		} catch (e) {
			console.error('Error loading addresses:', e);
		}
	}

	async function generateAddress() {
		console.log('generateAddress', addressType, label);
		const addr = await getNewAddress(curWallet, label, addressType);
		console.log('generateAddress new address:', addr);
		const addrInfo = await getAddressInfo(curWallet, addr);
		addresses = [addrInfo, ...addresses];
	}

	function copyAddress(address: string) {
		navigator.clipboard.writeText(address);
	}


	function formatAddress(address: string) {
        return getShorter(address);
    }

	// for address table pagination
	let currentPage = 1;
	const itemsPerPage = 10;
	let paginatedAddresses: IAddressInfo[];
	let totalPages: number;
    $: {
        totalPages = Math.ceil(addresses.length / itemsPerPage);
    }

	$: {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedAddresses = addresses.slice(start, end);
	}

	function nextPage() {
		if (currentPage * itemsPerPage < addresses.length) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

</script>

<div class="wrapper">
	<form on:submit|preventDefault={generateAddress}>
		<div>
			<span>Address Type:</span>
			<select bind:value={addressType} required>
				<!-- Change this line -->
				<option disabled value="">Select an address type</option>
				{#each addressTypes as type}
					<!-- Add these lines -->
					<option>{type}</option>
				{/each}
			</select>
		</div>
		<div>
			<span>Label:</span>
			<input bind:value={label} required />
		</div>
		<button type="submit">Generate Address</button>
	</form>

	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>Type</th>
					<th>Label</th>
					<th>Address</th>
					<th>Copy</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedAddresses as { type, labels, address }, i}
					<tr>
						<td>{type}</td>
						<td>{labels.join(',')}</td>
						<td>{formatAddress(address)}</td>
						<td><button on:click={() => copyAddress(address)}>Copy</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="pagination">
			<button on:click={prevPage} disabled={currentPage === 1}>Previous</button>
			<span> {currentPage}/{totalPages} </span>
			<button on:click={nextPage} disabled={currentPage * itemsPerPage >= addresses.length}
				>Next</button
			>
		</div>
	</div>
</div>

<style>
	body {
		font-family: Arial, sans-serif;
		background-color: #f5f5f5;
		color: #333;
	}

	.wrapper {
		display: flex;
		gap: 30px;
		width: 100%;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
		max-width: 400px;
		padding: 25px;
		background-color: #fff;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	form div {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	form div span {
		font-weight: 600;
		margin-bottom: 8px;
		color: #333;
	}

	input,
	select {
		padding: 12px;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		font-size: 1rem;
		transition: all 0.2s ease;
		width: 100%;
		box-sizing: border-box;
	}

	input:focus,
	select:focus {
		border-color: #4CAF50;
		box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
		outline: none;
	}

	select {
		background-color: white;
		cursor: pointer;
	}

	button {
		padding: 12px 24px;
		border: none;
		border-radius: 6px;
		background-color: #4CAF50;
		color: white;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-size: 1rem;
		font-weight: 600;
		margin-top: 10px;
	}

	button:hover {
		background-color: #43A047;
	}

	.table-container {
		flex: 1;
		background-color: #fff;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 25px;
		min-width: 0; /* Prevents flex item from overflowing */
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
	}

	th,
	td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
		font-size: 0.95rem;
	}

	th {
		font-weight: 600;
		color: #333;
		background-color: #F5F5F5;
	}

	tr:hover {
		background-color: #F9F9F9;
	}

	td button {
		margin: 0;
		padding: 8px 16px;
		font-size: 0.9rem;
		background-color: #4CAF50;
	}

	td button:hover {
		background-color: #43A047;
	}

	.pagination {
		display: flex;
		justify-content: flex-end;
		gap: 15px;
		align-items: center;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #f0f0f0;
	}

	.pagination button {
		padding: 8px 16px;
		background-color: #4CAF50;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.95rem;
		margin: 0;
	}

	.pagination button:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
	}

	.pagination span {
		font-size: 1rem;
		color: #666;
		margin: 0 10px;
	}
</style>
