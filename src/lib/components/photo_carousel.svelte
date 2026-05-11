<script lang="ts">
	import { Fa } from 'svelte-fa';
	import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
	import type { Photo } from '$lib/types/strava';

	let { photos = [] }: { photos?: Photo[] } = $props();

	let currentIndex = $state(0);

	function handlePrevious() {
		currentIndex = (currentIndex - 1 + photos.length) % photos.length;
	}

	function handleNext() {
		currentIndex = (currentIndex + 1) % photos.length;
	}

	function getImageUrl(photo: Photo): string {
		// Strava photos have a 'urls' object with actual image URLs keyed by size
		// sizes field is dimensions like { '600': [768, 578] }, not URLs
		if (photo.urls) {
			// Try to get the 600px version first, fallback to any available URL
			const url600 = photo.urls['600'];
			if (url600) return url600;
			
			const urlKeys = Object.keys(photo.urls);
			if (urlKeys.length > 0) {
				return photo.urls[urlKeys[0]];
			}
		}

		return '';
	}
</script>

{#if photos.length > 0}
	<div class="">
        <div class="h-50 flex justify-center overflow-hidden rounded-lg">
            <img
                src={getImageUrl(photos[currentIndex])}
                alt="Activity photo {currentIndex + 1}"
                class="max-h-full w-auto rounded-lg block"
            />
        </div>

		{#if photos.length > 1}
			<div class="flex items-center justify-between gap-2 mt-2">
				<button
					onclick={handlePrevious}
					class="text-zinc-600 hover:text-zinc-800 transition-colors"
					title="Previous photo"
				>
					<Fa icon={faAngleLeft} size="lg" />
				</button>
				<span class="text-sm text-zinc-600">
				{currentIndex + 1}/{photos.length}
				</span>
				<button
					onclick={handleNext}
					class="text-zinc-600 hover:text-zinc-800 transition-colors"
					title="Next photo"
				>
					<Fa icon={faAngleRight} size="lg" />
				</button>
			</div>
		{/if}
	</div>
{/if}

