// +layout.server.ts v0.1.0 — Expose CF Access user to /notifications/* pages.
// hooks.server.ts has already loaded authEmail + authUser onto locals and
// enforced the 401/403 gates, so we just pass them through.

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		authEmail: locals.authEmail,
		authUser: locals.authUser,
	};
};
