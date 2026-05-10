import { getProvider } from '$lib/server/auth';
import { handleSpotifyCallback } from './spotify';
import { handleStravaCallback } from './strava';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const provider = getProvider(event.params.provider);

	return provider === 'spotify'
		? handleSpotifyCallback(event)
		: handleStravaCallback(event);
};
