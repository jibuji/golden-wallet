<script lang="ts">
    import { walletStore } from '$lib/stores/wallet-store';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    
    let mnemonic = '';
    let verificationWords: string[] = [];
    let selectedIndices: number[] = [];
    let isVerifying = false;
    let error = '';

    onMount(() => {
        const state = get(walletStore);
        if (!state.mnemonic) {
            goto('/setup/password');
            return;
        }
        mnemonic = state.mnemonic;
        
        // Select 3 random words for verification
        const words = mnemonic.split(' ');
        while (selectedIndices.length < 3) {
            const index = Math.floor(Math.random() * words.length);
            if (!selectedIndices.includes(index)) {
                selectedIndices.push(index);
            }
        }
    });

    function startVerification() {
        isVerifying = true;
    }

    function verifyMnemonic() {
        const words = mnemonic.split(' ');
        for (let i = 0; i < selectedIndices.length; i++) {
            if (verificationWords[i] !== words[selectedIndices[i]]) {
                error = 'Incorrect words. Please verify your backup.';
                return;
            }
        }
        
        walletStore.confirmMnemonic();
        goto('/wallet');
    }
</script>

<div class="container">
    {#if !isVerifying}
        <h1>Backup Your Recovery Phrase</h1>
        <p class="warning">
            Write down these 24 words in order and keep them safe. 
            This is your wallet's backup phrase. Never share it with anyone.
        </p>

        <div class="mnemonic-grid">
            {#each mnemonic.split(' ') as word, i}
                <div class="word">
                    <span class="number">{i + 1}.</span>
                    <span class="text">{word}</span>
                </div>
            {/each}
        </div>

        <button on:click={startVerification}>
            I've Written Down My Recovery Phrase
        </button>
    {:else}
        <h1>Verify Your Backup</h1>
        <p>Please enter the following words from your recovery phrase:</p>

        {#each selectedIndices as index, i}
            <div class="field">
                <label>Word #{index + 1}</label>
                <input
                    type="text"
                    bind:value={verificationWords[i]}
                    placeholder={`Enter word #${index + 1}`}
                />
            </div>
        {/each}

        {#if error}
            <div class="error">{error}</div>
        {/if}

        <button on:click={verifyMnemonic}>
            Verify Recovery Phrase
        </button>
    {/if}
</div>

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }

    .warning {
        color: #ff4444;
        font-weight: bold;
        margin-bottom: 1rem;
    }

    .mnemonic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 4px;
    }

    .word {
        padding: 0.5rem;
        background: white;
        border-radius: 4px;
    }

    .number {
        color: #666;
        margin-right: 0.5rem;
    }

    .field {
        margin-bottom: 1rem;
    }

    .error {
        color: red;
        margin-bottom: 1rem;
    }

    button {
        width: 100%;
        padding: 0.75rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
</style>