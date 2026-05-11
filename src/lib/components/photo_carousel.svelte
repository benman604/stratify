<script lang="ts">
	import type { PhotosSummary } from '$lib/types/strava';

	let { photos = undefined }: { photos?: PhotosSummary } = $props();
</script>

<div class="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
	<p class="font-medium text-zinc-700">Photo carousel</p>
	{#if photos?.count}
		<p>{photos.count} photo(s) available.</p>
	{:else}
		<p>No photos to display yet.</p>
	{/if}
</div>
