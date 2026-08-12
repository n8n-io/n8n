const SCRIPT_CONTEXT_ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'>': '\\u003e',
	'&': '\\u0026',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
};

/**
 * Returns a JSON literal safe to embed inside an inline `<script>` block.
 * Escapes `<`/`>` to prevent a `</script>` breakout and U+2028/U+2029 for
 * legacy JS engines. Same approach the Chat Trigger node takes.
 */
export function escapeForScriptContext(value: unknown): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => SCRIPT_CONTEXT_ESCAPES[c] ?? c);
}

/**
 * Cache-busts the runtime asset URLs so a CDN in front of this instance never
 * needs a manual purge: every process boot (a fresh deploy, a restart) gets a
 * new value, so the URL itself changes and the CDN has to fetch fresh rather
 * than keep serving whatever it cached under the old, unversioned path.
 */
const RUNTIME_BUILD_ID = Date.now();

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * The served page. The definition is inlined; the runtime is loaded from n8n's
 * static route, where the @n8n/ui-builder build drops it. `static` is listed in
 * nonUIRoutes (packages/cli/src/server.ts) so it is served verbatim rather than
 * being rewritten to index.html.
 *
 * The token, when there is one, rides along with it: the page is the session,
 * and the runtime sends it back as a bearer header on every action.
 *
 * The title is inlined as well as set on the tag, because a multi-page app
 * rewrites the tab as it navigates and needs the app's half of `page - app`.
 */
export function getAppPage(title: string, definition: unknown, token?: string): string {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(title)}</title>
		<link rel="stylesheet" href="/static/ui-runtime.css?v=${RUNTIME_BUILD_ID}" />
		<style>
			html, body { margin: 0; padding: 0; height: 100%; }
		</style>
	</head>
	<body>
		<div id="app"></div>
		<script>window.__N8N_UI__ = ${escapeForScriptContext({ definition, token, title })};</script>
		<script type="module" src="/static/ui-runtime.js?v=${RUNTIME_BUILD_ID}"></script>
	</body>
</html>`;
}
