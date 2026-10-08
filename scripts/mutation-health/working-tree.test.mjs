/**
 * The main promise of the tool: it never writes the working tree. Stryker
 * mutates a copy of the package, and the tool writes only its reports. So an
 * edit that another agent makes while a run is in flight stays, whatever way
 * the run ends. A tool that puts files back after a run (as in place mode
 * needed) reverts such an edit, and fails here.
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	lstatSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	readlinkSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runJob } from './mutate.mjs';
import { toPosix } from './targets.mjs';
import { fakeProcess, fakeSpawn, resolveFakeStrykerBin, sink, writeTree } from './test-doubles.mjs';

const PACKAGE_DIR = 'packages/@n8n/pkg';
const TARGET = `${PACKAGE_DIR}/src/a.ts`;
// A file that the package's config can reach with `..`, through the mirror.
const SIBLING = 'packages/@n8n/sib/x.ts';
const REPORTS = `${PACKAGE_DIR}/reports`;
// What another agent writes while the run is in flight.
const EDITS = {
	[TARGET]: 'export const a = 40 + 2;\n',
	[SIBLING]: 'edited during the run\n',
};

// A Stryker report with one killed mutant.
const REPORT = {
	files: {
		'src/a.ts': {
			source: 'export const a = 1 + 2;\n',
			mutants: [
				{
					id: '1',
					mutatorName: 'ArithmeticOperator',
					status: 'Killed',
					location: { start: { line: 1, column: 17 }, end: { line: 1, column: 22 } },
					replacement: '1 - 2',
				},
			],
		},
	},
};

let root;

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'mutate-tree-'));
	writeTree(root, {
		[`${PACKAGE_DIR}/package.json`]: { name: 'pkg', scripts: { test: 'vitest run' } },
		[TARGET]: REPORT.files['src/a.ts'].source,
		[`${PACKAGE_DIR}/src/a.test.ts`]: 'it("a", () => {});\n',
		[SIBLING]: 'sibling\n',
		'README.md': 'repo\n',
	});
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

// Each entry under `dir`: a file maps to its content, a dir to '<dir>' and a
// link to its target.
function snapshotTree(dir, out = new Map()) {
	for (const name of readdirSync(dir)) {
		const abs = path.join(dir, name);
		const rel = toPosix(path.relative(root, abs));
		const stat = lstatSync(abs);
		if (stat.isSymbolicLink()) {
			out.set(rel, `-> ${readlinkSync(abs)}`);
		} else if (stat.isDirectory()) {
			out.set(rel, '<dir>');
			snapshotTree(abs, out);
		} else {
			out.set(rel, readFileSync(abs, 'utf8'));
		}
	}
	return out;
}

// Each path that was added, removed or changed between two snapshots.
function changedPaths(before, after) {
	const paths = new Set([...before.keys(), ...after.keys()]);
	return [...paths].filter((p) => before.get(p) !== after.get(p)).sort();
}

const isReport = (p) => p === REPORTS || p.startsWith(`${REPORTS}/`);

/**
 * Run one job with a fake Stryker. While Stryker "runs", the edits are made,
 * then `end` ends the run. Settles with how the job ended: 'resolved', the
 * exit code of its error, or `exit <code>` when the tool exited after a crash
 * (the job itself then never settles).
 */
async function runEditedJob(end) {
	const p = fakeProcess();
	const doubles = fakeSpawn({
		onSpawn: (child, call) =>
			setImmediate(() => {
				writeTree(root, EDITS);
				end(child, call, p);
			}),
	});
	const job = {
		pkgRoot: path.join(root, PACKAGE_DIR),
		packageDir: PACKAGE_DIR,
		targets: ['src/a.ts'],
	};
	const args = { configArg: undefined, testFiles: ['src/a.test.ts'], testCommand: undefined };
	const io = {
		resolveStrykerBin: resolveFakeStrykerBin,
		repoRoot: root,
		spawn: doubles.spawn,
		stdout: sink(),
		stderr: sink(),
		proc: p.proc,
		exit: p.exit,
		write: p.write,
	};
	const settled = runJob(job, args, io).then(
		() => 'resolved',
		(error) => error.exitCode,
	);
	return await Promise.race([settled, p.exited.then((code) => `exit ${code}`)]);
}

function writesReport(child, call) {
	writeFileSync(path.join(call.options.cwd, 'reports/mutation/raw.json'), JSON.stringify(REPORT));
	child.finish(0);
}

const ENDINGS = {
	'a run that wrote a report': { end: writesReport, ending: 'resolved' },
	'a run that wrote no report': { end: (child) => child.finish(1), ending: 'resolved' },
	'a Stryker that did not start': {
		end: (child) => child.emit('error', new Error('spawn ENOENT')),
		ending: 3,
	},
	'a run cancelled with SIGINT': {
		end: (child, _call, p) => {
			p.proc.emit('SIGINT');
			child.finish(130);
		},
		ending: 130,
	},
	'a crash of the tool': {
		end: (child, _call, p) => {
			p.proc.emit('uncaughtException', new Error('boom'));
			setImmediate(() => child.finish(130));
		},
		ending: 'exit 3',
	},
};

describe('runJob and the working tree', () => {
	for (const [name, { end, ending }] of Object.entries(ENDINGS)) {
		it(`keeps each edit made during ${name}, and writes only its reports`, async () => {
			const before = snapshotTree(root);
			assert.equal(await runEditedJob(end), ending);
			const after = snapshotTree(root);
			for (const [file, content] of Object.entries(EDITS)) {
				assert.equal(after.get(file), content, file);
			}
			// The mirror is gone too: a `.stryker-tmp` entry shows up here.
			const others = changedPaths(before, after).filter((p) => !(p in EDITS) && !isReport(p));
			assert.deepEqual(others, []);
		});
	}
});
