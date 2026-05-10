import { redirect } from '@sveltejs/kit';
import { clearProviderSession } from '$lib/server/auth';
import { getProvider } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, params }) => {
	const provider = getProvider(params.provider);
	clearProviderSession(cookies, provider);
	redirect(302, `/?${provider}=logged_out`);
};
