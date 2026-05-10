<script lang="ts">
    import Stratify from '$lib/assets/Stratify.svg';
    import StratifyIcon from '$lib/assets/Stratify_icon.svg';
    import LoginSpotify from '$lib/components/login_spotify.svelte';
	import LoginStrava from '$lib/components/login_strava.svelte';
	import Map from '../lib/components/map.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formatExpiry = (expiresAt: number) =>
		new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(expiresAt));
</script>

<main class="w-full min-h-screen flex flex-col">
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

    <div class="h-full w-full flex flex-1">

        <section class="w-64 p-4">
            <LoginStrava strava={data.strava} />
        </section>

        <section class="flex-1">
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

        <section class="w-64 p-4">
            <LoginSpotify spotify={data.spotify} />
        </section>

    </div>
</main>
