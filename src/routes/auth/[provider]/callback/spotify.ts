import { Buffer } from 'node:buffer';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import {
	authErrorRedirect,
	callbackUrl,
	consumeOauthState,
	setProviderSession
} from '$lib/server/auth';
import type { RequestHandler } from './$types';

type SpotifyTokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	scope?: string;
};

type SpotifyProfile = {
	id: string;
	display_name?: string | null;
	email?: string | null;
	external_urls?: {
		spotify?: string;
	};
};

const provider = 'spotify' as const;

export const handleSpotifyCallback: RequestHandler = async ({ cookies, fetch, url }) => {
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

	if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
		redirect(302, authErrorRedirect(provider, 'missing Spotify client credentials'));
	}

	const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(
				`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
			).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: callbackUrl(url.origin, provider)
		})
	});

	if (!tokenResponse.ok) {
		redirect(302, authErrorRedirect(provider, 'token exchange failed'));
	}

	const token = (await tokenResponse.json()) as SpotifyTokenResponse;
	const profileResponse = await fetch('https://api.spotify.com/v1/me', {
		headers: {
			Authorization: `Bearer ${token.access_token}`
		}
	});

	if (!profileResponse.ok) {
		redirect(302, authErrorRedirect(provider, 'profile fetch failed'));
	}

	const profile = (await profileResponse.json()) as SpotifyProfile;
	const expiresAt = Date.now() + token.expires_in * 1000;
	const displayName = profile.display_name || profile.id;

	setProviderSession(cookies, provider, {
		accessToken: token.access_token,
		refreshToken: token.refresh_token,
		expiresAt,
		scope: token.scope,
		account: {
			id: profile.id,
			displayName,
			username: profile.id,
			email: profile.email ?? undefined,
			profileUrl: profile.external_urls?.spotify,
			expiresAt,
			scope: token.scope
		}
	});

	redirect(302, '/?spotify=connected');
};
