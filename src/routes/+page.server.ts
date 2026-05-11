import { getAuthError, getConnectedAccount } from '$lib/server/auth';
import { getStravaRoutes } from '$lib/server/strava';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	return {
		authError: getAuthError(url),
		spotify: getConnectedAccount(cookies, 'spotify'),
		strava: getConnectedAccount(cookies, 'strava'),
		routes: await getStravaRoutes(cookies, fetch)
	};
};