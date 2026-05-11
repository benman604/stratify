<script lang="ts">
	import Stratify from '$lib/assets/Stratify.svg';
	import Activity from '$lib/components/activity.svelte';
	import LoginSpotify from '$lib/components/login_spotify.svelte';
	import LoginStrava from '$lib/components/login_strava.svelte';
	import ActivitiesList from '$lib/components/activities_list.svelte';
	import Map from '../lib/components/map.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let highlightedActivityId = $state<number | null>(null);
	let selectedActivityId = $state<number | null>(null);
	let selectedActivity = $derived.by(() => {
		if (!selectedActivityId) {
			return null;
		}

		return data.routes?.find((route) => route.id === selectedActivityId) ?? null;
	});
</script>

<main class="flex h-screen w-full flex-col overflow-hidden">
	<header class="w-full px-4">
		<div class="">
			<!-- <img src="{StratifyIcon}" alt="Stratify icon" class="h-14 w-auto py-2 text-center content-center" /> -->
			<img src={Stratify} alt="Stratify logo" class="h-14 w-auto content-center py-2 text-center" />
		</div>

		{#if data.authError}
			<p class="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
				{data.authError}
			</p>
		{/if}
	</header>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<section class="h-full min-h-0 w-64 px-4 pt-0 pb-4">
			<div class="flex h-full min-h-0 w-full flex-col">
				<LoginStrava strava={data.strava} />

				<div class="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
					{#if data.strava}
						{#if selectedActivity}
							<Activity
								activity={selectedActivity}
								onBack={() => {
									selectedActivityId = null;
									highlightedActivityId = null;
								}}
							/>
						{:else}
							<ActivitiesList
								activities={data.routes}
								{highlightedActivityId}
								{selectedActivityId}
								onActivityHover={(activityId) => (highlightedActivityId = activityId)}
								onActivityLeave={() => (highlightedActivityId = null)}
								onActivitySelect={(activityId) => {
									selectedActivityId = activityId;
									highlightedActivityId = activityId;
								}}
							/>
						{/if}
					{:else}
						<p class="text-sm text-gray-700">
							Sign in with Strava to see your activities and routes here.
						</p>
					{/if}
				</div>
			</div>
		</section>

		<section class="min-h-0 flex-1">
			<div class="flex h-full flex-col">
				<div class="h-full w-full flex-1">
					<Map
						routes={data.routes}
						{highlightedActivityId}
						{selectedActivityId}
					></Map>
				</div>
				<div class="h-50 w-full py-4">
					<div class="h-full w-full rounded-lg bg-gray-200 p-4">
						<p class="text-sm text-gray-700">Elevation profiles and route details go here.</p>
					</div>
				</div>
			</div>
		</section>

		<section class="h-full min-h-0 w-64 px-4 pt-0 pb-4">
			<div class="flex h-full min-h-0 w-full flex-col">
				<LoginSpotify spotify={data.spotify} />

				{#if data.spotify}
					<div class="mt-3 mb-3 flex-1 rounded-lg bg-olive-100 p-2">
						<p class="text-sm text-gray-700">Spotify playlist goes here.</p>
					</div>

					<div class="mb-3 flex-1 rounded-lg bg-olive-100 p-2">
						<p class="text-sm text-gray-700">Spotify content search goes here.</p>
					</div>

					<div class="h-16 rounded-lg bg-gray-800 p-2 text-gray-200">
						<p>Spotify playback integration goes here.</p>
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
