<script lang="ts">
	import { fade } from "svelte/transition";

    export let message: string | undefined = undefined;
</script>

<div class="overlay" transition:fade>
    <div class="content">
        <div class="spinner"></div>
        {#if message}
            <div class="message">{message}</div>
        {:else}
            <slot />
        {/if}
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .content {
        text-align: center;
    }

    .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 1rem;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .message {
        color: #333;
        font-size: 1.1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style> 