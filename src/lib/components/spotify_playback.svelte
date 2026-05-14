<script lang="ts">
	import { Fa } from 'svelte-fa';

	import {
		faPause,
		faPlay,
		faForwardStep,
		faBackwardStep
	} from '@fortawesome/free-solid-svg-icons';

	let { token }: { token: string | null } = $props();

	let player = $state<Spotify.Player | null>(null);

	let deviceId = $state<string | null>(null);

	let isPaused = $state(true);
	let isActive = $state(false);

	let currentTrack = $state<Spotify.Track | null>(null);

	let position = $state(0);
	let duration = $state(0);

	function formatTime(ms: number) {
		const totalSeconds = Math.floor(ms / 1000);

		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	async function togglePlayback() {
		await player?.togglePlay();
	}

	async function nextTrack() {
		await player?.nextTrack();
	}

	async function previousTrack() {
		await player?.previousTrack();
	}

	async function seekTo(event: Event) {
		if (!player) return;

		const target = event.target as HTMLInputElement;

		const newPosition = Number(target.value);

		position = newPosition;

		await player.seek(newPosition);
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		if (window.Spotify) return;
        if (!token) return;
        console.log("token", token);

		const script = document.createElement('script');

		script.src = 'https://sdk.scdn.co/spotify-player.js';
		script.async = true;

		document.body.appendChild(script);

		window.onSpotifyWebPlaybackSDKReady = () => {
			player = new window.Spotify.Player({
				name: 'Spotify Island',

				getOAuthToken: (cb) => {
					cb(token);
				},

				volume: 0.5
			});

			player.addListener('ready', ({ device_id }) => {
				console.log('Ready', device_id);

				deviceId = device_id;
			});

			player.addListener('not_ready', ({ device_id }) => {
				console.log('Offline', device_id);
			});

			player.addListener('player_state_changed', (state) => {
				if (!state) {
					isActive = false;
					return;
				}

				isActive = true;

				currentTrack = state.track_window.current_track;

				position = state.position;
				duration = state.duration;

				isPaused = state.paused;
			});

			player.connect();
		};

		return () => {
			player?.disconnect();
		};
	});
</script>

<div
	class="flex flex-col gap-2 rounded bg-(--theme-spotify) px-4 py-3 text-sm font-medium text-white"
>
	<div class="flex items-center gap-3">
		<button
			class="cursor-pointer transition hover:text-green-300 disabled:opacity-40"
			onclick={previousTrack}
			disabled={!isActive}
		>
			<Fa icon={faBackwardStep} class="text-md" />
		</button>

		<button
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-green-700 transition hover:scale-110 hover:bg-green-100"
			onclick={togglePlayback}
		>
			<Fa icon={isPaused ? faPlay : faPause} class="text-md" />
		</button>

		<button
			class="cursor-pointer transition hover:text-green-300 disabled:opacity-40"
			onclick={nextTrack}
			disabled={!isActive}
		>
			<Fa icon={faForwardStep} class="text-md" />
		</button>

		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">
				{currentTrack?.name ?? 'Nothing Playing'}
			</p>

			<p class="truncate text-[10px] text-green-100">
				{currentTrack?.artists.map((a) => a.name).join(', ') ?? ''}
			</p>
		</div>
	</div>

	<div class="flex flex-col gap-1">
		<input
			type="range"
			min="0"
			max={duration}
			value={position}
			oninput={seekTo}
			class="h-1 w-full cursor-pointer appearance-none rounded-full bg-green-300 accent-white"
		/>

		<div class="flex justify-between text-[10px] text-green-100">
			<span>{formatTime(position)}</span>
			<span>{formatTime(duration)}</span>
		</div>
	</div>
</div>