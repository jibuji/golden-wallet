<script lang="ts">
    export let text: string;
    export let buttonClass = '';

    let copied = false;
    let timeoutId: NodeJS.Timeout;

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
            
            // Reset the copied state after 2 seconds
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
</script>

<button 
    class={`copy-button ${buttonClass} ${copied ? 'copied' : ''}`} 
    on:click={copyToClipboard}
    title="Copy to clipboard"
>
    {#if copied}
        ✓
    {:else}
        📋
    {/if}
</button>

<style>
    .copy-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 4px;
        font-size: 1em;
        transition: all 0.2s;
        border-radius: 4px;
    }

    .copy-button:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .copy-button.copied {
        color: #4CAF50;
    }
</style> 