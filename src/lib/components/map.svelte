<script lang="ts">
	import { faFlagCheckered, faMapPin } from '@fortawesome/free-solid-svg-icons';
	import type { Route } from '$lib/types/strava';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		createHeatLayerData,
		getHighestDensityCenter,
		renderRouteHeatLayer,
		routesForPoint,
		heatPopup,
		type HeatLayerData,
		type RouteGeometry
	} from './map_heat_layer';

	// import { LeafletMap } from 'svelte-leafletjs';

	import type {
		Map as LeafletMap,
		Polyline as LeafletPolyline,
		FeatureGroup as LeafletFeatureGroup,
		LatLngTuple,
		Point,
	} from 'leaflet';

	type LatLng = LatLngTuple;

	type LeafletPoint = Point;

	type RouteStyle = {
		color: string;
		lineJoin: import('leaflet').LineJoinShape;
		opacity: number;
		weight: number;
	};

	type FontAwesomeIcon = {
		icon: [number, number, string[], string, string | string[]];
	};

	let {
		routes = [],
		highlightedActivityId = null,
		selectedActivityId = null,
		hoverLatLng = null,
		onActivityHover = () => {},
		onActivityLeave = () => {},
		onActivitySelect = () => {}
	}: {
		routes?: Route[];
		highlightedActivityId?: number | null;
		selectedActivityId?: number | null;
		hoverLatLng?: LatLng | null;
		onActivityHover?: (activityId: number) => void;
		onActivityLeave?: () => void;
		onActivitySelect?: (activityId: number) => void;
	} = $props();

	let mapEl = $state<HTMLDivElement | null>(null);
	let leafletMap: LeafletMap | null = null;
	let heatLayer: LeafletFeatureGroup | null = null;
	let routeLayer: LeafletFeatureGroup | null = null;
	let arrowLayer: LeafletFeatureGroup | null = null;
	const routePolylines = new SvelteMap<number, LeafletPolyline>();
	const routePoints = new SvelteMap<number, LatLng[]>();
	let didInitialFit = false;
	let prevSelectedId: number | null = null;
	let mapChangeHandler: (() => void) | null = null;
	let leafletReady = $state(false);
	let heatLayerData: HeatLayerData | null = null;
	let heatRouteGeometries: RouteGeometry[] = [];
	let hoverMarker: import('leaflet').CircleMarker | null = null;

	const center: LatLng = [37.7749, -122.4194];
	const zoom = 11;

	const getLeaflet = () => {
		if (typeof window === 'undefined') {
			return null;
		}

		return (window as Window & { L?: any }).L ?? null;
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
			attributionControl: false,
			preferCanvas: true
		}).setView(center, zoom);

		L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
		}).addTo(leafletMap);

		heatLayer = L.featureGroup().addTo(leafletMap);
		routeLayer = L.featureGroup().addTo(leafletMap);
		arrowLayer = L.featureGroup().addTo(leafletMap);

		mapChangeHandler = () => {
			const activeRouteId = selectedActivityId ?? highlightedActivityId;
			refreshRouteDecorations(activeRouteId);
		};
		leafletMap!.on('zoomend', mapChangeHandler);
		leafletMap!.on('moveend', mapChangeHandler);

		const mapClickHandler = (e: any) => {
			if (selectedActivityId !== null) return;
			if (!heatLayerData) return;
			
			const routes = routesForPoint(heatLayerData, [e.latlng.lat, e.latlng.lng], leafletMap!);
			if (routes.length === 0) return;
			
			const L = getLeaflet();
			if (!L) return;
			
			leafletMap!.closePopup();
			L.popup({
				closeButton: true,
				autoClose: true
			})
				.setLatLng(e.latlng)
				.setContent(heatPopup(routes))
				.openOn(leafletMap);
		};
		leafletMap!.on('click', mapClickHandler);
		heatLayer!.on('click', mapClickHandler);

		const popupCloseHandler = () => {
			onActivityLeave();
		};
		leafletMap!.on('popupclose', popupCloseHandler);

		const popupInteractionHandler = (event: Event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const button = target.closest<HTMLButtonElement>('.heatmap-popup__activity');
			const routeId = Number(button?.dataset.routeId);

			if (!button || !Number.isFinite(routeId)) {
				return;
			}

			if (selectedActivityId !== null) {
				return;
			}

			if (event.type === 'click') {
				onActivitySelect(routeId);
			} else if (event.type === 'mouseover' || event.type === 'focusin') {
				onActivityHover(routeId);
			} else if (event.type === 'mouseout' || event.type === 'focusout') {
				onActivityLeave();
			}
		};

		mapEl.addEventListener('click', popupInteractionHandler);
		mapEl.addEventListener('mouseover', popupInteractionHandler);
		mapEl.addEventListener('mouseout', popupInteractionHandler);
		mapEl.addEventListener('focusin', popupInteractionHandler);
		mapEl.addEventListener('focusout', popupInteractionHandler);

		return () => {
			if (leafletMap) {
				mapEl?.removeEventListener('click', popupInteractionHandler);
				mapEl?.removeEventListener('mouseover', popupInteractionHandler);
				mapEl?.removeEventListener('mouseout', popupInteractionHandler);
				mapEl?.removeEventListener('focusin', popupInteractionHandler);
				mapEl?.removeEventListener('focusout', popupInteractionHandler);
				leafletMap.off('click', mapClickHandler);
				leafletMap.off('popupclose', popupCloseHandler);
				heatLayer?.off('click', mapClickHandler);
				if (mapChangeHandler) {
					leafletMap.off('zoomend', mapChangeHandler);
					leafletMap.off('moveend', mapChangeHandler);
					mapChangeHandler = null;
				}
				leafletMap.remove();
				leafletMap = null;
				heatLayer = null;
				routeLayer = null;
				arrowLayer = null;
				routePolylines.clear();
				routePoints.clear();
			}
		};
	});

	$effect(() => {
		if (!leafletMap || !heatLayer || !routeLayer || !hasLeaflet()) {
			return;
		}

		const L = getLeaflet();
		if (!L) {
			return;
		}

		const currentRoutes = routes;

		heatLayer.clearLayers();
		routeLayer.clearLayers();
		arrowLayer?.clearLayers();
		routePolylines.clear();
		routePoints.clear();
		heatRouteGeometries = [];

		for (const [index, route] of currentRoutes.entries()) {
			const points = decodePolyline(route.summaryPolyline);

			if (points.length < 2) {
				continue;
			}

			heatRouteGeometries.push({ route, points: points as import('$lib/types/strava').LatLng[] });

			const polyline = L.polyline(points, {
				...baseRouteStyle(index)
			});

			polyline.addTo(routeLayer);
			routePolylines.set(route.id, polyline);
			routePoints.set(route.id, points);
		}

		heatLayerData = createHeatLayerData(heatRouteGeometries);
		redrawHeatLayer();

		if (!didInitialFit && currentRoutes.length > 0 && routeLayer.getLayers().length > 0) {
			const L = getLeaflet();
			
			// Find most recent route
			let mostRecentRoute = currentRoutes[0];
			for (const route of currentRoutes) {
				if (new Date(route.startTime).getTime() > new Date(mostRecentRoute.startTime).getTime()) {
					mostRecentRoute = route;
				}
			}

			const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
			const isWithinPastMonth = (Date.now() - new Date(mostRecentRoute.startTime).getTime()) < oneMonthMs;

			let centered = false;

			if (isWithinPastMonth) {
				const recentPolyline = routePolylines.get(mostRecentRoute.id);
				if (recentPolyline) {
					leafletMap.fitBounds(recentPolyline.getBounds(), {
						padding: [28, 28],
						maxZoom: 14
					});
					centered = true;
				}
			}

			if (!centered && L) {
				const heatCenter = getHighestDensityCenter(heatLayerData);
				if (heatCenter) {
					leafletMap.setView(heatCenter, 13);
				} else {
					leafletMap.fitBounds(routeLayer.getBounds(), {
						padding: [28, 28],
						maxZoom: 14
					});
				}
			}
			didInitialFit = true;
		}
	});

	$effect(() => {
		if (!leafletMap || routePolylines.size === 0) {
			return;
		}

		const activeRouteId = selectedActivityId ?? highlightedActivityId;

		for (const route of routes) {
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
				polyline.setStyle(hiddenRouteStyle());
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

	$effect(() => {
		if (!leafletMap || !heatLayer) {
			return;
		}

		if (selectedActivityId === null) {
			redrawHeatLayer();
		} else {
			leafletMap.closePopup();
			heatLayer.clearLayers();
		}
	});

	function redrawHeatLayer() {
		if (!leafletMap || !heatLayer || selectedActivityId !== null) {
			heatLayer?.clearLayers();
			return;
		}

		const L = getLeaflet();
		if (!L || !heatLayerData) {
			return;
		}

		renderRouteHeatLayer(L, leafletMap, heatLayer, heatLayerData, heatRouteGeometries);
	}

	function baseRouteStyle(index: number): RouteStyle {
		return {
			color: index === 0 ? '#2563eb' : '#4b5563',
			weight: 2.5,
			opacity: 0,
			lineJoin: 'round'
		};
	}

	function hiddenRouteStyle(): RouteStyle {
		return {
			color: 'transparent',
			weight: 0,
			opacity: 0,
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
			const arrow = routeArrowFromVector(tip as unknown as Point, direction as unknown as Point);

			if (arrow) {
				arrows.push(arrow as unknown as LatLngTuple[]);
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
			leafletMap.layerPointToLatLng(left as unknown as Point),
			leafletMap.layerPointToLatLng(tip as unknown as Point),
			leafletMap.layerPointToLatLng(right as unknown as Point)
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

	function markerIcon(L: any, icon: FontAwesomeIcon, className: string) {
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

	$effect(() => {
		const L = getLeaflet();
		if (!L || !leafletMap || !routeLayer) return;

		if (hoverLatLng) {
			if (!hoverMarker) {
				hoverMarker = L.circleMarker(hoverLatLng, {
					radius: 5,
					color: '#fff',
					fillColor: '#ef4444',
					fillOpacity: 1,
					weight: 2
				}).addTo(leafletMap);
			} else {
				hoverMarker.setLatLng(hoverLatLng);
			}
		} else {
			if (hoverMarker) {
				hoverMarker.remove();
				hoverMarker = null;
			}
		}
	});

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

	:global(.heatmap-popup) {
		min-width: 150px;
		max-width: 200px;
	}

	:global(.heatmap-popup__header) {
		margin-bottom: 8px;
		color: #111827;
		font-size: 14px;
	}

	:global(.heatmap-popup__list) {
		display: flex;
		max-height: 200px;
		flex-direction: column;
		gap: 4px;
		overflow-y: auto;
	}

	:global(.heatmap-popup__activity) {
		display: flex;
		width: 100%;
		align-items: baseline;
		gap: 8px;
		border: 0;
		border-radius: 6px;
		background: #f4f4f5;
		padding: 7px 8px;
		color: #18181b;
		text-align: left;
		transition:
			background-color 140ms ease,
			color 140ms ease;
	}

	:global(.heatmap-popup__activity:hover),
	:global(.heatmap-popup__activity:focus-visible) {
		background: #fed7aa;
		color: #9a3412;
		outline: none;
	}

	:global(.heatmap-popup__activity span) {
		flex: 0 0 auto;
		color: #71717a;
		font-size: 12px;
		font-weight: 600;
	}

	:global(.heatmap-popup__activity strong) {
		min-width: 0;
		overflow: hidden;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
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
