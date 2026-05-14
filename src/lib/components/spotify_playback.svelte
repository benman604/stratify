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
	let isLoading = $state(false);
	let isSeeking = $state(false);

	let currentTrack = $state<Spotify.Track | null>(null);

	let position = $state(0);
	let duration = $state(0);

	const POLL_INTERVAL = 5000;

	let pollIntervalId: ReturnType<typeof setInterval> | null = null;
	let timeAdvanceIntervalId: ReturnType<typeof setInterval> | null = null;

	function formatTime(ms: number) {
		const totalSeconds = Math.floor(ms / 1000);

		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	async function fetchCurrentPlayback() {
		if (!token) return false;

		try {
			const res = await fetch('https://api.spotify.com/v1/me/player', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (res.status === 204 || res.status === 404) {
				isActive = false;
				return false;
			}

			const data = await res.json();

			currentTrack = data.item ?? null;

			position = data.progress_ms ?? 0;
			duration = data.item?.duration_ms ?? 0;

			isPaused = !data.is_playing;

			if (data.device?.id) {
				deviceId = data.device.id;
			}

			isActive = true;

			if (isLoading && currentTrack) {
				isLoading = false;
			}

			return true;
		} catch (err) {
			console.error('fetchCurrentPlayback error', err);
			return false;
		}
	}

	async function transferPlaybackToThisDevice() {
		if (!token || !deviceId) return false;

		try {
			await fetch('https://api.spotify.com/v1/me/player', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					device_ids: [deviceId],
					play: false
				})
			});

			return true;
		} catch (err) {
			console.error('transferPlaybackToThisDevice error', err);
			return false;
		}
	}

	async function togglePlayback() {
		if (!token || !isActive) return;

		const wasPlaying = !isPaused;

		isPaused = !isPaused;

		try {
			if (wasPlaying) {
				await fetch('https://api.spotify.com/v1/me/player/pause', {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${token}`
					}
				});
			} else {
				await fetch('https://api.spotify.com/v1/me/player/play', {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${token}`
					}
				});
			}
		} catch (err) {
			console.error('togglePlayback error', err);

			isPaused = wasPlaying;
		}
	}

	async function refreshPlaybackAfterCommand() {
		// Spotify backend propagation delay
		await new Promise((resolve) => setTimeout(resolve, 500));

		await fetchCurrentPlayback();
	}

	async function gotoNextTrack() {
		if (!token || !isActive) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/next', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			await refreshPlaybackAfterCommand();
		} catch (err) {
			console.error('nextTrack error', err);
		}
	}

	async function gotoPreviousTrack() {
		if (!token || !isActive) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/previous', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			await refreshPlaybackAfterCommand();
		} catch (err) {
			console.error('previousTrack error', err);
		}
	}

	async function seekToCurrentPosition() {
		if (!token || !isActive) return;

		try {
			await fetch(
				`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`,
				{
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			await refreshPlaybackAfterCommand();
		} catch (err) {
			console.error('seek error', err);
		}
	}

	function openSpotifyApp() {
		isLoading = true;

		try {
			window.open('spotify:', '_blank');
		} catch (e) {
			window.open('https://open.spotify.com', '_blank');
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		if (!token) return;

		const createPlayer = () => {
			player = new window.Spotify.Player({
				name: 'Spotify Island',

				getOAuthToken: (cb) => {
					cb(token);
				},

				volume: 0.5
			});

			player.addListener('ready', async ({ device_id }) => {
				console.log('Ready', device_id);

				deviceId = device_id;

				const hasPlayback = await fetchCurrentPlayback();

				if (!hasPlayback) {
					const transferred = await transferPlaybackToThisDevice();

					if (transferred) {
						await fetchCurrentPlayback();
					}
				}
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

			pollIntervalId = setInterval(async () => {
				await fetchCurrentPlayback();
			}, POLL_INTERVAL);
		};

		if (window.Spotify) {
			createPlayer();
		} else {
			const script = document.createElement('script');

			script.src = 'https://sdk.scdn.co/spotify-player.js';

			script.async = true;

			document.body.appendChild(script);

			window.onSpotifyWebPlaybackSDKReady = () => {
				createPlayer();
			};
		}

		return () => {
			if (pollIntervalId) {
				clearInterval(pollIntervalId);
			}

			if (timeAdvanceIntervalId) {
				clearInterval(timeAdvanceIntervalId);
			}

			player?.disconnect();
		};
	});

	$effect(() => {
		if (isPaused || !isActive || isSeeking) {
			if (timeAdvanceIntervalId) {
				clearInterval(timeAdvanceIntervalId);
				timeAdvanceIntervalId = null;
			}

			return;
		}

		let lastTick = Date.now();

		timeAdvanceIntervalId = setInterval(() => {
			const now = Date.now();

			const delta = now - lastTick;

			lastTick = now;

			position = Math.min(position + delta, duration);
		}, 100);

		return () => {
			if (timeAdvanceIntervalId) {
				clearInterval(timeAdvanceIntervalId);

				timeAdvanceIntervalId = null;
			}
		};
	});
</script>

{#if isActive || currentTrack}
	<div
		class="flex flex-col gap-2 rounded bg-(--theme-spotify) px-4 py-3 text-sm font-medium text-white"
	>
		<div class="flex items-center gap-3">
			<button
				class="cursor-pointer transition hover:text-green-300 disabled:opacity-40"
				onclick={gotoPreviousTrack}
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
				onclick={gotoNextTrack}
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
				bind:value={position}
				onpointerdown={() => {
					isSeeking = true;
				}}
				onpointerup={async () => {
					await seekToCurrentPosition();

					isSeeking = false;
				}}
				class="h-1 w-full cursor-pointer appearance-none rounded-full bg-green-300 accent-white"
			/>

			<div class="flex justify-between text-[10px] text-green-100">
				<span>{formatTime(position)}</span>
				<span>{formatTime(duration)}</span>
			</div>
		</div>
	</div>
{:else}
	<div class="flex items-center justify-center p-4">
		<button
			class="rounded bg-white px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
			onclick={openSpotifyApp}
			disabled={isLoading}
		>
			{isLoading ? 'Loading...' : 'Open Spotify'}
		</button>
	</div>
{/if}