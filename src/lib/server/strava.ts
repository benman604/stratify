import { env } from '$env/dynamic/private';
import { getProviderSession, setProviderSession, type StravaSession } from '$lib/server/auth';
import { toRoute, type Route, type StravaActivity } from '$lib/types/strava';
import type { Cookies } from '@sveltejs/kit';

type Fetch = typeof fetch;

type StravaRefreshResponse = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
};

export async function getStravaRoutes(cookies: Cookies, eventFetch: Fetch): Promise<Route[]> {
	const session = getProviderSession(cookies, 'strava');

	if (!isStravaSession(session)) {
		return [];
	}

	const activeSession = await refreshStravaSessionIfNeeded(cookies, eventFetch, session);
	const response = await eventFetch(
		'https://www.strava.com/api/v3/athlete/activities?per_page=100',
		{
			headers: {
				Authorization: `Bearer ${activeSession.accessToken}`
			}
		}
	);

	if (!response.ok) {
		return [];
	}

	const activities = (await response.json()) as StravaActivity[];

	return activities
		.map(toRoute)
		.filter((route): route is Route => route !== null)
		.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

function isStravaSession(session: unknown): session is StravaSession {
	return (
		typeof session === 'object' &&
		session !== null &&
		'refreshToken' in session &&
		typeof session.refreshToken === 'string'
	);
}

async function refreshStravaSessionIfNeeded(
	cookies: Cookies,
	eventFetch: Fetch,
	session: StravaSession
) {
	if (session.expiresAt > Date.now() + 60_000) {
		return session;
	}

	if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
		return session;
	}

	const response = await eventFetch('https://www.strava.com/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.STRAVA_CLIENT_ID,
			client_secret: env.STRAVA_CLIENT_SECRET,
			grant_type: 'refresh_token',
			refresh_token: session.refreshToken
		})
	});

	if (!response.ok) {
		return session;
	}

	const token = (await response.json()) as StravaRefreshResponse;
	const refreshedSession = {
		...session,
		accessToken: token.access_token,
		refreshToken: token.refresh_token,
		expiresAt: token.expires_at * 1000,
		account: {
			...session.account,
			expiresAt: token.expires_at * 1000
		}
	};

	setProviderSession(cookies, 'strava', refreshedSession);
	return refreshedSession;
}
