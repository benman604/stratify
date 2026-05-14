import { Buffer } from 'node:buffer';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

export type Service = 'spotify' | 'strava';

type CookieValue = Record<string, unknown>;

export type ConnectedAccount = {
	id: string;
	displayName: string;
	username?: string;
	email?: string;
	profileUrl?: string;
	expiresAt: number;
	scope?: string;
	accessToken?: string;
};

export type SpotifySession = {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	scope?: string;
	account: ConnectedAccount;
};

export type StravaSession = {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	scope?: string;
	account: ConnectedAccount;
};

export type ProviderSession = SpotifySession | StravaSession;

const cookieNames = {
	spotifySession: 'stratify_spotify_session',
	stravaSession: 'stratify_strava_session',
	spotifyState: 'stratify_spotify_oauth_state',
	stravaState: 'stratify_strava_oauth_state'
} as const;

const sessionCookieOptions = {
	httpOnly: true,
	sameSite: 'lax',
	secure: !dev,
	path: '/',
	maxAge: 60 * 60 * 24 * 30
} as const;

const stateCookieOptions = {
	httpOnly: true,
	sameSite: 'lax',
	secure: !dev,
	path: '/',
	maxAge: 60 * 10
} as const;

export function makeState() {
	return crypto.randomUUID();
}

export function callbackUrl(origin: string, service: Service) {
	return `${origin}/auth/${service}/callback`;
}

export function setOauthState(cookies: Cookies, service: Service, state: string) {
	cookies.set(stateCookieName(service), state, stateCookieOptions);
}

export function consumeOauthState(cookies: Cookies, service: Service) {
	const name = stateCookieName(service);
	const value = cookies.get(name);
	cookies.delete(name, { path: '/' });
	return value;
}

export function setProviderSession(cookies: Cookies, service: Service, session: ProviderSession) {
	cookies.set(sessionCookieName(service), encodeCookie(session), sessionCookieOptions);
}

export function clearProviderSession(cookies: Cookies, service: Service) {
	cookies.delete(sessionCookieName(service), { path: '/' });
}

export function getProvider(provider: string | undefined): Service {
	if (provider === 'spotify') return 'spotify';
	if (provider === 'strava') return 'strava';

	throw error(404, 'Unknown provider');
}

export function getProviderSession(cookies: Cookies, service: Service) {
	return decodeCookie<ProviderSession>(cookies.get(sessionCookieName(service)));
}

export function getConnectedAccount(cookies: Cookies, service: Service) {
	const session = getProviderSession(cookies, service);
	const account = session?.account;
	if (service === 'spotify' && account) {
		// client requires access token for Web Playback SDK
		account.accessToken = session?.accessToken;
	}
	return account ?? null;
}

export function getAuthError(url: URL) {
	return url.searchParams.get('auth_error');
}

export function authErrorRedirect(service: Service, message: string) {
	const params = new URLSearchParams({
		auth_error: `${service}: ${message}`
	});

	return `/?${params.toString()}`;
}

function stateCookieName(service: Service) {
	return service === 'spotify' ? cookieNames.spotifyState : cookieNames.stravaState;
}

function sessionCookieName(service: Service) {
	return service === 'spotify' ? cookieNames.spotifySession : cookieNames.stravaSession;
}

function encodeCookie(value: CookieValue) {
	return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCookie<T>(value: string | undefined) {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
	} catch {
		return null;
	}
}
