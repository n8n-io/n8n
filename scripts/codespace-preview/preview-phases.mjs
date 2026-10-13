// The phase vocabulary of a preview, shared by all three ends.
//
// `preview.mjs` runs on a laptop or a CI runner, `preview-serve.mjs` runs inside
// the box, and `.github/scripts/codespace-preview.mjs` renders the PR comment from
// what the other two report. All three import this file, so the checklist and the
// emitters cannot drift.
//
// A phase crosses the gap as one line of printable ASCII. The in-box markers travel
// through `gh codespace ssh`, and one is echoed from that single-quoted command, so
// a marker must never carry a quote or a newline.
export const PHASE_MARKER = '##preview-phase##';

// Ordered: the renderer ticks off everything before the current phase.
//
// `slowAfterMs` is only set where a phase has a long tail worth warning about. The
// phases capped by a short wait — checkout, start (2 min health + 3 min readiness)
// and share (2 min) — get none: a hint would fire in the seconds before the wait
// hard-fails and says nothing the failure will not.
export const PREVIEW_PHASES = /** @type { const } */ ([
	{ key: 'resolve', label: 'Resolve the PR head' },
	{ key: 'box', label: 'Prepare the box', slowAfterMs: 480_000 },
	{ key: 'ssh', label: 'Wait for SSH', slowAfterMs: 180_000 },
	{ key: 'checkout', label: 'Check out the commit' },
	{ key: 'install', label: 'Install dependencies', slowAfterMs: 180_000 },
	{ key: 'build', label: 'Build the monorepo', slowAfterMs: 600_000 },
	{ key: 'start', label: 'Start n8n' },
	{ key: 'share', label: 'Share the port with the org' },
]);

/**
 * Position of a phase in the checklist, or -1 for anything we do not know.
 *
 * @param {string | undefined} key
 */
export function phaseIndex(key) {
	return PREVIEW_PHASES.findIndex((phase) => phase.key === key);
}

/**
 * A detail is free text written by us, but it still ends up in a shell string and
 * in markdown. Keep it to one short run of printable ASCII with no quote.
 *
 * @param {string | undefined} detail
 */
function sanitizeDetail(detail) {
	if (!detail) return '';
	// Collapse whitespace before dropping characters, so a newline leaves a word
	// break behind rather than joining the two words it separated.
	return [...detail.replace(/\s+/g, ' ')]
		.filter((char) => char >= ' ' && char <= '~' && char !== "'" && char !== '`')
		.join('')
		.trim()
		.slice(0, 120);
}

/**
 * The line an emitter prints to announce a phase. Throws on a key that is not in
 * the table: a typo would otherwise emit a marker the renderer silently drops.
 *
 * @param {string} key
 * @param {string} [detail] What this run is doing in that phase.
 */
export function phaseMarkerLine(key, detail) {
	if (phaseIndex(key) === -1) throw new Error(`No such preview phase: ${key}`);
	const suffix = sanitizeDetail(detail);
	return `${PHASE_MARKER} ${key}${suffix ? ` ${suffix}` : ''}`;
}

/**
 * The shell command that announces a phase from inside the `gh codespace ssh`
 * chain. The quoting lives here, next to the format it has to survive.
 *
 * @param {string} key
 * @param {string} [detail]
 */
export function shellPhaseEcho(key, detail) {
	return `echo '${phaseMarkerLine(key, detail)}'`;
}

/**
 * Read a marker back. An unknown key is not a phase: the in-box stream is ordinary
 * build output, and a stray or forged line must not move the checklist.
 *
 * @param {string} line
 * @returns {{key: string, detail?: string} | undefined}
 */
export function parsePhaseMarker(line) {
	const trimmed = (line ?? '').trim();
	if (!trimmed.startsWith(`${PHASE_MARKER} `)) return undefined;

	const [key, ...rest] = trimmed.slice(PHASE_MARKER.length).trim().split(' ');
	if (phaseIndex(key) === -1) return undefined;

	const detail = rest.join(' ').trim();
	return detail ? { key, detail } : { key };
}

// A spinner or a binary blob must not grow the buffer without bound.
const MAX_LINE = 8192;

/**
 * Complete lines out of a stream that arrives in chunks. Both hops need this — the
 * runner relaying the box's output, and the CI wrapper reading the runner's stdout —
 * so the fiddly part of the feature is written and tested once.
 *
 * @returns {(chunk: string | Buffer) => string[]}
 */
export function createLineSplitter() {
	let partial = '';

	return (chunk) => {
		partial += String(chunk);
		// Split on a bare \r too: `pnpm install` and turbo write \r-terminated
		// progress, which would otherwise park a line behind one that never ends.
		const lines = partial.split(/\r\n|\n|\r/);
		partial = lines.pop() ?? '';
		if (partial.length > MAX_LINE) partial = '';

		return lines;
	};
}

/**
 * The markers in a chunked stream, in the order they arrive.
 *
 * @returns {(chunk: string | Buffer) => Array<{key: string, detail?: string}>}
 */
export function createPhaseScanner() {
	const split = createLineSplitter();

	return (chunk) => split(chunk).map(parsePhaseMarker).filter((marker) => marker !== undefined);
}
