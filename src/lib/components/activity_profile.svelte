<script lang="ts">
	import type { Route } from '$lib/types/strava';

	let {
		activity,
		onHoverPoint = () => {}
	}: {
		activity: Route;
		onHoverPoint?: (loc: [number, number] | null) => void;
	} = $props();

	let streams = $state<any>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let svgWidth = $state(800);
	let svgHeight = $state(150);

	let hoverIndex = $state<number | null>(null);

	$effect(() => {
		if (activity?.id) {
			streams = null;
			hoverIndex = null;
			onHoverPoint(null);
			fetchStreams(activity.id);
		}
	});

	async function fetchStreams(id: number) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/activities/${id}/streams`);
			if (!res.ok) {
				throw new Error('Failed to fetch streams');
			}
			streams = await res.json();
		} catch (err) {
			error = String(err);
		} finally {
			loading = false;
		}
	}

	let hasStreams = $derived(streams && streams.time && streams.distance);

	let dataLength = $derived(hasStreams ? streams.time.data.length : 0);
	let maxTime = $derived(hasStreams ? streams.time.data[dataLength - 1] : 1);
	
	let elevations = $derived(streams?.altitude?.data || []);
	let maxElev = $derived(Math.max(...elevations, 1));
	let minElev = $derived(Math.min(...elevations, 0));
	let elevRange = $derived(maxElev - minElev || 1);

	let velocities = $derived(streams?.velocity_smooth?.data || []); // meters/sec
	// pace = seconds per km = 1000 / velocity
	// cap pace around 15:00 min/km (900s) for graph scale
	let paces = $derived(velocities.map(v => v > 0.1 ? Math.min(1000 / v, 900) : 900));
	let maxPace = $derived(Math.max(...paces, 1));
	let minPace = $derived(Math.min(...paces, 0));
	let paceRange = $derived(maxPace - minPace || 1);

	let timePoints = $derived(streams?.time?.data || []);
	let pxPerSec = $derived(svgWidth / maxTime);

	// Generate path for elevation
	let elevationPath = $derived.by(() => {
		if (!hasStreams || elevations.length === 0) return '';
		let path = `M 0,${svgHeight}`;
		for (let i = 0; i < dataLength; i++) {
			let x = timePoints[i] * pxPerSec;
			let y = svgHeight - ((elevations[i] - minElev) / elevRange) * svgHeight;
			path += ` L ${x},${y}`;
		}
		path += ` L ${svgWidth},${svgHeight} Z`;
		return path;
	});

	// Generate path for pace
	let pacePath = $derived.by(() => {
		if (!hasStreams || paces.length === 0) return '';
		let path = '';
		for (let i = 0; i < dataLength; i++) {
			let x = timePoints[i] * pxPerSec;
			// invert pace: faster pace (lower sec/km) goes higher on graph
			let y = ((paces[i] - minPace) / paceRange) * svgHeight; 
			path += `${i === 0 ? 'M' : 'L'} ${x},${y}`;
		}
		return path;
	});

	function handleMouseMove(e: MouseEvent) {
		if (!hasStreams) return;
		const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const targetTime = mouseX / pxPerSec;

		// binary search for closest time
		let l = 0;
		let r = dataLength - 1;
		while (l < r) {
			const mid = Math.floor((l + r) / 2);
			if (timePoints[mid] < targetTime) {
				l = mid + 1;
			} else {
				r = mid;
			}
		}
		hoverIndex = l;
		
		if (streams.latlng?.data && streams.latlng.data[hoverIndex]) {
			// Strava returns [lat, lng]
			onHoverPoint(streams.latlng.data[hoverIndex]);
		}
	}

	function handleMouseLeave() {
		hoverIndex = null;
		onHoverPoint(null);
	}

	function formatTime(secs: number) {
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = Math.round(secs % 60);
		if (h > 0) return `+${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `+${m}:${s.toString().padStart(2, '0')}`;
	}

	function formatPace(secPerKm: number) {
		if (secPerKm >= 900) return '>15:00 /km';
		const m = Math.floor(secPerKm / 60);
		const s = Math.round(secPerKm % 60);
		return `${m}:${s.toString().padStart(2, '0')} /km`;
	}

	function formatDist(meters: number) {
		return (meters / 1000).toFixed(2) + ' km';
	}
</script>

<div class="h-full w-full relative flex flex-col" bind:clientWidth={svgWidth} bind:clientHeight={svgHeight}>
	{#if loading}
		<div class="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading profile...</div>
	{:else if error}
		<div class="absolute inset-0 flex items-center justify-center text-sm text-red-500">{error}</div>
	{:else if hasStreams}
		<!-- Tooltip floating above graph -->
		{#if hoverIndex !== null}
			<div 
				class="absolute top-0 right-0 bg-white shadow-md border rounded p-2 text-xs z-10 pointer-events-none transition-transform"
			>
				<p><strong>Time:</strong> {formatTime(timePoints[hoverIndex])}</p>
				<p><strong>Dist:</strong> {formatDist(streams.distance?.data?.[hoverIndex] || 0)}</p>
				<p><strong>Pace:</strong> {formatPace(paces[hoverIndex])}</p>
				<p><strong>Elev:</strong> {Math.round(elevations[hoverIndex])}m</p>
			</div>
		{/if}

		<svg
			class="w-full h-full cursor-crosshair"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			<defs>
				<linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.8"/>
					<stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.1"/>
				</linearGradient>
			</defs>
			
			{#if elevations.length > 0}
				<path d={elevationPath} fill="url(#elevGrad)" stroke="none" />
			{/if}
			
			{#if paces.length > 0}
				<path d={pacePath} fill="none" stroke="#2563eb" stroke-width="1.5" opacity="0.6" />
			{/if}

			<!-- Hover line -->
			{#if hoverIndex !== null}
				<line 
					x1={timePoints[hoverIndex] * pxPerSec} 
					y1="0" 
					x2={timePoints[hoverIndex] * pxPerSec} 
					y2={svgHeight} 
					stroke="#ef4444" 
					stroke-width="1"
					stroke-dasharray="4"
				/>
				<!-- Hover point for elevation -->
				<circle 
					cx={timePoints[hoverIndex] * pxPerSec} 
					cy={svgHeight - ((elevations[hoverIndex] - minElev) / elevRange) * svgHeight} 
					r="3" 
					fill="#ef4444" 
				/>
			{/if}
		</svg>
	{:else}
		<div class="absolute inset-0 flex items-center justify-center text-sm text-gray-500">No stream data available.</div>
	{/if}
</div>
