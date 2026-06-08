import { describe, it, expect } from 'vitest';

import { isNonImpactful, filterImpactfulChanges } from './changes.js';

describe('isNonImpactful', () => {
	it.each([
		'.claude/skills/foo.md',
		'.claude/agents/bar.json',
		'.vscode/settings.json',
		'.idea/workspace.xml',
		'.editorconfig',
		'.gitattributes',
		'README.mdx',
		'packages/cli/CHANGELOG.md',
		'LICENSE',
		'cspell.json',
		'packages/x/project-words.dic',
		'docs/images/diagram.png',
		'assets/logo.svg',
		'scripts/release/build.mjs',
		'turbo.json',
		'tsconfig.json',
		'packages/cli/tsconfig.build.json',
		'biome.jsonc',
		'packages/testing/test-impact/jest.config.ts',
		'.eslintrc.js',
	])('treats %s as non-impactful', (file) => {
		expect(isNonImpactful(file)).toBe(true);
	});

	it.each([
		// Real product source — must NOT be ignored
		'packages/nodes-base/nodes/If/If.node.ts',
		'packages/frontend/editor-ui/src/App.vue',
		// Surgical: real *.json source data is NOT a "config file"
		'packages/nodes-base/nodes/Slack/Slack.node.json',
		'packages/@n8n/i18n/src/locales/en.json',
		// Dependency changes — handled by devDep classifier / dep-graph, not ignored
		'pnpm-lock.yaml',
		'packages/cli/package.json',
		// Container + patches affect runtime / a dependency — never ignored
		'docker/images/n8n/Dockerfile',
		'patches/some-dep.patch',
	])('treats %s as impactful', (file) => {
		expect(isNonImpactful(file)).toBe(false);
	});
});

describe('filterImpactfulChanges', () => {
	it('drops non-impactful paths, keeps real source', () => {
		expect(
			filterImpactfulChanges([
				'packages/nodes-base/nodes/If/If.node.ts',
				'.claude/skills/x.md',
				'scripts/y.mjs',
				'turbo.json',
			]),
		).toEqual(['packages/nodes-base/nodes/If/If.node.ts']);
	});

	it('returns empty when every change is non-impactful (→ caller skips)', () => {
		expect(filterImpactfulChanges(['.claude/x.md', 'scripts/y.mjs', '.editorconfig'])).toEqual([]);
	});

	it('is a no-op when nothing is ignored', () => {
		const files = ['packages/cli/src/a.ts', 'pnpm-lock.yaml', 'docker/Dockerfile'];
		expect(filterImpactfulChanges(files)).toEqual(files);
	});
});
