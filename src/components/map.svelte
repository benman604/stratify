<svelte:head>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		crossorigin=""
	/>
	<script
		src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
		crossorigin=""
		onload={handleLeafletLoad}
	></script>
</svelte:head>

<script>
	/** @type {HTMLDivElement | null} */
	let mapEl = $state(null);
	/** @type {any} */
	let map = null;
	/** @type {any} */
	let marker = null;
	let leafletReady = $state(false);

	const center = [37.7749, -122.4194];
	const zoom = 11;

	const hasLeaflet = () =>
		typeof window !== 'undefined' && !!/** @type {any} */ (window).L;

	if (hasLeaflet()) {
		leafletReady = true;
	}

	function handleLeafletLoad() {
		leafletReady = true;
	}

	$effect(() => {
		if (!mapEl || !leafletReady || map || !hasLeaflet()) {
			return;
		}

		const L = /** @type {any} */ (window).L;

		map = L.map(mapEl, {
			zoomControl: true,
			attributionControl: true
		}).setView(center, zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		marker = L.marker(center)
			.addTo(map)
			.bindPopup('Hello from Stratify.')
			.openPopup();

		return () => {
			if (map) {
				map.remove();
				map = null;
				marker = null;
			}
		};
	});
</script>

<div class="map-shell">
	<div class="map" bind:this={mapEl}></div>
</div>

<style>
	.map-shell {
		position: relative;
		width: 100%;
		height: min(70vh, 720px);
		min-height: 360px;
		overflow: hidden;
		background: #0d0f14;
        border: 2px solid gray;
	}

	.map {
		position: absolute;
		inset: 0;
	}

	:global(.leaflet-container) {
		font: 14px/1.4 "Helvetica Neue", Arial, sans-serif;
	}

	:global(.leaflet-control-zoom a) {
		background: #f6f7fb;
		color: #1b1f2a;
	}
</style>
