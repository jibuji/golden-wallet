<script lang="ts">
    import { walletStore } from '$lib/stores/wallet-store';
    import { goto } from '$app/navigation';
	import { validateMnemonic } from '$lib/wallet-key-utils';
	import { wordlist } from '@scure/bip39/wordlists/english';
    
    let mnemonic = '';
    let password = '';
    let confirmPassword = '';
    let error = '';
    let isLoading = false;
    let wordCount = 0;

    $: {
        // Update word count whenever mnemonic changes
        const words = mnemonic.trim().split(/\s+/);
        wordCount = words.length > 0 && words[0] !== '' ? words.length : 0;
    }

    $: isScanning = $walletStore.isScanning;
    $: scanProgress = $walletStore.scanProgress;

    function validateMnemonicPhase(phrase: string): string | null {
        const words = phrase.trim().split(/\s+/);
        
        if (words.length !== 24) {
            return `Please enter 24 words (currently: ${wordCount})`;
        }

        // Check if all words are in the BIP39 word list
        const invalidWords = words.filter(word => !wordlist.includes(word));
        if (invalidWords.length > 0) {
            return `Invalid word(s): ${invalidWords.join(', ')}`;
        }
        console.log("validateMnemonic phrase:", phrase);
        if (!validateMnemonic(phrase)) {
            return 'Invalid recovery phrase checksum';
        }

        return null;
    }

    async function handleSubmit() {
        error = '';
        
        // Validate mnemonic first
        const mnemonicError = validateMnemonicPhase(mnemonic);
        if (mnemonicError) {
            error = mnemonicError;
            return;
        }

        if (password.length < 8) {
            error = 'Password must be at least 8 characters long';
            return;
        }
        
        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }

        isLoading = true;

        try {
            const success = await walletStore.restoreWallet(mnemonic, password);
            if (success) {
                goto('/wallet');
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to restore wallet';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="container">
    <h1>Restore Wallet</h1>
    <p>Enter your 24-word recovery phrase and create a new unlocking password.</p>

    <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
            <label for="mnemonic">
                Recovery Phrase 
                <span class="word-count">({wordCount}/24 words)</span>
            </label>
            <textarea
                id="mnemonic"
                bind:value={mnemonic}
                placeholder="Enter your 24-word recovery phrase, separated by spaces"
                required
                rows="4"
                class:invalid={wordCount > 0 && wordCount !== 24}
            />
            <small>Enter all 24 words in order, separated by spaces</small>
        </div>

        <div class="field">
            <label for="password">New Unlocking Password</label>
            <input
                type="password"
                id="password"
                bind:value={password}
                placeholder="Enter new unlocking password"
                required
                minlength="8"
            />
            <small>Password must be at least 8 characters long</small>
        </div>

        <div class="field">
            <label for="confirm-password">Confirm Password</label>
            <input
                type="password"
                id="confirm-password"
                bind:value={confirmPassword}
                placeholder="Confirm password"
                required
            />
        </div>

        {#if error}
            <div class="error">{error}</div>
        {/if}

        <button type="submit" disabled={isLoading}>
            {isLoading ? 'Restoring Wallet...' : 'Restore Wallet'}
        </button>
    </form>
</div>

{#if isScanning}
    <div class="scan-overlay">
        <div class="scan-content">
            <h3>Setting up your wallet...</h3>
            {#if scanProgress}
                <div class="progress-info">
                    <p class="progress-text">
                        Scanning wallet: {(scanProgress.progress * 100).toFixed(1)}%
                    </p>
                    {#if scanProgress.duration}
                        <p class="duration-text">
                            Duration: {Math.round(scanProgress.duration)}s
                        </p>
                    {/if}
                </div>
            {/if}
            {#if $walletStore.serverError?.tips}
                <div class="tips">
                    {#each $walletStore.serverError.tips as tip}
                        <p class="tip">{tip}</p>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }

    .field {
        margin-bottom: 1.5rem;
    }

    .word-count {
        color: #666;
        font-size: 0.9em;
    }

    .error {
        color: red;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: #ffebee;
        border-radius: 4px;
    }

    textarea, input {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.25rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    textarea.invalid {
        border-color: #f44336;
    }

    textarea {
        resize: vertical;
    }

    small {
        display: block;
        color: #666;
        margin-top: 0.25rem;
        font-size: 0.85em;
    }

    button {
        width: 100%;
        padding: 0.75rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .scan-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .scan-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 400px;
    }

    .progress-info {
        margin: 1rem 0;
    }

    .progress-text {
        font-size: 1.1rem;
        color: #4CAF50;
        margin: 0.5rem 0;
    }

    .duration-text {
        font-size: 0.9rem;
        color: #666;
        margin: 0.25rem 0;
    }

    .tips {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(33, 150, 243, 0.1);
        border-radius: 8px;
    }

    .tip {
        margin: 0.5rem 0;
        color: #666;
        font-size: 0.9rem;
    }
</style>