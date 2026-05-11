import { getProviderSession, setProviderSession, type StravaSession } from '$lib/server/auth';
import type { Photo } from '$lib/types/strava';
import type { RequestHandler, Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

type StravaRefreshResponse = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
};

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
	eventFetch: typeof fetch,
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

export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const { id } = params;

	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing activity ID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const session = getProviderSession(cookies, 'strava');

	if (!isStravaSession(session)) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const activeSession = await refreshStravaSessionIfNeeded(cookies, fetch, session);
		const response = await fetch(
			`https://www.strava.com/api/v3/activities/${id}/photos?size=600`,
			{
				headers: {
					Authorization: `Bearer ${activeSession.accessToken}`
				}
			}
		);

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Failed to fetch photos' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const photos = (await response.json()) as Photo[];
		return new Response(JSON.stringify(photos), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Error fetching photos:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
