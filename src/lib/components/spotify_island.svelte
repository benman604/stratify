<script lang="ts">
	import { resolve } from '$app/paths';

    import Fa from 'svelte-fa';
    import { faSpotify } from '@fortawesome/free-brands-svg-icons';
    import { faSearch, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

	import type { ConnectedAccount } from '$lib/server/auth';

	let { spotify } : { spotify: ConnectedAccount | null } = $props();
    let searchQuery = $state('');

</script>

<div>
	{#if spotify}
        <div class="flex flex-wrap gap-2 items-center justify-between rounded bg-(--theme-spotify) px-4 py-2 text-sm font-medium text-white">
            <div class="flex min-w-0 items-center gap-1">
                <Fa icon={faSpotify} class="text-xl shrink-0" />

                <input
                    type="text"
                    name="search_spotify"
                    id="search_spotify"
                    placeholder="Search your music..."
                    autocomplete="off"
                    bind:value={searchQuery}
                    class="min-w-0 flex-1 rounded border border-transparent px-2 text-sm outline-none focus:ring-0"
                />

                <button class="cursor-pointer hover:text-red-300">
                    <Fa icon={faSearch} />
                </button>
            </div>

            <div class="flex justify-between items-center w-full">
                <!-- <a href={resolve('/auth/spotify/logout')} class="inline-flex items-center gap-1 text-[10px] cursor-pointer hover:text-green-300">
                    <Fa icon={faRightFromBracket} />
                    Logout
                </a> -->

                <div class="inline-flex items-center gap-1 text-[10px]">
                    <button class="cursor-pointer hover:text-green-300">
                        Playlists
                    </button>
                </div>

                <div class="ml-auto text-[10px] inline-flex items-center gap-2">
                    <button class="bg-white text-gray-500 p-0.5 rounded-md cursor-pointer hover:text-green-300">
                        Songs
                    </button>
                    <button class="cursor-pointer hover:text-green-300">
                        Albums
                    </button>
                    <button class="cursor-pointer hover:text-green-300">
                        Artists
                    </button>
                </div>
            </div>
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
