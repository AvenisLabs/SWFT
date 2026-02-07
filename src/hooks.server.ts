// hooks.server.ts v0.1.0 — CORS, error handling for /api/* routes

import type { Handle } from '@sveltejs/kit';

/** Allowed origins for CORS — allow all in dev, restrict in prod */
const ALLOWED_ORIGINS = ['*'];

export const handle: Handle = async ({ event, resolve }) => {
	// Handle CORS preflight for API routes
	if (event.request.method === 'OPTIONS' && event.url.pathname.startsWith('/api/')) {
		return new Response(null, {
			status: 204,
			headers: getCorsHeaders(event.request),
		});
	}

	const response = await resolve(event);

	// Attach CORS headers to all /api/* responses
	if (event.url.pathname.startsWith('/api/')) {
		const corsHeaders = getCorsHeaders(event.request);
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
	}

	return response;
};

function getCorsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('Origin') ?? '*';
	const allowedOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : origin;

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}
