<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		if (window.location.pathname === '/') {
			goto('/wallet');
		}
	});
</script>

<h1>Starting, please wait a moment...</h1>

<style>
	h1 {
		color: #333;
	}
</style>
