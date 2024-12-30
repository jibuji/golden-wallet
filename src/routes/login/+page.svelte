<script lang="ts">
    import { walletStore } from '$lib/stores/wallet-store';
    import { goto } from '$app/navigation';
    import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
    
    let password = '';
    let isLoading = false;

    $: showRestoreOption = $walletStore.failedAttempts >= 3;
    $: serverError = $walletStore.serverError;
    $: error = $walletStore.error;

    $: console.log("login serverError: ", serverError);

    async function handleSubmit() {
        isLoading = true;

        try {
            const success = await walletStore.unlockWallet(password);
            if (success) {
                goto('/wallet');
            }
        } catch (e) {
            console.error('Unlock error:', e);
        } finally {
            isLoading = false;
        }
    }

    function goToRestore() {
        goto('/restore');
    }
</script>

{#if isLoading}
    <LoadingOverlay message="Unlocking wallet..." />
{/if}

<div class="container">
    <h1>Unlock Wallet</h1>
    <p>Enter your password to unlock your wallet.</p>

    <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
            <label for="password">Password</label>
            <input
                type="password"
                id="password"
                bind:value={password}
                placeholder="Enter your password"
                required
            />
        </div>

        {#if error || serverError}
            <div class="error">
                {#if error}
                    <p class="error-message">{error}</p>
                {/if}
                {#if serverError}
                    <div class="error-tips">
                        <p class="error-title">{serverError.message}</p>
                        <ul>
                            {#each serverError.tips as tip}
                                <li>{tip}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        {/if}

        <button type="submit" disabled={isLoading}>
            {isLoading ? 'Unlocking...' : 'Unlock Wallet'}
        </button>

        {#if showRestoreOption}
            <div class="restore-section">
                <p>Too many failed attempts?</p>
                <button type="button" class="secondary" on:click={goToRestore}>
                    Restore Using Recovery Phrase
                </button>
            </div>
        {/if}
    </form>
</div>

<style>
    .container {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
    }

    .field {
        margin-bottom: 1rem;
    }

    .error {
        color: #d32f2f;
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: #ffebee;
        border-radius: 4px;
        border: 1px solid #ffcdd2;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.25rem;
        border: 1px solid #ccc;
        border-radius: 4px;
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
        margin-bottom: 1rem;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .restore-section {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
        text-align: center;
    }

    .restore-section p {
        color: #666;
        margin-bottom: 1rem;
    }

    button.secondary {
        background-color: #2196F3;
    }

    .error-message {
        margin: 0 0 0.5rem 0;
        font-weight: 500;
    }

    .error-tips {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid #ffcdd2;
    }

    .error-title {
        font-weight: 600;
        margin: 0 0 0.5rem 0;
    }

    .error-tips ul {
        margin: 0;
        padding-left: 1.5rem;
        list-style-type: disc;
    }

    .error-tips li {
        margin: 0.25rem 0;
        color: #666;
        font-size: 0.9rem;
    }
</style>