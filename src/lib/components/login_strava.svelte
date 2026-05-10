<script lang="ts">
	import { resolve } from '$app/paths';
	import Fa from 'svelte-fa';
	import { faStrava } from '@fortawesome/free-brands-svg-icons';
	import type { ConnectedAccount } from '$lib/server/auth';
	import { formatExpiry } from '../index';

	let { strava } : { strava: ConnectedAccount | null } = $props();

</script>

<div>
	{#if strava}
        <div class="flex items-center justify-between rounded bg-red-600 px-4 py-2 text-sm font-medium text-white">
            <div class="flex items-center gap-2">
                <Fa icon={faStrava} class="text-xl" />
				<span>{strava.displayName}</span>
            </div>

			<a href={resolve('/auth/strava/logout')} class="underline">
				Logout
			</a>
        </div>
	{:else}
        <a
            href={resolve('/auth/strava')}
            class="inline-flex items-center justify-between rounded bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 w-full"
        >
			<span>Connect Strava</span>
            <Fa icon={faStrava} class="text-2xl" />
        </a>
	{/if}
</div>