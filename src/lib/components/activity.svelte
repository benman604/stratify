<script lang="ts">
	import { Fa } from 'svelte-fa';
	import { getActivityIcon } from '$lib/types/activity_icons';
	import PhotoCarousel from '$lib/components/photo_carousel.svelte';
	import type { Route } from '$lib/types/strava';

	let { activity, onBack = () => {} }: { activity: Route; onBack?: () => void } = $props();

	function formatLongDate(value: string | undefined) {
		if (!value) {
			return 'Unknown date';
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Unknown date';
		}

		return new Intl.DateTimeFormat(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function formatDistanceKm(meters: number) {
		return (meters / 1000).toFixed(2);
	}

	function formatPace(secondsPerKm: number | null) {
		if (secondsPerKm === null) {
			return 'N/A';
		}

		const minutes = Math.floor(secondsPerKm / 60);
		const seconds = Math.round(secondsPerKm % 60);
		return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
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

	function formatSpeed(speedMetersPerSecond?: number) {
		if (typeof speedMetersPerSecond !== 'number' || !Number.isFinite(speedMetersPerSecond)) {
			return 'N/A';
		}

		return `${(speedMetersPerSecond * 3.6).toFixed(1)} km/h`;
	}
</script>

<div class="flex flex-col gap-4">
	<button
		type="button"
		class="text-left text-sm font-medium text-orange-600 hover:text-orange-700"
		onclick={onBack}
	>
		Back to Activities
	</button>

	<div class="flex items-center gap-2">
		<Fa icon={getActivityIcon(activity)} class="text-2xl text-orange-600" />
		<h2 class="text-lg font-semibold text-zinc-900">{activity.name}</h2>
	</div>

	<p class="text-sm text-zinc-500">
		{formatLongDate(activity.localStartTime || activity.startTime)}
	</p>

	<div class="rounded-lg bg-zinc-100 p-3">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs uppercase tracking-wide text-zinc-500">Distance</p>
				<p class="text-lg font-semibold text-zinc-900">
					{formatDistanceKm(activity.distanceMeters)} km
				</p>
			</div>
			<div class="text-right">
				<p class="text-xs uppercase tracking-wide text-zinc-500">Pace</p>
				<p class="text-lg font-semibold text-zinc-900">
					{formatPace(activity.averagePaceSecondsPerKm)}
				</p>
			</div>
		</div>
		<p class="mt-2 text-sm text-zinc-600">{formatDuration(activity.durationSeconds)}</p>
	</div>

	<PhotoCarousel photos={activity.photos} />

	<div class="space-y-2">
		<p class="text-xs uppercase tracking-wide text-zinc-500">Description</p>
		<p class="text-sm text-zinc-700">
			{activity.description ?? 'No description yet.'}
		</p>
	</div>

	<div class="space-y-1 text-sm text-zinc-700">
		<p>
			<span class="font-medium text-zinc-900">Average speed:</span>
			{formatSpeed(activity.average_speed)}
		</p>
		<p>
			<span class="font-medium text-zinc-900">Max speed:</span>
			{formatSpeed(activity.max_speed)}
		</p>
	</div>
</div>
