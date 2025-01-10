<script lang="ts">
    import { walletStore } from '$lib/stores/wallet-store';
    import { goto } from '$app/navigation';
    import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
    
    let password = '';
    let confirmPassword = '';
    let error = '';
    let isLoading = false;

    async function handleSubmit() {
        if (password.length < 8) {
            error = 'Password must be at least 8 characters long';
            return;
        }
        
        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const success = await walletStore.initializeWallet(password);
            if (success) {
                goto('/setup/mnemonic');
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create wallet';
        } finally {
            isLoading = false;
        }
    }

    function goToRestore() {
        goto('/restore');
    }
</script>

{#if isLoading}
    <LoadingOverlay>
        <div class="loading-content">
            {#if $walletStore.isScanning}
                <h3>Setting up your wallet...</h3>
                {#if $walletStore.scanProgress}
                    <div class="progress-info">
                        <p class="progress-text">
                            Scanning wallet: {($walletStore.scanProgress.progress * 100).toFixed(1)}%
                        </p>
                        {#if $walletStore.scanProgress.duration}
                            <p class="duration-text">
                                Duration: {Math.round($walletStore.scanProgress.duration)}s
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
            {:else}
                <h3>Creating wallet...</h3>
                <p class="info-text">Please wait while we set up your wallet</p>
            {/if}
        </div>
    </LoadingOverlay>
{/if}

<div class="container">
    <h1>Setup Wallet</h1>
    
    <div class="options">
        <div class="option">
            <h2>Create New Wallet</h2>
            <p>Set up a unlocking password to create a new wallet with a fresh recovery phrase.</p>

            <form on:submit|preventDefault={handleSubmit}>
                <div class="field">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        bind:value={password}
                        placeholder="Enter password"
                        required
                        minlength="8"
                    />
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
                    {isLoading ? 'Creating Wallet...' : 'Create New Wallet'}
                </button>
            </form>
        </div>

        <div class="divider">
            <span>OR</span>
        </div>

        <div class="option">
            <h2>Restore Existing Wallet</h2>
            <p>Already have a wallet? Restore it using your 24-word recovery phrase.</p>
            <button class="secondary" on:click={goToRestore}>
                Restore Existing Wallet
            </button>
        </div>
    </div>
</div>

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }

    .options {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .option {
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
    }

    .divider {
        position: relative;
        text-align: center;
        margin: 1rem 0;
    }

    .divider span {
        background: white;
        padding: 0 1rem;
        color: #6c757d;
        font-weight: 500;
    }

    .divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #dee2e6;
        z-index: -1;
    }

    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
    }

    .field {
        margin-bottom: 1rem;
    }

    .error {
        color: red;
        margin-bottom: 1rem;
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
    }

    button.secondary {
        background-color: #2196F3;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .loading-content {
        text-align: center;
        max-width: 400px;
        margin: 0 auto;
    }

    .loading-content h3 {
        margin: 0 0 1rem 0;
        color: #2196F3;
        font-size: 1.5rem;
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

    .info-text {
        color: #666;
        font-size: 1rem;
        margin: 0.5rem 0;
    }
</style>