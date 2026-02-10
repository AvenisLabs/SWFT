// link-crawler.ts v0.2.0 — Extracts external links + text from site pages using HTMLRewriter

/** Link info: maps url → (page_path → link_text) */
export type LinkMap = Map<string, Map<string, string>>;

/** Crawl site pages and extract all external <a href> links with their text */
export async function crawlExternalLinks(
	siteUrl: string,
	paths: string[]
): Promise<LinkMap> {
	const linkMap: LinkMap = new Map();
	const siteOrigin = new URL(siteUrl).origin;

	for (const path of paths) {
		const pageUrl = `${siteOrigin}${path}`;
		try {
			const links = await extractLinksFromPage(pageUrl, siteOrigin);
			for (const { url, text } of links) {
				const existing = linkMap.get(url);
				if (existing) {
					// Keep first text found per page, don't overwrite
					if (!existing.has(path)) existing.set(path, text);
				} else {
					linkMap.set(url, new Map([[path, text]]));
				}
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.warn(`[link-crawler] Failed to fetch ${pageUrl}: ${msg}`);
		}
	}

	return linkMap;
}

interface ExtractedLink {
	url: string;
	text: string;
}

/** Fetch a single page and extract external links + text via HTMLRewriter */
async function extractLinksFromPage(pageUrl: string, siteOrigin: string): Promise<ExtractedLink[]> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);

	try {
		const res = await fetch(pageUrl, {
			signal: controller.signal,
			headers: { 'User-Agent': 'SWFT-LinkChecker/1.0 (site health monitor)' },
		});

		if (!res.ok) {
			throw new Error(`HTTP ${res.status} for ${pageUrl}`);
		}

		const links: ExtractedLink[] = [];
		// Track current link being parsed (for text extraction)
		let currentHref: string | null = null;
		let currentText = '';

		const rewritten = new HTMLRewriter()
			.on('a[href]', {
				element(el) {
					const href = el.getAttribute('href');
					if (!href) return;

					// Skip fragment-only, mailto, tel, javascript links
					if (href.startsWith('#') || href.startsWith('mailto:') ||
						href.startsWith('tel:') || href.startsWith('javascript:')) return;

					try {
						const resolved = new URL(href, pageUrl);
						// Only keep external links (different origin)
						if (resolved.origin !== siteOrigin && resolved.protocol.startsWith('http')) {
							resolved.hash = '';
							currentHref = resolved.href;
							currentText = '';
						}
					} catch {
						// Malformed URL — skip silently
					}

					// Use onEndTag to finalize the link text
					el.onEndTag(() => {
						if (currentHref) {
							links.push({ url: currentHref, text: currentText.trim() });
							currentHref = null;
							currentText = '';
						}
					});
				},
				text(chunk) {
					if (currentHref) {
						currentText += chunk.text;
					}
				},
			})
			.transform(res);

		// Consume the stream to trigger the rewriter
		await rewritten.text();

		return links;
	} finally {
		clearTimeout(timeout);
	}
}
