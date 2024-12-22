<script lang="ts">
    import { page } from '$app/stores';
    
    const navItems = [
        { path: '/wallet', icon: '💰', label: 'Wallet' },
        { path: '/bridge', icon: '🔗', label: 'Bridge' },
        { path: '/mine', icon: '⛏️', label: 'Mine' },
        { path: '/apps', icon: '📱', label: 'Apps' }
    ];

    $: currentPath = $page.url.pathname;
    $: activeSection = navItems.find(item => currentPath.startsWith(item.path))?.path || '/wallet';
</script>

<nav class="navigation">
    <div class="nav-container">
        {#each navItems as item}
            <a 
                href={item.path}
                class="nav-item"
                class:active={currentPath.startsWith(item.path)}
            >
                <span class="icon">{item.icon}</span>
                <span class="label">{item.label}</span>
            </a>
        {/each}
    </div>
</nav>

<style>
    .navigation {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        z-index: 100;
    }

    .nav-container {
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        justify-content: space-around;
        padding: 0.5rem;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem;
        text-decoration: none;
        color: #666;
        transition: all 0.2s ease;
        border-radius: 8px;
        min-width: 64px;
    }

    .nav-item:hover {
        background: #f5f5f5;
    }

    .nav-item.active {
        color: #2196F3;
        background: #e3f2fd;
    }

    .icon {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 500;
    }
</style> 