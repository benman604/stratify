import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import {
	authErrorRedirect,
	callbackUrl,
	makeState,
	setOauthState,
    getProvider,
    type Service,
} from '$lib/server/auth';
import type { RequestHandler } from './$types';

const spotifyScopes = [
	'user-read-email',
	'user-read-private',
	'playlist-read-private',
	'playlist-modify-private'
];

export const GET: RequestHandler = ({ cookies, url, params }) => {
	const provider = getProvider(params.provider);
	const state = makeState();
	setOauthState(cookies, provider, state);

	if (provider === 'spotify') {
		if (!env.SPOTIFY_CLIENT_ID) {
			redirect(302, authErrorRedirect(provider, 'missing SPOTIFY_CLIENT_ID'));
		}

		const authUrl = new URL('https://accounts.spotify.com/authorize');
		authUrl.search = new URLSearchParams({
			response_type: 'code',
			client_id: env.SPOTIFY_CLIENT_ID,
			scope: spotifyScopes.join(' '),
			redirect_uri: callbackUrl(url.origin, provider),
			state,
			show_dialog: 'true'
		}).toString();

		redirect(302, authUrl);
	} else { // provider === 'strava'
        if (!env.STRAVA_CLIENT_ID) {
            redirect(302, authErrorRedirect(provider, 'missing STRAVA_CLIENT_ID'));
        }

        const authUrl = new URL('https://www.strava.com/oauth/authorize');
        authUrl.search = new URLSearchParams({
            client_id: env.STRAVA_CLIENT_ID,
            redirect_uri: callbackUrl(url.origin, provider),
            response_type: 'code',
            approval_prompt: 'auto',
            scope: 'read,activity:read',
            state
        }).toString();

        redirect(302, authUrl);
    }
};
