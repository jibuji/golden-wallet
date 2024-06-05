<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		if (window.location.pathname === '/') {
			goto('/wallet/');
		}
	});
</script>

<h1>welcome1</h1>
