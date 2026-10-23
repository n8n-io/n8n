import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	PHASE_MARKER,
	PREVIEW_PHASES,
	createPhaseScanner,
	parsePhaseMarker,
	phaseIndex,
	phaseMarkerLine,
	shellPhaseEcho,
} from './preview-phases.mjs';

describe('PREVIEW_PHASES', () => {
	it('has a unique, shell-safe key and a label for every phase', () => {
		const keys = PREVIEW_PHASES.map((phase) => phase.key);

		assert.equal(new Set(keys).size, keys.length);
		for (const phase of PREVIEW_PHASES) {
			assert.match(phase.key, /^[a-z][a-z0-9-]*$/);
			assert.ok(phase.label, `${phase.key} needs a label`);
		}
	});

	it('orders the phases the way a run runs them', () => {
		assert.ok(phaseIndex('resolve') < phaseIndex('build'));
		assert.ok(phaseIndex('build') < phaseIndex('share'));
		assert.equal(phaseIndex('not-a-phase'), -1);
		assert.equal(phaseIndex(undefined), -1);
	});

	// A hint on a phase that a short wait already caps would only fire in the
	// seconds before that wait hard-fails.
	it('warns about a long tail only where there is one', () => {
		const slow = PREVIEW_PHASES.filter((phase) => phase.slowAfterMs).map((phase) => phase.key);

		assert.deepEqual(slow, ['box', 'ssh', 'install', 'build']);
	});
});

describe('phaseMarkerLine', () => {
	it('round-trips through parsePhaseMarker, with and without a detail', () => {
		assert.deepEqual(parsePhaseMarker(phaseMarkerLine('build')), { key: 'build' });
		assert.deepEqual(parsePhaseMarker(phaseMarkerLine('box', 'creating preview/pr-1234')), {
			key: 'box',
			detail: 'creating preview/pr-1234',
		});
	});

	it('refuses a key that is not a phase, so a typo cannot emit a dead marker', () => {
		assert.throws(() => phaseMarkerLine('buld'), /No such preview phase: buld/);
	});

	// One marker is echoed from the single-quoted `gh codespace ssh` command, so
	// this is a safety boundary rather than tidiness.
	it('emits one line of printable ASCII with no quote', () => {
		const line = phaseMarkerLine('box', "it's `whoami`\nand $more");

		assert.match(line, /^[\x20-\x7e]+$/);
		assert.ok(!line.includes("'"));
		assert.ok(!line.includes('`'));
		assert.deepEqual(parsePhaseMarker(line), { key: 'box', detail: 'its whoami and $more' });
	});

	it('truncates a long detail', () => {
		assert.equal(parsePhaseMarker(phaseMarkerLine('build', 'x'.repeat(500))).detail.length, 120);
	});
});

describe('shellPhaseEcho', () => {
	it('wraps the marker in the quoting it has to survive', () => {
		assert.equal(shellPhaseEcho('install'), `echo '${PHASE_MARKER} install'`);
		assert.throws(() => shellPhaseEcho('nope'));
	});
});

describe('parsePhaseMarker', () => {
	it('ignores ordinary log output', () => {
		assert.equal(parsePhaseMarker(''), undefined);
		assert.equal(parsePhaseMarker('Tasks:    112 successful, 112 total'), undefined);
		assert.equal(parsePhaseMarker(`about to print a ${PHASE_MARKER} marker`), undefined);
	});

	it('ignores a key that is not a phase, so a stray line cannot move the checklist', () => {
		assert.equal(parsePhaseMarker(`${PHASE_MARKER} rm-rf`), undefined);
		assert.equal(parsePhaseMarker(`${PHASE_MARKER} BUILD`), undefined);
		assert.equal(parsePhaseMarker(PHASE_MARKER), undefined);
	});

	it('reads a marker that the stream indented or padded', () => {
		assert.deepEqual(parsePhaseMarker(`  ${PHASE_MARKER}  start  \r`), { key: 'start' });
	});
});

describe('createPhaseScanner', () => {
	it('finds a marker split across two chunks', () => {
		const scan = createPhaseScanner();

		assert.deepEqual(scan(`${PHASE_MARKER} bu`), []);
		assert.deepEqual(scan('ild\n'), [{ key: 'build' }]);
	});

	it('finds every marker in one chunk and keeps their order', () => {
		const scan = createPhaseScanner();
		const chunk = [
			`${PHASE_MARKER} checkout abcdef1`,
			'Lockfile is up to date, resolution step is skipped',
			`${PHASE_MARKER} install`,
			'',
		].join('\n');

		assert.deepEqual(scan(chunk), [
			{ key: 'checkout', detail: 'abcdef1' },
			{ key: 'install' },
		]);
	});

	// ssh delivers \r\n, and pnpm writes \r-terminated progress with no newline.
	it('handles CRLF and bare carriage returns', () => {
		const scan = createPhaseScanner();

		assert.deepEqual(scan(`${PHASE_MARKER} build\r\n`), [{ key: 'build' }]);
		assert.deepEqual(scan(`Progress: 12/99\r${PHASE_MARKER} start\r`), [{ key: 'start' }]);
	});

	it('does not lose a marker behind a long line with no break', () => {
		const scan = createPhaseScanner();

		assert.deepEqual(scan('x'.repeat(20_000)), []);
		assert.deepEqual(scan(`\n${PHASE_MARKER} share\n`), [{ key: 'share' }]);
	});

	it('returns nothing for plain build output', () => {
		const scan = createPhaseScanner();

		assert.deepEqual(scan('> n8n@1.0.0 build /workspaces/n8n\nTasks: 112 total\n'), []);
	});
});
