#!/usr/bin/env node
/**
 * Ratchet guard for `turbo boundaries` (undeclared deps, reach-in imports, type-only imports).
 * The repo has a backlog of issues, so the check fails only on issues that are not in
 * `.boundaries-baseline.json`. Entries are keyed by file, import and rule, without line
 * numbers, so unrelated edits do not invalidate them.
 *
 * The nightly `util-update-boundaries-baseline.yml` removes fixed entries. Nothing adds
 * entries automatically.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const write = process.argv.includes('--write');
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = join(repoRoot, '.boundaries-baseline.json');

const RULES = {
	'undeclared-dependency': {
		test: (msg) => /becauseitisnotadependency$/.test(msg),
		label: 'package is not a dependency',
		fix: 'Add the package to `dependencies` or `devDependencies` in the package.json of the importing package. If it is not a real package (for example a virtual module), add it to `boundaries.implicitDependencies` in turbo.json.',
	},
	'leaves-package': {
		test: (msg) => /leavesthepackage$/.test(msg),
		label: 'import reaches into another package',
		fix: 'Import the other package by its name (for example `@n8n/foo`), not by a relative path into its folder. Add it as a dependency if necessary.',
	},
	'type-only-import': {
		test: (msg) => /typedeclarationpackage/.test(msg),
		label: 'value import from a type declaration (@types/*) package',
		fix: 'Use `import type` if you import only types. If the runtime supplies the module and npm has only its types, add the module to `boundaries.implicitDependencies` in turbo.json.',
	},
};

/** Parse turbo's miette output into one record for each diagnostic. */
function parseDiagnostics(output) {
	const blocks = output.split(/^ {2}x /m).slice(1);
	return blocks.map((block) => {
		const lines = block.split('\n');
		const headerEnd = lines.findIndex((line) => /^\s*,-\[/.test(line));
		if (headerEnd === -1) throw new Error(`No location in diagnostic:\n  x ${block}`);

		// turbo wraps the header at 80 columns with a `|` marker, sometimes inside a path.
		const message = lines
			.slice(0, headerEnd)
			.map((line, i) => (i === 0 ? line : line.replace(/^\s*\|\s?/, '')))
			.join(' ')
			.trim();
		const compact = message.replace(/\s+/g, '');

		const [, absPath, lineNo, colNo] = lines[headerEnd].match(/,-\[(.+):(\d+):(\d+)\]/);
		const file = relative(repoRoot, absPath);
		const line = Number(lineNo);
		const col = Number(colNo);

		const sourceLine = lines
			.slice(headerEnd + 1)
			.map((l) => l.match(/^\s*(\d+) \| ?(.*)$/))
			.find((m) => m && Number(m[1]) === line)?.[2];
		const specifier =
			sourceLine?.slice(col - 1).match(/^(['"`])(.+?)\1/)?.[2] ??
			compact.match(/`([^`]+)`/)?.[1] ??
			'?';

		const rule = Object.entries(RULES).find(([, r]) => r.test(compact))?.[0] ?? `other: ${message}`;

		return { file, line, col, message, specifier, rule, key: `${file} -> ${specifier} [${rule}]` };
	});
}

// Sanctioned exceptions. They do not go in the baseline, so new code can use them freely.
const EXEMPTIONS = {
	// tsconfig path alias for NodeTestHarness, the sanctioned way to write node workflow tests.
	'node-test-harness': (d) =>
		d.rule === 'leaves-package' && d.specifier.startsWith('@nodes-testing/'),
	// Container tests share the test-only stack implementation through this path.
	'container-harness': (d) =>
		d.rule === 'leaves-package' && d.specifier.startsWith('../../../containers/'),
	// Editor browser shim: re-exports source to keep isolated-vm out of the bundle.
	'browser-shim': (d) =>
		d.rule === 'leaves-package' &&
		d.file === 'packages/frontend/editor-ui/vite/expression-runtime-stub.ts' &&
		/^(\.\.\/)+@n8n\/(expression-runtime|errors)\/src\//.test(d.specifier),
};

/** Entries of `a` that `b` does not cover, counting duplicates. */
function multisetDiff(a, b, keyOf = (x) => x) {
	const remaining = new Map();
	for (const k of b) remaining.set(k, (remaining.get(k) ?? 0) + 1);
	return a.filter((x) => {
		const n = remaining.get(keyOf(x)) ?? 0;
		if (n === 0) return true;
		remaining.set(keyOf(x), n - 1);
		return false;
	});
}

// turbo exits non-zero when issues exist; we read the output regardless.
const result = spawnSync('pnpm', ['turbo', 'boundaries'], { encoding: 'utf8', cwd: repoRoot });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const totalMatch = output.match(/(\d+) issues found/);

let diagnostics;
try {
	diagnostics = parseDiagnostics(output);
} catch (error) {
	diagnostics = undefined;
	console.error(error.message);
}
if (!totalMatch || !diagnostics || diagnostics.length !== Number(totalMatch[1])) {
	console.error(
		`Could not parse \`turbo boundaries\` output (parsed ${diagnostics?.length ?? 0} diagnostics). Raw output:\n` +
			output,
	);
	process.exit(2);
}

const exemptedCounts = Object.fromEntries(Object.keys(EXEMPTIONS).map((name) => [name, 0]));
const issues = diagnostics.filter((d) => {
	const exemption = Object.entries(EXEMPTIONS).find(([, isExempt]) => isExempt(d));
	if (exemption) exemptedCounts[exemption[0]]++;
	return !exemption;
});
const currentKeys = issues.map((d) => d.key).sort();

if (write) {
	const previous = JSON.parse(readFileSync(baselineFile, 'utf8')).issues;
	writeFileSync(
		baselineFile,
		JSON.stringify({ issues: currentKeys.length, entries: currentKeys }, null, '\t') + '\n',
	);
	console.log(`Wrote baseline: ${currentKeys.length} issues (was ${previous}).`);
	process.exit(0);
}

const baselineKeys = JSON.parse(readFileSync(baselineFile, 'utf8')).entries ?? [];
const newIssues = multisetDiff(issues, baselineKeys, (d) => d.key);
const fixedKeys = multisetDiff(baselineKeys, currentKeys);

const exemptedSummary = Object.entries(exemptedCounts)
	.map(([name, n]) => `${n} ${name}`)
	.join(', ');
console.log(
	`turbo boundaries: ${issues.length} issues, ${baselineKeys.length} in baseline (exempted: ${exemptedSummary})`,
);

if (newIssues.length > 0) {
	const s = newIssues.length === 1 ? '' : 's';
	const lines = [
		'',
		`Boundaries check failed: ${newIssues.length} new issue${s} not in .boundaries-baseline.json.`,
		'The other issues reported by `turbo boundaries` are known. Ignore them.',
		'',
	];
	for (const d of newIssues) {
		lines.push(`  ${d.file}:${d.line}:${d.col}`);
		lines.push(`    import '${d.specifier}': ${RULES[d.rule]?.label ?? d.message}`);
	}
	lines.push('', 'How to fix:');
	for (const rule of new Set(newIssues.map((d) => d.rule))) {
		lines.push(
			`  - ${RULES[rule]?.label ?? rule}: ${RULES[rule]?.fix ?? 'See https://turborepo.com/docs/reference/boundaries'}`,
		);
	}
	lines.push(
		'',
		'If you only moved or renamed a file that already had these issues, run `pnpm boundaries:baseline` and commit the result.',
		'Re-check with `pnpm boundaries:check`.',
	);
	console.error(lines.join('\n'));

	if (process.env.GITHUB_ACTIONS) {
		for (const d of newIssues) {
			const text = `import '${d.specifier}': ${RULES[d.rule]?.label ?? d.message}. ${RULES[d.rule]?.fix ?? ''}`;
			console.log(
				`::error file=${d.file},line=${d.line},col=${d.col},title=New boundaries issue::${text.replace(/\n/g, ' ')}`,
			);
		}
	}
	process.exit(1);
}

if (fixedKeys.length > 0) {
	console.log(
		`\nNice — ${fixedKeys.length} baseline issue(s) no longer occur.\n` +
			'Run `pnpm boundaries:baseline` to lock in the win.',
	);
}

process.exit(0);
