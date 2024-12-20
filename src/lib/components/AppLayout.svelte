<script lang="ts">
    export let title: string;
</script>

<div class="app-layout">
    <header class="header">
        <h1>{title}</h1>
    </header>
    <div class="content">
        <slot />
    </div>
</div>

<style>
    .app-layout {
        max-width: 800px;
        margin: 0 auto;
        padding: 1rem;
    }

    .header {
        padding: 1rem 0;
        margin-bottom: 1rem;
        border-bottom: 1px solid #eee;
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #333;
    }

    .content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        padding: 1rem;
    }
</style> 