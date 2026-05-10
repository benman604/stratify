<script lang="ts">
    import Stratify from '$lib/assets/Stratify.svg';
    import StratifyIcon from '$lib/assets/Stratify_icon.svg';
    import LoginSpotify from '$lib/components/login_spotify.svelte';
	import LoginStrava from '$lib/components/login_strava.svelte';
	import ActivitiesList from '$lib/components/activities_list.svelte';
	import Map from '../lib/components/map.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formatExpiry = (expiresAt: number) =>
		new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(expiresAt));
</script>

<main class="w-full h-screen flex flex-col overflow-hidden">
	<header class="w-full px-4">
        <div class="">
            <!-- <img src="{StratifyIcon}" alt="Stratify icon" class="h-14 w-auto py-2 text-center content-center" /> -->
            <img src="{Stratify}" alt="Stratify logo" class="h-14 w-auto py-2 text-center content-center" />
        </div>

        {#if data.authError}
            <p class="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {data.authError}
            </p>
        {/if}
	</header>

	<div class="flex flex-1 min-h-0 overflow-hidden">

		<section class="w-64 pt-0 px-4 pb-4 h-full min-h-0">
			<div class="h-full w-full flex flex-col min-h-0">
				<LoginStrava strava={data.strava} />

				<div class="mt-3 flex-1 min-h-0 overflow-y-auto">
					{#if data.strava}
						<ActivitiesList activities={data.routes} />
					{:else}
						<p class="text-sm text-gray-700">
							Sign in with Strava to see your activities and routes here.
						</p>
					{/if}
				</div>
			</div>
        </section>

		<section class="flex-1 min-h-0">
			<div class="flex flex-col h-full">
				<div class="h-full w-full flex-1">
					<Map routes={data.routes}></Map>
				</div>
				<div class="w-full h-50 py-4">
					<div class="w-full h-full rounded-lg bg-gray-200 p-4">
						<p class="text-sm text-gray-700">
							Elevation profiles and route details go here.
						</p>
					</div>
				</div>
			</div>
        </section>

        <section class="w-64 pt-0 px-4 pb-4 h-full min-h-0">
			<div class="h-full w-full flex flex-col min-h-0">
				<LoginSpotify spotify={data.spotify} />

				{#if data.spotify}
					<div class="mt-3 p-2 bg-olive-100 flex-1 rounded-lg mb-3">
						<p class="text-sm text-gray-700">
							Spotify playlist goes here.
						</p>
					</div>

					<div class="p-2 bg-olive-100 flex-1 rounded-lg mb-3">
						<p class="text-sm text-gray-700">
							Spotify content search goes here.
						</p>
					</div>

					<div class="p-2 bg-green-400 text-white h-16 rounded-lg">
						<p>
							Spotify playback integration goes here.
						</p>
					</div>
				{:else}
					<p class="text-sm text-gray-700">
						Sign in with Spotify to see music recommendations based on your activities.
					</p>
				{/if}
			</div>
        </section>

    </div>
</main>
