<script lang="ts">
    import { WebviewWindow, getAll } from '@tauri-apps/api/window';
    import { getVersion } from '@tauri-apps/api/app';

    $: {
        console.log('Apps page loaded');
    }
    interface AppConfig {
        name: string;
        icon: string;
        description: string;
        color: string;
        url: string;
        width: number;
        height: number;
    }

    const apps: AppConfig[] = [
        {
            name: 'DEX',
            icon: '🔄',
            description: 'Decentralized Exchange',
            color: 'bg-blue-500',
            url: 'dex/index.html',
            width: 800,
            height: 600
        },
        {
            name: 'NFT Gallery',
            icon: '🖼️',
            description: 'View and manage your NFTs',
            color: 'bg-purple-500',
            url: 'nft-gallery/index.html',
            width: 900,
            height: 700
        },
        {
            name: 'Staking',
            icon: '📈',
            description: 'Stake your assets',
            color: 'bg-green-500',
            url: 'staking/index.html',
            width: 800,
            height: 600
        },
        {
            name: 'Bridge',
            icon: '🌉',
            description: 'Cross-chain bridge',
            color: 'bg-orange-500',
            url: 'bridge-app/index.html',
            width: 800,
            height: 600
        },
        {
            name: 'Explorer',
            icon: '🔍',
            description: 'Blockchain explorer',
            color: 'bg-indigo-500',
            url: 'explorer/index.html',
            width: 1000,
            height: 800
        },
        {
            name: 'Settings',
            icon: '⚙️',
            description: 'Wallet settings',
            color: 'bg-gray-500',
            url: 'settings/index.html',
            width: 700,
            height: 500
        }
    ];

    async function launchApp(app: AppConfig) {
        try {
            const timestamp = Date.now();
            const baseLabel = app.name.toLowerCase().replace(/\s+/g, '-');
            let label = `${baseLabel}-${timestamp}`;
            
            const windows = getAll();
            const existingAppWindow = windows.find(w => w.label.startsWith(baseLabel));
            
            if (existingAppWindow) {
                await existingAppWindow.setFocus();
                return;
            }

            // Update the URL construction
            const isDev = import.meta.env.DEV;
            const baseUrl = isDev ? 'http://localhost:5173' : '';
            const appUrl = `${baseUrl}/apps/${app.url}`;
            console.log('Launching app at:', appUrl);

            const webview = new WebviewWindow(label, {
                url: appUrl,
                title: app.name,
                width: app.width,
                height: app.height,
                resizable: true,
                decorations: true,
                center: true,
                focus: true
            });

            webview.once('tauri://created', () => {
                console.log(`Window ${label} created at ${appUrl}`);
            });

            webview.once('tauri://error', (e) => {
                console.error(`Error launching ${app.name}:`, e);
                alert(`Failed to launch ${app.name}`);
            });

        } catch (e) {
            console.error(`Error launching ${app.name}:`, e);
            alert(`Failed to launch ${app.name}`);
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Apps</h1>
    
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {#each apps as app}
            <button
                class="flex flex-col items-center p-6 rounded-xl transition-all duration-200 hover:scale-105 {app.color} hover:opacity-90"
                on:click={() => launchApp(app)}
            >
                <div class="text-4xl mb-2">{app.icon}</div>
                <h2 class="text-xl font-semibold text-white mb-1">{app.name}</h2>
                <p class="text-sm text-white/80 text-center">{app.description}</p>
            </button>
        {/each}
    </div>
</div>

<style>
    :global(body) {
        background-color: #f8fafc;
    }
</style> 