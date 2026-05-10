import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { authErrorRedirect, consumeOauthState, setProviderSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

type StravaTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	athlete?: StravaAthlete;
};

type StravaAthlete = {
	id: number;
	username?: string | null;
	firstname?: string | null;
	lastname?: string | null;
};

const provider = 'strava' as const;

export const handleStravaCallback: RequestHandler = async ({ cookies, fetch, url }) => {
	const authError = url.searchParams.get('error');
	if (authError) {
		redirect(302, authErrorRedirect(provider, authError));
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = consumeOauthState(cookies, provider);

	if (!code || !state || state !== storedState) {
		redirect(302, authErrorRedirect(provider, 'invalid OAuth state'));
	}

	if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
		redirect(302, authErrorRedirect(provider, 'missing Strava client credentials'));
	}

	const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.STRAVA_CLIENT_ID,
			client_secret: env.STRAVA_CLIENT_SECRET,
			code,
			grant_type: 'authorization_code'
		})
	});

	if (!tokenResponse.ok) {
		redirect(302, authErrorRedirect(provider, 'token exchange failed'));
	}

	const token = (await tokenResponse.json()) as StravaTokenResponse;
	const scope = url.searchParams.get('scope') ?? undefined;
	const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
		headers: {
			Authorization: `Bearer ${token.access_token}`
		}
	});

	if (!athleteResponse.ok) {
		redirect(302, authErrorRedirect(provider, 'athlete fetch failed'));
	}

	const athlete = ((await athleteResponse.json()) as StravaAthlete) ?? token.athlete;
	const expiresAt = token.expires_at * 1000;
	const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(' ');
	const username = athlete.username || undefined;
	const displayName = fullName || username || `Athlete ${athlete.id}`;

	setProviderSession(cookies, provider, {
		accessToken: token.access_token,
		refreshToken: token.refresh_token,
		expiresAt,
		scope,
		account: {
			id: String(athlete.id),
			displayName,
			username,
			profileUrl: `https://www.strava.com/athletes/${athlete.id}`,
			expiresAt,
			scope
		}
	});

	redirect(302, '/?strava=connected');
};
