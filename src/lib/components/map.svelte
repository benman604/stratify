<script lang="ts">
	import { faFlagCheckered, faMapPin } from '@fortawesome/free-solid-svg-icons';
	import type { Route } from '$lib/types/strava';
	import { SvelteMap } from 'svelte/reactivity';

	type LatLng = [number, number];
	type BoundsOptions = {
		padding: LatLng;
		maxZoom: number;
	};
	type LeafletBounds = {
		getNorthWest(): LatLng;
		getNorthEast(): LatLng;
	};
	type LeafletPoint = {
		x: number;
		y: number;
	};
	type LeafletDivIcon = object;
	type LeafletLayer = {
		addTo(target: LeafletMap | LeafletFeatureGroup): LeafletLayer;
		bindPopup(html: string): LeafletLayer;
		setZIndexOffset(offset: number): LeafletLayer;
	};
	type LeafletPolyline = LeafletLayer & {
		addTo(target: LeafletMap | LeafletFeatureGroup): LeafletPolyline;
		bringToFront(): LeafletPolyline;
		getBounds(): LeafletBounds;
		setStyle(options: RouteStyle): LeafletPolyline;
	};
	type LeafletMarker = LeafletLayer & {
		addTo(target: LeafletMap | LeafletFeatureGroup): LeafletMarker;
		setZIndexOffset(offset: number): LeafletMarker;
	};
	type LeafletFeatureGroup = {
		addTo(target: LeafletMap): LeafletFeatureGroup;
		clearLayers(): void;
		getBounds(): LeafletBounds;
		getLayers(): LeafletLayer[];
	};
	type LeafletMap = {
		fitBounds(bounds: LeafletBounds, options: BoundsOptions): void;
		getBounds(): LeafletBounds;
		latLngToLayerPoint(latLng: LatLng): LeafletPoint;
		layerPointToLatLng(point: LeafletPoint): LatLng;
		on(event: string, handler: () => void): LeafletMap;
		off(event: string, handler: () => void): LeafletMap;
		remove(): void;
		setView(center: LatLng, zoom: number): LeafletMap;
	};
	type RouteStyle = {
		color: string;
		lineJoin: string;
		opacity: number;
		weight: number;
	};
	type LeafletFactory = {
		featureGroup(): LeafletFeatureGroup;
		divIcon(options: {
			className?: string;
			html?: string;
			iconSize?: [number, number];
			iconAnchor?: [number, number];
		}): LeafletDivIcon;
		map(element: HTMLDivElement, options: Record<string, boolean>): LeafletMap;
		marker(point: LatLng, options?: { icon?: LeafletDivIcon }): LeafletMarker;
		polyline(points: LatLng[], options: RouteStyle): LeafletPolyline;
		tileLayer(url: string, options: Record<string, string | number>): LeafletLayer;
	};

	type FontAwesomeIcon = {
		icon: [number, number, string[], string, string | string[]];
	};

	let {
		routes = [],
		highlightedActivityId = null,
		selectedActivityId = null
	}: {
		routes?: Route[];
		highlightedActivityId?: number | null;
		selectedActivityId?: number | null;
	} = $props();

	let mapEl = $state<HTMLDivElement | null>(null);
	let leafletMap: LeafletMap | null = null;
	let routeLayer: LeafletFeatureGroup | null = null;
	let arrowLayer: LeafletFeatureGroup | null = null;
	const routePolylines = new SvelteMap<number, LeafletPolyline>();
	const routePoints = new SvelteMap<number, LatLng[]>();
	let didInitialFit = false;
	let prevSelectedId: number | null = null;
	let mapChangeHandler: (() => void) | null = null;
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
		if (!mapEl || !leafletReady || leafletMap || !hasLeaflet()) {
			return;
		}

		const L = getLeaflet();
		if (!L) {
			return;
		}

		leafletMap = L.map(mapEl, {
			zoomControl: true,
			attributionControl: true
		}).setView(center, zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(leafletMap);

		routeLayer = L.featureGroup().addTo(leafletMap);
		arrowLayer = L.featureGroup().addTo(leafletMap);
		
		mapChangeHandler = () => {
			const activeRouteId = selectedActivityId ?? highlightedActivityId;
			refreshRouteDecorations(activeRouteId);
		};
		leafletMap.on('zoomend', mapChangeHandler);
		leafletMap.on('moveend', mapChangeHandler);

		return () => {
			if (leafletMap) {
				if (mapChangeHandler) {
					leafletMap.off('zoomend', mapChangeHandler);
					leafletMap.off('moveend', mapChangeHandler);
					mapChangeHandler = null;
				}
				leafletMap.remove();
				leafletMap = null;
				routeLayer = null;
				arrowLayer = null;
				routePolylines.clear();
				routePoints.clear();
			}
		};
	});

	$effect(() => {
		if (!leafletMap || !routeLayer || !hasLeaflet()) {
			return;
		}

		const L = getLeaflet();
		if (!L) {
			return;
		}
		
		const currentRoutes = routes;
		
		routeLayer.clearLayers();
		arrowLayer?.clearLayers();
		routePolylines.clear();
		routePoints.clear();

		for (const [index, route] of currentRoutes.entries()) {
			const points = decodePolyline(route.summaryPolyline);

			if (points.length < 2) {
				continue;
			}

			const polyline = L.polyline(points, {
				...baseRouteStyle(index)
			});

			polyline.bindPopup(routePopup(route));
			polyline.addTo(routeLayer);
			routePolylines.set(route.id, polyline);
			routePoints.set(route.id, points);
		}

		if (!didInitialFit && currentRoutes.length > 0 && routeLayer.getLayers().length > 0) {
			leafletMap.fitBounds(routeLayer.getBounds(), {
				padding: [28, 28],
				maxZoom: 14
			});
			didInitialFit = true;
		}
	});

	$effect(() => {
		if (!leafletMap || routePolylines.size === 0) {
			return;
		}

		const activeRouteId = selectedActivityId ?? highlightedActivityId;

		for (const [index, route] of routes.entries()) {
			const polyline = routePolylines.get(route.id);

			if (!polyline) {
				continue;
			}

			if (selectedActivityId !== null && route.id !== selectedActivityId) {
				polyline.setStyle({ opacity: 0, weight: 0, color: 'transparent', lineJoin: 'round' });
			} else if (activeRouteId && route.id === activeRouteId) {
				polyline.setStyle(highlightedRouteStyle());
				polyline.bringToFront();
			} else {
				polyline.setStyle(baseRouteStyle(index));
			}
		}

		refreshRouteDecorations(activeRouteId);
	});

	$effect(() => {
		if (!leafletMap || routePolylines.size === 0) {
			return;
		}

		if (selectedActivityId !== null && selectedActivityId !== prevSelectedId) {
			const polyline = routePolylines.get(selectedActivityId);
			if (polyline) {
				leafletMap.fitBounds(polyline.getBounds(), {
					padding: [48, 48],
					maxZoom: 15
				});
			}
		}

		prevSelectedId = selectedActivityId ?? null;
	});

	function baseRouteStyle(index: number): RouteStyle {
		return {
			color: index === 0 ? '#2563eb' : '#4b5563',
			weight: index === 0 ? 5 : 4,
			opacity: 0.75,
			lineJoin: 'round'
		};
	}

	function highlightedRouteStyle(): RouteStyle {
		return {
			color: '#ff6a00',
			weight: 7,
			opacity: 1,
			lineJoin: 'round'
		};
	}

	function arrowStyle(): RouteStyle {
		return {
			color: '#f8fafc',
			weight: 3,
			opacity: 0.95,
			lineJoin: 'round'
		};
	}

	function arrowOutlineStyle(): RouteStyle {
		return {
			color: '#0f172a',
			weight: 6,
			opacity: 0.6,
			lineJoin: 'round'
		};
	}

	function refreshRouteDecorations(activeRouteId: number | null) {
		if (!arrowLayer) {
			return;
		}

		arrowLayer.clearLayers();

		if (activeRouteId === null) {
			return;
		}

		drawRouteArrows(activeRouteId);
	}

	function drawRouteArrows(routeId: number) {
		const L = getLeaflet();
		const points = routePoints.get(routeId);

		if (!L || !leafletMap || !arrowLayer || !points || points.length < 2) {
			return;
		}

		drawRouteMarkers(points);

		for (const arrow of routeArrows(points)) {
			const outline = L.polyline(arrow, arrowOutlineStyle());
			outline.addTo(arrowLayer);
			outline.bringToFront();

			const arrowPolyline = L.polyline(arrow, arrowStyle());
			arrowPolyline.addTo(arrowLayer);
			arrowPolyline.bringToFront();
		}
	}

	function drawRouteMarkers(points: LatLng[]) {
		const L = getLeaflet();

		if (!L || !arrowLayer || points.length < 2) {
			return;
		}

		const start = points[0];
		const end = points[points.length - 1];
		const startMarker = L.marker(start, {
			icon: markerIcon(L, faMapPin, 'route-marker--start')
		});
		const endMarker = L.marker(end, {
			icon: markerIcon(L, faFlagCheckered, 'route-marker--end')
		});

		startMarker.addTo(arrowLayer).setZIndexOffset(1000);
		endMarker.addTo(arrowLayer).setZIndexOffset(1000);
	}

	function routeArrows(points: LatLng[]) {
		if (!leafletMap) {
			return [];
		}

		if (points.length < 2) {
			return [];
		}

		const layerPoints = points.map((point) => leafletMap!.latLngToLayerPoint(point));
		const distances: number[] = [0];
		for (let index = 1; index < layerPoints.length; index += 1) {
			distances.push(
				distances[index - 1] + distancePixels(layerPoints[index - 1], layerPoints[index])
			);
		}

		const totalLength = distances[distances.length - 1];
		const intervalPixels = 50;
		if (totalLength < intervalPixels) {
			return [];
		}
		const arrows: LatLng[][] = [];

		for (
			let target = intervalPixels;
			target < totalLength - intervalPixels * 0.25;
			target += intervalPixels
		) {
			const segmentIndex = findSegmentIndex(distances, target);
			const segmentStart = layerPoints[segmentIndex - 1];
			const segmentEnd = layerPoints[segmentIndex];
			const segmentLength = distances[segmentIndex] - distances[segmentIndex - 1];

			if (segmentLength <= 0) {
				continue;
			}

			const t = (target - distances[segmentIndex - 1]) / segmentLength;
			const tip = {
				x: segmentStart.x + (segmentEnd.x - segmentStart.x) * t,
				y: segmentStart.y + (segmentEnd.y - segmentStart.y) * t
			};
			const direction = {
				x: segmentEnd.x - segmentStart.x,
				y: segmentEnd.y - segmentStart.y
			};
			const arrow = routeArrowFromVector(tip, direction);

			if (arrow) {
				arrows.push(arrow);
			}
		}

		return arrows;
	}

	function routeArrowFromVector(tip: LeafletPoint, direction: LeafletPoint) {
		if (!leafletMap) {
			return null;
		}

		const length = Math.hypot(direction.x, direction.y);
		if (length === 0) {
			return null;
		}

		const unit = {
			x: direction.x / length,
			y: direction.y / length
		};
		const perpendicular = {
			x: -unit.y,
			y: unit.x
		};
		const arrowLength = 5;
		const arrowWidth = 3;
		const base = {
			x: tip.x - unit.x * arrowLength,
			y: tip.y - unit.y * arrowLength
		};
		const left = {
			x: base.x + perpendicular.x * arrowWidth,
			y: base.y + perpendicular.y * arrowWidth
		};
		const right = {
			x: base.x - perpendicular.x * arrowWidth,
			y: base.y - perpendicular.y * arrowWidth
		};

		return [
			leafletMap.layerPointToLatLng(left),
			leafletMap.layerPointToLatLng(tip),
			leafletMap.layerPointToLatLng(right)
		];
	}

	function findSegmentIndex(distances: number[], target: number) {
		for (let index = 1; index < distances.length; index += 1) {
			if (distances[index] >= target) {
				return index;
			}
		}

		return distances.length - 1;
	}

	function distancePixels(a: LeafletPoint, b: LeafletPoint) {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	function markerIcon(L: LeafletFactory, icon: FontAwesomeIcon, className: string) {
		const svg = fontAwesomeSvg(icon);
		return L.divIcon({
			className: 'route-marker-wrapper',
			html: `<div class="route-marker ${className}">${svg}</div>`,
			iconSize: [26, 26],
			iconAnchor: [13, 26]
		});
	}

	function fontAwesomeSvg(icon: FontAwesomeIcon) {
		const [width, height, , , pathData] = icon.icon;
		const paths = Array.isArray(pathData) ? pathData : [pathData];
		const renderedPaths = paths.map((path) => `<path d="${path}"></path>`).join('');

		return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${renderedPaths}</svg>`;
	}

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

	:global(.route-marker-wrapper) {
		background: transparent;
		border: none;
	}

	:global(.route-marker) {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.35));
	}

	:global(.route-marker svg) {
		width: 100%;
		height: 100%;
		fill: currentColor;
	}

	:global(.route-marker--start) {
		color: #000000;
	}

	:global(.route-marker--end) {
		color: #fffb1c;
	}
</style>
