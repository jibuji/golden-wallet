<!-- src/components/Modal.svelte -->
<script>
	export let message = '';
</script>

<div class="modal">
	<div class="modal-content">
		<p>{message}</p>
	</div>
</div>

<style>
	.modal {
		display: flex;
		justify-content: center;
		align-items: center;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
	}
	.modal-content {
		background-color: white;
		padding: 20px;
		border-radius: 5px;
		text-align: center;
	}
</style>
