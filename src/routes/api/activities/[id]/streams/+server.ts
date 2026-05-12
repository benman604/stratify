import { json } from '@sveltejs/kit';
import { getProviderSession } from '$lib/server/auth';
import type { RequestEvent } from './$types';
import { refreshStravaSessionIfNeeded } from '$lib/server/strava';

export async function GET(event: RequestEvent) {
	const { params, cookies, fetch } = event;
	const id = params.id;
	
	const session = getProviderSession(cookies, 'strava');
	if (!session || !('accessToken' in session)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const activeSession = await refreshStravaSessionIfNeeded(cookies, fetch, session as any);
	
	const keys = 'time,distance,latlng,altitude,velocity_smooth';
	const url = `https://www.strava.com/api/v3/activities/${id}/streams?keys=${keys}&key_by_type=true`;
	
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${activeSession.accessToken}`
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return json({ error: text }, { status: response.status });
	}

	const data = await response.json();
	return json(data);
}
