<script lang="ts">
	import { resolve } from '$app/paths';
	import Fa from 'svelte-fa';
	import { faStrava } from '@fortawesome/free-brands-svg-icons';
	import type { ConnectedAccount } from '$lib/server/auth';
	import { formatExpiry } from '../index';
	import { faFilter, faSearch, faXmark, faChevronDown, faChevronUp, faRightFromBracket, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
	import { slide } from 'svelte/transition';
	import { backOut, quartOut } from 'svelte/easing';
	import { iconBySportType } from '$lib/util/activity_icons';
	import type { Route } from '$lib/util/strava';
	import { getActivitySportType } from '$lib/util/strava';

	let { 
		strava,
		routes = [],
		searchQuery = $bindable(''),
		dateFrom = $bindable(''),
		dateTo = $bindable(''),
		sortBy = $bindable<'date' | 'distance' | 'duration'>('date'),
		sortAscending = $bindable(false),
		selectedSports = $bindable<string[]>([])
	}: { 
		strava: ConnectedAccount | null,
		routes?: Route[],
		searchQuery?: string,
		dateFrom?: string,
		dateTo?: string,
		sortBy?: 'date' | 'distance' | 'duration',
		sortAscending?: boolean,
		selectedSports?: string[]
	} = $props();

	// Compute distinct activity types from routes
	let distinctActivityTypes = $derived.by(() => {
		const types = new Set<string>();
		for (const route of routes) {
			const sportType = getActivitySportType(route);
			if (iconBySportType[sportType as keyof typeof iconBySportType]) {
				types.add(sportType);
			}
		}
		return Array.from(types).sort();
	});

	let filterOpen = $state(false);
	let activityTypesOpen = $state(false);

	let justOpenedActivityTypes = $state(false);

	function toggleFilter() {
		filterOpen = !filterOpen;

		if (!filterOpen) {
			activityTypesOpen = false;
		}
	}

	function setSortBy(field: 'date' | 'distance' | 'duration') {
		if (sortBy === field) {
			// Toggle ascending/descending
			sortAscending = !sortAscending;
		} else {
			// Switch to new field with default descending
			sortBy = field;
			sortAscending = false;
		}
	}

	function toggleActivityType(sportType: string) {
		// Special case: if all are selected, clicking one selects only that one
		if (justOpenedActivityTypes && selectedSports.length >= distinctActivityTypes.length) {
			selectedSports = [sportType];
		} else {
			// Normal toggle behavior
			if (selectedSports.includes(sportType)) {
				selectedSports = selectedSports.filter(s => s !== sportType);
			} else {
				selectedSports = [...selectedSports, sportType];
			}
		}

		justOpenedActivityTypes = false;
	}

	function toggleActivityTypes() {
		activityTypesOpen = !activityTypesOpen;
		if (activityTypesOpen) {
			// Just opened, set flag for special handling
			justOpenedActivityTypes = true;
		}
	}

	function selectAllActivityTypes() {
		selectedSports = [...distinctActivityTypes];
		justOpenedActivityTypes = false;
	}

	function selectNoActivityTypes() {
		selectedSports = [];
		justOpenedActivityTypes = false;
	}
</script>

<div>
	{#if strava}
		<div class="flex flex-wrap gap-2 items-center justify-between rounded bg-(--theme-strava) px-4 py-2 text-sm font-medium text-white">
			<div class="flex min-w-0 items-center gap-1">
				<Fa icon={faStrava} class="text-xl shrink-0" />

				<input
					type="text"
					name="search_strava"
					id="search_strava"
					placeholder="Search activities..."
					autocomplete="off"
					bind:value={searchQuery}
					class="min-w-0 flex-1 rounded border border-transparent px-2 text-sm outline-none focus:ring-0"
				/>

				<button class="cursor-pointer hover:text-red-300">
					<Fa icon={faSearch} />
				</button>
				<button class="cursor-pointer hover:text-red-300 ml-1 -translate-y-px" onclick={toggleFilter}>
					<Fa icon={(!filterOpen) ? faFilter : faXmark} />
				</button>
			</div>

			<!-- <div class="flex justify-between items-center w-full">
				<a href={resolve('/auth/strava/logout')} class="inline-flex gap-1 items-center text-[10px] cursor-pointer hover:text-red-300">
					<Fa icon={faRightFromBracket} />
					Logout
				</a>
				<button class="ml-auto inline-flex gap-1 items-center text-[10px] cursor-pointer hover:text-red-300" onclick={toggleFilter}>
					Filter
					<div class="translate-y--0.5">
						<Fa icon={filterOpen ? faXmark : faFilter} />
					</div>
				</button>
			</div> -->
			
			{#if filterOpen}
				<div class="w-full overflow-hidden filter border-t border-red-400 pt-2" 
					in:slide={{ duration: 300, easing: backOut }}
					out:slide={{ duration: 200, easing: quartOut}}
				>
					<div class="flex flex-col gap-2">
						<!-- Date Range -->
						<div>
							<div class="flex justify-between text-xs">
								<span>From</span>
								<span>To</span>
							</div>

							<div class="flex min-w-0 gap-4 text-[12px]">
								<input
									type="date"
									bind:value={dateFrom}
									class="min-w-0 w-full rounded outline-none border p-1 focus:ring-0"
								/>

								<input
									type="date"
									bind:value={dateTo}
									class="min-w-0 w-full rounded outline-none border p-1 focus:ring-0"
								/>
							</div>
						</div>
						<!-- /Date Range -->

						<!-- Sort By -->
						<div>
							<div class="flex justify-start text-xs">Sort by</div>
							<div class="daytime flex min-w-0 overflow-hidden rounded border border-red-300 text-[9px]">
								<button
									type="button"
									class="{sortBy === 'date' ? 'selected' : ''} min-w-0 flex-1 truncate border-r p-1 hover:bg-gray-200 cursor-pointer"
									onclick={() => setSortBy('date')}
								>
									<div class="flex flex-wrap justify-center text-[9px] font-bold">
										Date
										{#if sortBy === 'date' && sortAscending}
											<Fa icon={sortAscending ? faArrowUp : faArrowDown} class="ml-1 font-bold" />
										{:else if sortBy === 'date'}
											<Fa icon={faArrowDown} class="ml-1 font-bold" />
										{/if}
									</div>
								</button>
								<button
									type="button"
									class="{sortBy === 'distance' ? 'selected' : ''} min-w-0 flex-1 truncate border-r border-red-300 p-1 hover:bg-gray-200 cursor-pointer {sortBy === 'distance' ? 'bg-black text-white hover:bg-black' : 'bg-gray-200'}"
									onclick={() => setSortBy('distance')}
								>
									<div class="flex flex-wrap justify-center text-[9px] font-bold">
										Distance
										{#if sortBy === 'distance' && sortAscending}
											<Fa icon={sortAscending ? faArrowUp : faArrowDown} class="ml-1 font-bold" />
										{:else if sortBy === 'distance'}
											<Fa icon={faArrowDown} class="ml-1 font-bold" />
										{/if}
									</div>
								</button>
								<button
									type="button"
									class="{sortBy === 'duration' ? 'selected' : ''} min-w-0 flex-1 truncate border-r border-red-300 p-1 hover:bg-gray-200 cursor-pointer {sortBy === 'duration' ? 'bg-black text-white hover:bg-black' : 'bg-gray-200'}"
									onclick={() => setSortBy('duration')}
								>
									<div class="flex flex-wrap justify-center text-[9px] font-bold">
										Duration
										{#if sortBy === 'duration' && sortAscending}
											<Fa icon={sortAscending ? faArrowUp : faArrowDown} class="ml-1 font-bold" />
										{:else if sortBy === 'duration'}
											<Fa icon={faArrowDown} class="ml-1 font-bold" />
										{/if}
									</div>
								</button>
							</div>
						</div>
						<!-- /Sort By -->

						<!-- Activity Types -->
						<div>
							<div class="flex justify-between">
								<button 
									class="types flex items-center gap-2 cursor-pointer w-full text-left text-xs" 
									onclick={toggleActivityTypes}
								>
									Activity types
									<Fa icon={activityTypesOpen ? faChevronUp : faChevronDown} />
								</button>
								
								{#if activityTypesOpen}
									<div class="flex gap-2">
										<button class="cursor-pointer allnone" onclick={selectAllActivityTypes}>All</button>
										<button class="cursor-pointer allnone" onclick={selectNoActivityTypes}>None</button>
									</div>
								{/if}
							</div>
							{#if activityTypesOpen}
								<div class="flex flex-col gap-2"
									in:slide={{ duration: 300, easing: backOut }}
									out:slide={{ duration: 200, easing: quartOut}}
								>
									<div class="flex flex-col overflow-y-auto max-h-40 mt-1 rounded-sm no-scrollbar">
										{#each distinctActivityTypes as sportType, i}
											{@const icon = iconBySportType[sportType as keyof typeof iconBySportType]}
											<button 
												type="button"
												class="activitytype flex items-center gap-1 p-1 text-xs cursor-pointer text-left {selectedSports.includes(sportType) ? 'selected' : ''}
													{(i == 0) ? 'rounded-t' : ''}
													{(i == distinctActivityTypes.length - 1) ? 'rounded-b' : 'border-b'}
												"
												onclick={() => toggleActivityType(sportType)}
											>
												<div class="w-4 flex justify-center"><Fa {icon} /></div> {sportType}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
						<!-- /Activity Types -->


					</div>
				</div>

			{/if} <!-- /Filter open -->
		</div>
	{:else}
        <a
            href={resolve('/auth/strava')}
            class="inline-flex items-center justify-between rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 w-full"
        >
			<span>Connect Strava</span>
            <Fa icon={faStrava} class="text-2xl" />
        </a>
	{/if}
</div>

<style>
	.filter input[type='date'],
	.filter .daytime button:not(.selected),
	.filter .allnone,
	.filter .activitytype:not(.selected) {
		background-color: white;
		color: #000000;
		border-color: #d78d8d;
	}

	.filter .daytime button.selected,
	.filter .activitytype.selected {
		background-color: rgb(191, 41, 0);
		border-color: #d78d8d;
		color: white;
	}

	.filter .allnone {
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 9px;
		color: rgb(0, 0, 0);
	}

	.filter input[type='date']:hover,
	.filter .daytime button:hover:not(.selected),
	.filter .allnone:hover,
	.filter .activitytype:hover:not(.selected) {
		background-color: #FFC2C5;
		cursor: pointer;
	}
</style>