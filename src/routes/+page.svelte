<script lang="ts">
	import Stratify from '$lib/assets/Stratify.svg';
	import StratifyIcon from '$lib/assets/Stratify_icon.svg'
	import Activity from '$lib/components/activity.svelte';
	import ActivityProfile from '$lib/components/activity_profile.svelte';
	import SpotifyIsland from '$lib/components/spotify_island.svelte';
	import SpotifyPlayback from '$lib/components/spotify_playback.svelte';
	import StravaIsland from '$lib/components/strava_island.svelte';
	import ActivitiesList from '$lib/components/activities_list.svelte';
	import Map from '../lib/components/map.svelte';
	import type { PageData } from './$types';
	import Fa from 'svelte-fa';
	import { faSpotify, faStrava } from '@fortawesome/free-brands-svg-icons';
	import { heatStartColor, heatEndColor, getHighestDensityCenter, getHighestDensityColor, createHeatLayerData, decodePolyline } from '$lib/components/map_heat_layer';
	import { faGasPump } from '@fortawesome/free-solid-svg-icons';
	import { iconBySportType } from '$lib/types/activity_icons';
	import { getActivitySportType } from '$lib/types/strava';

	const heatmapGradient = `linear-gradient(90deg, rgba(${heatStartColor.join(',')}, 0.3), rgb(${heatEndColor.join(',')}))`;

	let { data }: { data: PageData } = $props();
	let highlightedActivityId = $state<number | null>(null);
	let selectedActivityId = $state<number | null>(null);
	let hoverLatLng = $state<[number, number] | null>(null);

	// Filter state
	let searchQuery = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sortBy = $state<'date' | 'distance' | 'duration'>('date');
	let sortAscending = $state(false);
	let selectedSports = $state<string[]>(Object.keys(iconBySportType));

	let selectedActivity = $derived.by(() => {
		if (!selectedActivityId) {
			return null;
		}

		// Return detailed activity if fetched, otherwise return summary
		let selection = data.routes?.find((route) => route.id === selectedActivityId) ?? null;
		return selection;
	});

	let filteredActivities = $derived.by(() => {
		if (!data.routes) return [];

		let filtered = [...data.routes];

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(route => 
				route.name.toLowerCase().includes(query) ||
				route.title?.toLowerCase().includes(query)
			);
		}

		// Filter by date range
		if (dateFrom) {
			const fromDate = new Date(dateFrom);
			filtered = filtered.filter(route => new Date(route.startTime) >= fromDate);
		}

		if (dateTo) {
			const toDate = new Date(dateTo);
			// Set time to end of day
			toDate.setHours(23, 59, 59, 999);
			filtered = filtered.filter(route => new Date(route.startTime) <= toDate);
		}

		// Filter by activity types
		if (selectedSports.length > 0) {
			filtered = filtered.filter(route => {
				const sportType = getActivitySportType(route);
				return selectedSports.includes(sportType);
			});
		}

		// Sort activities
		filtered.sort((a, b) => {
			let comparison = 0;
			
			if (sortBy === 'date') {
				comparison = new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
			} else if (sortBy === 'distance') {
				comparison = b.distanceMeters - a.distanceMeters;
			} else if (sortBy === 'duration') {
				comparison = b.durationSeconds - a.durationSeconds;
			}

			return sortAscending ? -comparison : comparison;
		});

		return filtered;
	});

	let heatLayerData = $derived.by(() => {
		if (!filteredActivities || filteredActivities.length === 0) {
			return null;
		}
		const routeGeometries = filteredActivities.map(route => ({
			route,
			points: decodePolyline(route.summaryPolyline)
		}));
		return createHeatLayerData(routeGeometries);
	});

	let highestDensityColor = $derived(heatLayerData ? getHighestDensityColor(heatLayerData) : null);
	let highestDensityCount = $derived.by(() => {
		if (!heatLayerData) return 0;
		let maxCount = 0;
		for (const cell of heatLayerData.cellsByKey.values()) {
			maxCount = Math.max(maxCount, cell.routeIds.size);
		}
		return maxCount;
	});

	function handleActivitySelect(activityId: number) {
		selectedActivityId = activityId;
		highlightedActivityId = activityId;
	}
</script>

<main class="flex h-screen w-full flex-col overflow-hidden">
	<header class="w-full px-4">
		<div class="grid grid-cols-3 items-center py-2">
			<div class="justify-self-start w-auto">
				<img
					src={Stratify}
					alt="Stratify logo"
					class="h-7 w-auto justify-self-center"
				/>
			</div>

			<div class="w-auto justify-self-center">
				<!-- <img
					src={StratifyIcon}
					alt="Stratify logo"
					class="h-7"
				/> -->
			</div>

			<div class="justify-self-end w-auto">
				<div class="flex gap-4 text-blue-500">
					<button class="hover:underline cursor-pointer">
						File
					</button>
					<button class="hover:underline cursor-pointer">
						Import
					</button>
					<button class="hover:underline cursor-pointer">
						Share
					</button>
					<button class="hover:underline cursor-pointer">
						Settings
					</button>

				</div>
			</div>
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
				{#if !selectedActivity}
					<div>
						<StravaIsland 
							strava={data.strava}
							routes={data.routes}
							bind:searchQuery
							bind:dateFrom
							bind:dateTo
							bind:sortBy
							bind:sortAscending
							bind:selectedSports
						/>
					</div>
				{/if}

				<div class="no-scrollbar min-h-0 flex-1 overflow-y-auto">
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
								activities={filteredActivities}
								{highlightedActivityId}
								{selectedActivityId}
								onActivityHover={(activityId) => (highlightedActivityId = activityId)}
								onActivityLeave={() => (highlightedActivityId = null)}
								onActivitySelect={handleActivitySelect}
							/>
						{/if}
					{:else}
						<p class="text-sm text-gray-700 mt-3">
							Sign in with Strava to see your activities here.
						</p>
					{/if}
				</div>
			</div>
		</section>

		<section class="min-h-0 flex-1">
			<div class="flex h-full flex-col">
				<div class="h-full w-full flex-1">
					<Map
						routes={filteredActivities}
						{highlightedActivityId}
						{selectedActivityId}
						{hoverLatLng}
						onActivityHover={(activityId) => (highlightedActivityId = activityId)}
						onActivityLeave={() => (highlightedActivityId = null)}
						onActivitySelect={handleActivitySelect}
					></Map>
				</div>
				<div class="h-50 w-full py-4">
					<!-- {#if selectedActivity}
						<div class="h-full w-full rounded-lg bg-gray-200 p-2">
							<ActivityProfile activity={selectedActivity} onHoverPoint={(loc) => hoverLatLng = loc} />
						</div>
					{:else} -->
						<div class="flex h-full w-full flex-col">
							<div class="flex flex-1 gap-3">
								<!-- LEFT -->
								<div class="flex w-64 flex-col gap-3 rounded-lg bg-gray-100 p-4">
									<div class="shrink-0">
										<p class="text-sm mb-2">Activity Frequency</p>
										<div
											class="h-4 rounded-full border-4 border-gray-50"
											style={`background: ${heatmapGradient};`}
										></div>

										<div class="flex justify-between text-xs text-zinc-400">
											<span>1 activity</span>
											<span>{highestDensityCount} activities</span>
										</div>
									</div>

									<div class="flex-1">
										<p class="text-xs">Explore other heatmaps</p>

										<div class="flex flex-row flex-wrap gap-x-3 gap-y-0 items-start mt-2">
											<button class="cursor-pointer text-sm text-blue-500 hover:text-blue-700">
												Average pace
											</button>
											
											<button class="cursor-pointer text-sm text-blue-500 hover:text-blue-700">
												Elevation gain
											</button>

											<button class="cursor-pointer text-sm text-blue-500 hover:text-blue-700">
												Time of day
											</button>

											<button class="cursor-pointer text-sm text-blue-500 hover:text-blue-700">
												Activity Recency
											</button>
										</div>
									</div>
								</div>

								<!-- RIGHT -->
								<div class="flex flex-1 items-center justify-center rounded-lg bg-gray-100 p-4">
									{#if selectedActivity}
										<ActivityProfile activity={selectedActivity} onHoverPoint={(loc) => hoverLatLng = loc} />
									{:else}
										<p class="text-center text-sm text-gray-700">
											Select an activity to see its profile here.
										</p>
									{/if}
								</div>

							</div>


						</div>
					<!-- {/if} -->
				</div>
			</div>
		</section>

		<section class="h-full min-h-0 w-64 px-4 pt-0 pb-4">
			<div class="flex h-full min-h-0 w-full flex-col">
				<div class="flex shrink-0 flex-col rounded-lg bg-olive-100">
					<SpotifyIsland spotify={data.spotify} />
					
					{#if data.spotify}
						<div class="p-2">
							<p class="text-sm text-gray-700">Playlist 1</p>
						</div>
					{/if}
				</div>

				<div class="flex flex-1 flex-col rounded-lg bg-olive-100 mt-3">
					{#if data.spotify}
						<div class="mt-auto">
							<SpotifyPlayback />
						</div>
					{/if}
				</div>

				<!-- {#if data.spotify}
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
					<p class="text-sm text-gray-700 mt-3">
						Sign in with Spotify to sync your playlists.
					</p>
				{/if} -->
			</div>
		</section>
	</div>
</main>
