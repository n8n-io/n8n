import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fixtureDirectory = fileURLToPath(
	new URL('../../packages/@n8n/eslint-config/src/rules/fixtures/raw-enum/', import.meta.url),
);
const oxlintPackageDirectory = fileURLToPath(
	new URL('../../packages/@n8n/oxlint-config/', import.meta.url),
);

const run = (command, args, cwd) => {
	try {
		return execFileSync(command, args, { cwd, encoding: 'utf8' });
	} catch (error) {
		if (error.status === 1 && typeof error.stdout === 'string') return error.stdout;
		throw error;
	}
};

const eslint = JSON.parse(
	run(
		'pnpm',
		['exec', 'eslint', '--config', 'eslint.config.mjs', '--format', 'json', '.'],
		fixtureDirectory,
	),
);
const oxlint = JSON.parse(
	run(
		'pnpm',
		[
			'exec',
			'oxlint',
			'--config',
			`${fixtureDirectory}/oxlint.config.mts`,
			'--format',
			'json',
			fixtureDirectory,
		],
		oxlintPackageDirectory,
	),
);

const eslintDiagnostics = eslint
	.flatMap(({ messages }) => messages)
	.filter(({ ruleId }) => ruleId === 'n8n-local-rules/no-raw-enum')
	.map(({ ruleId, message, line, column }) => ({ ruleId, message, line, column }));

const oxlintDiagnostics = oxlint.diagnostics
	.filter(({ code }) => code === 'n8n-local-rules(no-raw-enum)')
	.map(({ code, message, labels }) => ({
		ruleId: code.replace('(', '/').replace(')', ''),
		message,
		line: labels[0].span.line,
		column: labels[0].span.column,
	}));

assert.deepEqual(oxlintDiagnostics, eslintDiagnostics);
assert.equal(eslintDiagnostics.length, 2);

console.log('Raw-enum ESLint/Oxlint bridge parity passed.');
