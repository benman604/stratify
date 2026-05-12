<script lang="ts">
	import type { Route } from '$lib/types/strava';
	import { Fa } from 'svelte-fa';
	import { getActivityIcon } from '$lib/types/activity_icons';

	let {
		activities = [],
		highlightedActivityId = null,
		selectedActivityId = null,
		onActivityHover = () => {},
		onActivityLeave = () => {},
		onActivitySelect = () => {}
	}: {
		activities?: Route[];
		highlightedActivityId?: number | null;
		selectedActivityId?: number | null;
		onActivityHover?: (activityId: number) => void;
		onActivityLeave?: () => void;
		onActivitySelect?: (activityId: number) => void;
	} = $props();

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();

		const options: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		};

		if (date.getFullYear() !== now.getFullYear()) {
			options.year = 'numeric';
		}

		return date.toLocaleDateString(undefined, options);
	}

	function formatDuration(seconds: number) {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		const parts: string[] = [];

		if (hrs > 0) {
			parts.push(`${hrs} hr`);
		}

		if (mins > 0 || hrs > 0) {
			parts.push(`${mins} min`);
		}

		parts.push(`${secs} sec`);

		return parts.join(' ');
	}

	function formatDistance(meters: number) {
		return (meters / 1000).toFixed(2);
	}

	function iconClass(activity: Route) {
		return highlightedActivityId === activity.id || selectedActivityId === activity.id
			? 'text-xl text-orange-600'
			: 'text-xl text-zinc-700';
	}

	function cardClass(activity: Route) {
		if (selectedActivityId === activity.id) {
			return 'bg-orange-200';
		}

		if (highlightedActivityId === activity.id) {
			return 'bg-orange-100';
		}

		return 'bg-zinc-100 hover:bg-zinc-300';
	}
</script>

<div class="flex flex-col gap-2">
	{#if activities.length === 0}
		<p class="text-sm text-zinc-500">No activities found.</p>
	{:else}
		{#each activities as activity, i (activity.id)}
			<button
				type="button"
				class={[
					'bg-zinc-100 hover:bg-zinc-300 flex w-full flex-col gap-1 rounded-lg p-2 text-left transition-colors cursor-pointer',
                    i == 0 ? 'mt-3' : '',
				]}
				aria-pressed={selectedActivityId === activity.id}
				onclick={() => onActivitySelect(activity.id)}
				onmouseenter={() => onActivityHover(activity.id)}
				onfocus={() => onActivityHover(activity.id)}
				onmouseleave={onActivityLeave}
				onblur={onActivityLeave}
			>
				<div class="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<span class="font-medium">{activity.name}</span>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(activity.startTime)}
                    </p>
				</div>
                
				<div class="flex items-center justify-between text-sm">
                    <div class="inline-flex items-center gap-1">
                        <Fa icon={getActivityIcon(activity)} class='text-xl text-zinc-600' />
                        <p>{formatDistance(activity.distance)} km</p>
                    </div>

					<p class="text-zinc-600">
						{formatDuration(activity.durationSeconds)}
					</p>
				</div>
			</button>
		{/each}
	{/if}
</div>
