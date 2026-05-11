import type { LatLng, Route } from '$lib/types/strava';

export type HeatLineStyle = {
	color: string;
	lineCap: string;
	lineJoin: string;
	opacity: number;
	weight: number;
};

export type HeatLayerGroup = {
	clearLayers(): void;
};

export type HeatLayerLine = {
	addTo(target: HeatLayerGroup): unknown;
	bindPopup(html: string): unknown;
};

export type HeatLayerFactory = {
	polyline(points: LatLng[], options: HeatLineStyle): HeatLayerLine;
};

export type RouteGeometry = {
	route: Route;
	points: LatLng[];
};

export type HeatLayerData = {
	cellsByKey: Map<string, HeatCell>;
	routesById: Map<number, Route>;
	maxCellCount: number;
	cellSizeMeters: number;
};

export type HeatCell = {
	key: string;
	x: number;
	y: number;
	routeIds: Set<number>;
};

type ProjectedPoint = {
	x: number;
	y: number;
};

const heatCellSizeMeters = 25;
const earthRadiusMeters = 6378137;

let memoryCache: HeatLayerData | null = null;
const CACHE_KEY = 'stratify_heat_layer_cache';

function loadHeatLayerDataFromStorage(routeGeometries: RouteGeometry[]): HeatLayerData | null {
	if (typeof localStorage === 'undefined') return null;
	const cachedJSON = localStorage.getItem(CACHE_KEY);
	if (!cachedJSON) return null;

	try {
		const parsed = JSON.parse(cachedJSON) as { key: string; x: number; y: number; routeIds: number[] }[];
		const cellsByKey = new Map<string, HeatCell>();
		let maxCellCount = 1;

		for (const item of parsed) {
			cellsByKey.set(item.key, {
				key: item.key,
				x: item.x,
				y: item.y,
				routeIds: new Set(item.routeIds)
			});
			if (item.routeIds.length > maxCellCount) {
				maxCellCount = item.routeIds.length;
			}
		}

		return {
			cellsByKey,
			routesById: new Map(routeGeometries.map(g => [g.route.id, g.route])),
			maxCellCount,
			cellSizeMeters: heatCellSizeMeters
		};
	} catch (error) {
		console.warn('Failed to load heat layer cache', error);
		return null;
	}
}

function saveHeatLayerDataToStorage(data: HeatLayerData) {
	if (typeof localStorage === 'undefined') return;
	try {
		const toStore = Array.from(data.cellsByKey.values()).map(cell => ({
			key: cell.key,
			x: cell.x,
			y: cell.y,
			routeIds: Array.from(cell.routeIds)
		}));
		localStorage.setItem(CACHE_KEY, JSON.stringify(toStore));
	} catch (error) {
		console.warn('Failed to save heat layer cache', error);
	}
}

export function createHeatLayerData(routeGeometries: RouteGeometry[]): HeatLayerData {
	if (!memoryCache) {
		memoryCache = loadHeatLayerDataFromStorage(routeGeometries);
	}
	
	if (memoryCache) {
		const currentRouteIds = new Set(routeGeometries.map(g => g.route.id));
		const previousRouteIds = new Set<number>();
		for (const cell of memoryCache.cellsByKey.values()) {
			for (const id of cell.routeIds) {
				previousRouteIds.add(id);
			}
		}
		
		const newGeometries = routeGeometries.filter(g => !previousRouteIds.has(g.route.id));
		const removedRouteIds = Array.from(previousRouteIds).filter(id => !currentRouteIds.has(id));

		if (newGeometries.length > 0 || removedRouteIds.length > 0) {
			for (const id of removedRouteIds) {
				memoryCache.routesById.delete(id);
			}
			for (const [key, cell] of memoryCache.cellsByKey) {
				for (const id of removedRouteIds) {
					cell.routeIds.delete(id);
				}
				if (cell.routeIds.size === 0) {
					memoryCache.cellsByKey.delete(key);
				}
			}

			for (const { route, points } of newGeometries) {
				memoryCache.routesById.set(route.id, route);
				indexRouteInHeatCells(route, points, memoryCache.cellsByKey);
			}

			memoryCache.maxCellCount = Math.max(
				1,
				...Array.from(memoryCache.cellsByKey.values(), (cell) => cell.routeIds.size)
			);

			saveHeatLayerDataToStorage(memoryCache);
		}
		
		return memoryCache;
	}

	const cellsByKey = buildHeatCells(routeGeometries);
	const routesById = new Map(routeGeometries.map(({ route }) => [route.id, route]));
	const maxCellCount = Math.max(
		1,
		...Array.from(cellsByKey.values(), (cell) => cell.routeIds.size)
	);

	memoryCache = {
		cellsByKey,
		routesById,
		maxCellCount,
		cellSizeMeters: heatCellSizeMeters
	};
	saveHeatLayerDataToStorage(memoryCache);

	return memoryCache;
}

export function renderRouteHeatLayer(
	L: any,
	leafletMap: any,
	heatLayer: any,
	heatLayerData: HeatLayerData,
	routeGeometries: RouteGeometry[]
) {
	heatLayer.clearLayers();

	const segmentsByColor = new Map<string, LatLng[][]>();
	let baseStyle: Omit<HeatLineStyle, 'color'> | undefined;

	for (const { points } of routeGeometries) {
		for (let index = 1; index < points.length; index += 1) {
			const start = points[index - 1];
			const end = points[index];
			const midpoint = midpointLatLng(start, end);
			const style = heatStyleForPoint(heatLayerData, midpoint);

			if (!baseStyle) {
				baseStyle = {
					lineCap: style.lineCap,
					lineJoin: style.lineJoin,
					opacity: style.opacity,
					weight: style.weight
				};
			}

			let segments = segmentsByColor.get(style.color);
			if (!segments) {
				segments = [];
				segmentsByColor.set(style.color, segments);
			}
			segments.push([start, end]);
		}
	}

	for (const [color, segments] of segmentsByColor) {
		const multiLine = L.polyline(segments, { ...baseStyle!, color, interactive: true });
		multiLine.addTo(heatLayer);
	}
}

export function routesForPoint(heatLayerData: HeatLayerData, point: LatLng) {
	const projected = projectLatLng(point);
	const x = projectedCell(projected.x);
	const y = projectedCell(projected.y);
	const containingCell = heatLayerData.cellsByKey.get(cellKey(x, y));
	const routeIds = containingCell?.routeIds ?? nearestCellRouteIds(heatLayerData, projected, x, y);

	return Array.from(routeIds)
		.map((routeId) => heatLayerData.routesById.get(routeId))
		.filter((route): route is Route => route !== undefined)
		.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
}

export function heatStyleForPoint(heatLayerData: HeatLayerData, point: LatLng): HeatLineStyle {
	const heat = heatAtPoint(heatLayerData, point);
	const intensity =
		heatLayerData.maxCellCount === 1
			? 1
			: Math.log1p(heat) / Math.log1p(heatLayerData.maxCellCount);
	const color = heatColor(intensity);

	return {
		color,
		lineCap: 'round',
		lineJoin: 'round',
		opacity: 0.9,
		weight: 6
	};
}

function buildHeatCells(routeGeometries: RouteGeometry[]) {
	const heatCells = new Map<string, HeatCell>();

	for (const { route, points } of routeGeometries) {
		indexRouteInHeatCells(route, points, heatCells);
	}

	return heatCells;
}

function indexRouteInHeatCells(route: Route, points: LatLng[], heatCells: Map<string, HeatCell>) {
	const visitedCells = new Set<string>();

	for (let index = 1; index < points.length; index += 1) {
		const start = projectLatLng(points[index - 1]);
		const end = projectLatLng(points[index]);

		for (const cell of traversedCells(start, end)) {
			visitedCells.add(cell);
		}
	}

	for (const key of visitedCells) {
		const [x, y] = key.split(':').map(Number);
		const heatCell = heatCells.get(key) ?? {
			key,
			x,
			y,
			routeIds: new Set<number>()
		};

		heatCell.routeIds.add(route.id);
		heatCells.set(key, heatCell);
	}
}

function traversedCells(start: ProjectedPoint, end: ProjectedPoint) {
	const cells: string[] = [];
	let x = projectedCell(start.x);
	let y = projectedCell(start.y);
	const endX = projectedCell(end.x);
	const endY = projectedCell(end.y);
	const stepX = Math.sign(end.x - start.x);
	const stepY = Math.sign(end.y - start.y);
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const tDeltaX = stepX === 0 ? Number.POSITIVE_INFINITY : heatCellSizeMeters / Math.abs(dx);
	const tDeltaY = stepY === 0 ? Number.POSITIVE_INFINITY : heatCellSizeMeters / Math.abs(dy);
	let tMaxX =
		stepX === 0
			? Number.POSITIVE_INFINITY
			: ((stepX > 0 ? (x + 1) * heatCellSizeMeters : x * heatCellSizeMeters) - start.x) / dx;
	let tMaxY =
		stepY === 0
			? Number.POSITIVE_INFINITY
			: ((stepY > 0 ? (y + 1) * heatCellSizeMeters : y * heatCellSizeMeters) - start.y) / dy;

	cells.push(cellKey(x, y));

	while (x !== endX || y !== endY) {
		if (tMaxX < tMaxY) {
			x += stepX;
			tMaxX += tDeltaX;
		} else {
			y += stepY;
			tMaxY += tDeltaY;
		}

		cells.push(cellKey(x, y));
	}

	return cells;
}

function heatAtPoint(heatLayerData: HeatLayerData, point: LatLng) {
	const projected = projectLatLng(point);
	const gridX = projected.x / heatLayerData.cellSizeMeters - 0.5;
	const gridY = projected.y / heatLayerData.cellSizeMeters - 0.5;
	const x0 = Math.floor(gridX);
	const y0 = Math.floor(gridY);
	const x1 = x0 + 1;
	const y1 = y0 + 1;
	const tx = gridX - x0;
	const ty = gridY - y0;
	const v00 = cellCount(heatLayerData, x0, y0);
	const v10 = cellCount(heatLayerData, x1, y0);
	const v01 = cellCount(heatLayerData, x0, y1);
	const v11 = cellCount(heatLayerData, x1, y1);
	const top = lerp(v00, v10, tx);
	const bottom = lerp(v01, v11, tx);

	return lerp(top, bottom, ty);
}

function nearestCellRouteIds(
	heatLayerData: HeatLayerData,
	projected: ProjectedPoint,
	cellX: number,
	cellY: number
) {
	const neighborCells = [
		heatLayerData.cellsByKey.get(cellKey(cellX, cellY)),
		heatLayerData.cellsByKey.get(cellKey(cellX + 1, cellY)),
		heatLayerData.cellsByKey.get(cellKey(cellX - 1, cellY)),
		heatLayerData.cellsByKey.get(cellKey(cellX, cellY + 1)),
		heatLayerData.cellsByKey.get(cellKey(cellX, cellY - 1)),
		heatLayerData.cellsByKey.get(cellKey(cellX + 1, cellY + 1)),
		heatLayerData.cellsByKey.get(cellKey(cellX - 1, cellY - 1)),
		heatLayerData.cellsByKey.get(cellKey(cellX + 1, cellY - 1)),
		heatLayerData.cellsByKey.get(cellKey(cellX - 1, cellY + 1))
	].filter((cell): cell is HeatCell => cell !== undefined && cell.routeIds.size > 0);

	if (neighborCells.length === 0) {
		return new Set<number>();
	}

	const nearest = neighborCells.reduce((closest, cell) =>
		distanceToCellCenter(projected, cell) < distanceToCellCenter(projected, closest)
			? cell
			: closest
	);

	return nearest.routeIds;
}

export function heatPopup(routes: Route[]) {
	const activityButtons = routes
		.map(
			(route) => `
				<button type="button" class="heatmap-popup__activity" data-route-id="${route.id}">
					<span>${escapeHtml(formatPopupActivityDate(route))}</span>
					<strong>${escapeHtml(route.name)}</strong>
				</button>
			`
		)
		.join('');

	return `
		<div class="heatmap-popup">
			<div class="heatmap-popup__list">${activityButtons}</div>
		</div>
	`;
}

function formatPopupActivityDate(route: Route) {
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	}).format(new Date(route.localStartTime || route.startTime));
}

function heatColor(intensity: number) {
	const start = [222, 230, 168];
	const end = [139, 0, 0];
	const color = start.map((channel, index) =>
		Math.round(channel + (end[index] - channel) * intensity)
	);

	return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function cellCount(heatLayerData: HeatLayerData, x: number, y: number) {
	return heatLayerData.cellsByKey.get(cellKey(x, y))?.routeIds.size ?? 0;
}

function lerp(start: number, end: number, amount: number) {
	return start + (end - start) * amount;
}

function midpointLatLng(start: LatLng, end: LatLng): LatLng {
	return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
}

function distanceToCellCenter(point: ProjectedPoint, cell: HeatCell) {
	const centerX = (cell.x + 0.5) * heatCellSizeMeters;
	const centerY = (cell.y + 0.5) * heatCellSizeMeters;

	return Math.hypot(point.x - centerX, point.y - centerY);
}

function projectedCell(value: number) {
	return Math.floor(value / heatCellSizeMeters);
}

function cellKey(x: number, y: number) {
	return `${x}:${y}`;
}

function projectLatLng([lat, lng]: LatLng): ProjectedPoint {
	const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
	const lngRadians = (lng * Math.PI) / 180;
	const latRadians = (clampedLat * Math.PI) / 180;

	return {
		x: earthRadiusMeters * lngRadians,
		y: earthRadiusMeters * Math.log(Math.tan(Math.PI / 4 + latRadians / 2))
	};
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}
