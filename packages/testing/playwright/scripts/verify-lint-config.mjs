#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(packageDirectory, 'package.json'));
const playwrightPlugin = require('eslint-plugin-playwright');
const oxlintConfig = await import(pathToFileURL(join(packageDirectory, 'oxlint.config.mts')).href);
const { legacyFilenameCaseFiles } = await import(
	pathToFileURL(join(packageDirectory, 'lint-filename-debt.mjs')).href
);

const eslintRules = {
	...playwrightPlugin.configs['flat/recommended'].rules,
	'playwright/no-conditional-in-test': 'error',
};

const errorRuleIds = (rules) =>
	Object.entries(rules)
		.filter(([id, severity]) => {
			const value = Array.isArray(severity) ? severity[0] : severity;
			return id.startsWith('playwright/') && (value === 'error' || value === 2);
		})
		.map(([id]) => id)
		.sort();

const expected = errorRuleIds(eslintRules);
const actual = errorRuleIds(oxlintConfig.default.rules ?? {});

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
	console.error('Playwright error-rule parity failed.');
	console.error(`ESLint: ${expected.join(', ')}`);
	console.error(`Oxlint: ${actual.join(', ')}`);
	process.exit(1);
}

const filenameCaseOverride = oxlintConfig.default.overrides?.find(
	({ rules }) => rules?.['unicorn/filename-case'] === 'off',
);
const oxlintFilenameCaseFiles = [...(filenameCaseOverride?.files ?? [])].sort();
const eslintFilenameCaseFiles = [...legacyFilenameCaseFiles].sort();

if (JSON.stringify(oxlintFilenameCaseFiles) !== JSON.stringify(eslintFilenameCaseFiles)) {
	console.error('Playwright filename-case debt parity failed.');
	process.exit(1);
}

console.log(`Playwright error-rule parity passed for ${actual.length} rules.`);
console.log(
	`Playwright filename-case debt parity passed for ${oxlintFilenameCaseFiles.length} files.`,
);
