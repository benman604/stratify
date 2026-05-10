<script lang="ts">
	import type { Route } from '$lib/types/strava';

	type LatLng = [number, number];
	type BoundsOptions = {
		padding: LatLng;
		maxZoom: number;
	};
	type LeafletBounds = object;
	type LeafletLayer = {
		addTo(target: LeafletMap | LeafletFeatureGroup): LeafletLayer;
		bindPopup(html: string): LeafletLayer;
	};
	type LeafletFeatureGroup = {
		addTo(target: LeafletMap): LeafletFeatureGroup;
		clearLayers(): void;
		getBounds(): LeafletBounds;
		getLayers(): LeafletLayer[];
	};
	type LeafletMap = {
		fitBounds(bounds: LeafletBounds, options: BoundsOptions): void;
		remove(): void;
		setView(center: LatLng, zoom: number): LeafletMap;
	};
	type LeafletFactory = {
		featureGroup(): LeafletFeatureGroup;
		map(element: HTMLDivElement, options: Record<string, boolean>): LeafletMap;
		polyline(points: LatLng[], options: Record<string, string | number>): LeafletLayer;
		tileLayer(url: string, options: Record<string, string | number>): LeafletLayer;
	};

	let { routes = [] }: { routes?: Route[] } = $props();

	let mapEl = $state<HTMLDivElement | null>(null);
	let map: LeafletMap | null = null;
	let routeLayer: LeafletFeatureGroup | null = null;
	let leafletReady = $state(false);

	const center: LatLng = [37.7749, -122.4194];
	const zoom = 11;

	const getLeaflet = () => {
		if (typeof window === 'undefined') {
			return null;
		}

		return (window as Window & { L?: LeafletFactory }).L ?? null;
	};

	const hasLeaflet = () => getLeaflet() !== null;

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

		const L = getLeaflet();
		if (!L) {
			return;
		}

		map = L.map(mapEl, {
			zoomControl: true,
			attributionControl: true
		}).setView(center, zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		routeLayer = L.featureGroup().addTo(map);

		return () => {
			if (map) {
				map.remove();
				map = null;
				routeLayer = null;
			}
		};
	});

	$effect(() => {
		if (!map || !routeLayer || !hasLeaflet()) {
			return;
		}

		const L = getLeaflet();
		if (!L) {
			return;
		}
		routeLayer.clearLayers();

		for (const [index, route] of routes.entries()) {
			const points = decodePolyline(route.summaryPolyline);

			if (points.length < 2) {
				continue;
			}

			const polyline = L.polyline(points, {
				color: index === 0 ? '#f97316' : '#2563eb',
				weight: index === 0 ? 5 : 4,
				opacity: 0.85,
				lineJoin: 'round'
			});

			polyline.bindPopup(routePopup(route));
			polyline.addTo(routeLayer);
		}

		if (routeLayer.getLayers().length > 0) {
			map.fitBounds(routeLayer.getBounds(), {
				padding: [28, 28],
				maxZoom: 14
			});
		} else {
			map.setView(center, zoom);
		}
	});

	function decodePolyline(encoded: string): LatLng[] {
		const coordinates: LatLng[] = [];
		let index = 0;
		let lat = 0;
		let lng = 0;

		while (index < encoded.length) {
			const decodedLat = decodeCoordinate(encoded, index);
			lat += decodedLat.value;
			index = decodedLat.nextIndex;

			const decodedLng = decodeCoordinate(encoded, index);
			lng += decodedLng.value;
			index = decodedLng.nextIndex;

			coordinates.push([lat / 1e5, lng / 1e5]);
		}

		return coordinates;
	}

	function decodeCoordinate(encoded: string, startIndex: number) {
		let result = 0;
		let shift = 0;
		let index = startIndex;

		while (index < encoded.length) {
			const byte = encoded.charCodeAt(index) - 63;
			index += 1;
			result |= (byte & 0x1f) << shift;
			shift += 5;

			if (byte < 0x20) {
				break;
			}
		}

		return {
			value: result & 1 ? ~(result >> 1) : result >> 1,
			nextIndex: index
		};
	}

	function routePopup(route: Route) {
		return `
			<div class="route-popup">
				<strong>${escapeHtml(route.title)}</strong>
				<dl>
					<div><dt>Start</dt><dd>${escapeHtml(route.formattedStartTime)}</dd></div>
					<div><dt>Distance</dt><dd>${formatDistance(route.distanceMeters)}</dd></div>
					<div><dt>Duration</dt><dd>${formatDuration(route.durationSeconds)}</dd></div>
					<div><dt>Avg pace</dt><dd>${formatPace(route.averagePaceSecondsPerKm)}</dd></div>
				</dl>
			</div>
		`;
	}

	function formatDistance(meters: number) {
		return `${(meters / 1000).toFixed(2)} km`;
	}

	function formatDuration(seconds: number) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;

		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
		}

		return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
	}

	function formatPace(secondsPerKm: number | null) {
		if (secondsPerKm === null) {
			return 'N/A';
		}

		const minutes = Math.floor(secondsPerKm / 60);
		const seconds = Math.round(secondsPerKm % 60);

		return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
	}

	function escapeHtml(value: string) {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
	<script
		src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
		crossorigin=""
		onload={handleLeafletLoad}
	></script>
</svelte:head>

<div class="map-shell">
	<div class="map" bind:this={mapEl}></div>
</div>

<style>
	.map-shell {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 360px;
		overflow: hidden;
		background: #0d0f14;
		border-radius: 0.5rem;
	}

	.map {
		position: absolute;
		inset: 0;
	}

	:global(.leaflet-container) {
		font:
			14px/1.4 'Helvetica Neue',
			Arial,
			sans-serif;
	}

	:global(.leaflet-control-zoom a) {
		background: #f6f7fb;
		color: #1b1f2a;
	}

	:global(.route-popup strong) {
		display: block;
		margin-bottom: 8px;
		color: #111827;
		font-size: 14px;
	}

	:global(.route-popup dl) {
		display: grid;
		gap: 4px;
		margin: 0;
		min-width: 190px;
	}

	:global(.route-popup div) {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	:global(.route-popup dt) {
		color: #6b7280;
		font-weight: 600;
	}

	:global(.route-popup dd) {
		margin: 0;
		color: #111827;
		text-align: right;
	}
</style>
