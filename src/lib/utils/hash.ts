// hash.ts v0.1.0 — Content hashing for deduplication

/** Compute a SHA-256 hex digest from a string (works in Workers runtime) */
export async function sha256(content: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
