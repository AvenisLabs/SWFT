// GET /api/v1/events/[id] — Single event by ID
// v0.1.0

import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { jsonResponse, errorResponse } from '$lib/server/cache';
import { getEventById } from '$lib/server/events';

export const GET: RequestHandler = async ({ platform, params }) => {
	try {
		const db = getDb(platform);
		const id = parseInt(params.id, 10);
		if (isNaN(id)) {
			return errorResponse('Invalid event ID', 400);
		}

		const event = await getEventById(db, id);
		if (!event) {
			return errorResponse('Event not found', 404);
		}

		return jsonResponse({ ok: true, data: event });
	} catch (err) {
		console.error('[api/v1/events/:id]', err);
		return errorResponse('Failed to fetch event');
	}
};
