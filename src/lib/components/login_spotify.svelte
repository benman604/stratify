<script lang="ts">
	import { resolve } from '$app/paths';

    import Fa from 'svelte-fa';
    import { faSpotify } from '@fortawesome/free-brands-svg-icons';

	import type { ConnectedAccount } from '$lib/server/auth';
    import { formatExpiry } from '../index';

	let { spotify } : { spotify: ConnectedAccount | null } = $props();

</script>

<div>
	{#if spotify}
        <div class="flex items-center justify-between rounded bg-green-600 px-4 py-2 text-sm font-medium text-white">
            <div class="flex items-center gap-2">
                <Fa icon={faSpotify} class="text-xl" />
                <span>{spotify.displayName}</span>
            </div>

            <a href={resolve('/auth/spotify/logout')} class="underline">
                Logout
            </a>
        </div>
	{:else}
        <a
            href={resolve('/auth/spotify')}
            class="inline-flex items-center justify-between rounded bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 w-full"
        >
            <Fa icon={faSpotify} class="text-2xl" />
            <span>Connect Spotify</span>
        </a>
	{/if}
</div>
