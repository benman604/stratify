<script lang="ts">
	import { Fa } from 'svelte-fa';
	import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
	import type { Photo } from '$lib/util/strava';

	let { photos = [] }: { photos?: Photo[] } = $props();

	let currentIndex = $state(0);
	
	let carouselTrack: HTMLDivElement | undefined = $state();
	let photoNodes: HTMLElement[] = $state([]);

	function handlePrevious() {
		if (currentIndex > 0) {
			currentIndex -= 1;
			scrollToCurrent();
		}
	}

	function handleNext() {
		if (currentIndex < photos.length - 1) {
			currentIndex += 1;
			scrollToCurrent();
		}
	}
	
	function scrollToCurrent(instant = false) {
		if (photoNodes[currentIndex] && carouselTrack) {
			const node = photoNodes[currentIndex];
			
			// Scroll so node is centered
			node.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'nearest', inline: 'center' });
		}
	}

	$effect(() => {
		// Just referencing these so the effect runs, but we only really 
		// want to call it on mount to align the first image
		if (carouselTrack && photoNodes.length > 0) {
			// small timeout to ensure images are placed
			setTimeout(() => scrollToCurrent(true), 10);
		}
	});

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
	<div class="relative w-full">
		<div 
			bind:this={carouselTrack}
			class="h-50 flex flex-row items-center gap-4 overflow-x-hidden"
			style="scroll-snap-type: x mandatory;"
		>
			<!-- Spacers to allow first and last images to be centered -->
			<div class="shrink-0 w-[50%]"></div>
			{#each photos as photo, i}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					bind:this={photoNodes[i]}
					onclick={() => {
						if (i !== currentIndex) {
							currentIndex = i;
							scrollToCurrent();
						}
					}}
					class="shrink-0 h-full flex justify-center {i !== currentIndex ? 'cursor-pointer' : ''}"
					style="scroll-snap-align: center;"
				>
					<img
						src={getImageUrl(photo)}
						alt="Activity photo {i + 1}"
						class="max-h-full w-auto rounded-lg block object-contain"
					/>
				</div>
			{/each}
			<div class="shrink-0 w-[50%]"></div>
		</div>

		{#if photos.length > 1}
			<div class="flex items-center justify-center gap-2 mt-2">
				<button
					onclick={handlePrevious}
					class="cursor-pointer transition-colors {currentIndex === 0 ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-600 hover:text-zinc-800'}"
					disabled={currentIndex === 0}
					title="Previous photo"
				>
					<Fa icon={faAngleLeft} size="lg" />
				</button>
				<span class="text-sm text-zinc-600">
				{currentIndex + 1}/{photos.length}
				</span>
				<button
					onclick={handleNext}
					class="cursor-pointer transition-colors {currentIndex === photos.length - 1 ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-600 hover:text-zinc-800'}"
					disabled={currentIndex === photos.length - 1}
					title="Next photo"
				>
					<Fa icon={faAngleRight} size="lg" />
				</button>
			</div>
		{/if}
	</div>
{/if}

