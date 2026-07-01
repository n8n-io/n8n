import { describe, it, expect } from 'vitest';

import {
	isNonImpactful,
	filterImpactfulChanges,
	forcesBroad,
	classifyManifestChange,
	dropDevDepOnlyDeps,
} from './changes.js';

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

describe('forcesBroad', () => {
	it.each([
		'docker/images/n8n/Dockerfile',
		'docker/compose/base.yml',
		'packages/testing/containers/services/n8n.ts',
		'packages/cli/Dockerfile',
		'Dockerfile.dev',
		'packages/cli/worker.Dockerfile',
	])('treats %s as runtime-defining (force broad)', (file) => {
		expect(forcesBroad(file)).toBe(true);
	});

	it.each([
		'packages/cli/src/server.ts',
		'packages/testing/playwright/tests/e2e/x.spec.ts',
		'packages/nodes-base/nodes/If/If.node.ts',
	])('does not force broad for %s', (file) => {
		expect(forcesBroad(file)).toBe(false);
	});
});

const pkg = (deps = {}, devDeps = {}, extra = {}) =>
	JSON.stringify({ name: 'x', dependencies: deps, devDependencies: devDeps, ...extra });

describe('classifyManifestChange', () => {
	it('runtime when a dependencies version moves', () => {
		expect(classifyManifestChange(pkg({ axios: '1.0.0' }), pkg({ axios: '1.1.0' }))).toBe(
			'runtime',
		);
	});
	it('runtime when a runtime dep is added', () => {
		expect(classifyManifestChange(pkg(), pkg({ lodash: '4.0.0' }))).toBe('runtime');
	});
	it('runtime for peer/optional dependency changes', () => {
		const before = JSON.stringify({ peerDependencies: { react: '18' } });
		const after = JSON.stringify({ peerDependencies: { react: '19' } });
		expect(classifyManifestChange(before, after)).toBe('runtime');
	});
	it('devDep-only when only devDependencies move', () => {
		expect(
			classifyManifestChange(
				pkg({ axios: '1' }, { vitest: '1' }),
				pkg({ axios: '1' }, { vitest: '2' }),
			),
		).toBe('devDep-only');
	});
	it('none when no dependency section changes', () => {
		expect(
			classifyManifestChange(pkg({}, {}, { version: '1.0.0' }), pkg({}, {}, { version: '1.0.1' })),
		).toBe('none');
	});
	it('does not throw on unparseable content', () => {
		expect(classifyManifestChange('not json', pkg({}, { vitest: '1' }))).toBe('devDep-only');
	});
});

describe('dropDevDepOnlyDeps (safety-critical)', () => {
	const diff = (before: string, after: string) => ({ before, after });
	const devOnly = diff(pkg({}, { vitest: '1' }), pkg({}, { vitest: '2' }));
	const runtime = diff(pkg({ axios: '1' }), pkg({ axios: '2' }));

	it('drops lockfile + manifest when the change is devDep-only', () => {
		const files = ['pnpm-lock.yaml', 'packages/cli/package.json', 'packages/cli/src/a.ts'];
		expect(dropDevDepOnlyDeps(files, { 'packages/cli/package.json': devOnly })).toEqual([
			'packages/cli/src/a.ts',
		]);
	});
	it('KEEPS everything when a runtime dependency changed', () => {
		const files = ['pnpm-lock.yaml', 'packages/cli/package.json'];
		expect(dropDevDepOnlyDeps(files, { 'packages/cli/package.json': runtime })).toEqual(files);
	});
	it('KEEPS when a changed manifest has no supplied diff (conservative → runtime)', () => {
		const files = ['pnpm-lock.yaml', 'packages/cli/package.json'];
		expect(dropDevDepOnlyDeps(files, {})).toEqual(files);
	});
	it('KEEPS a lockfile-only (transitive) bump with no changed manifest', () => {
		const files = ['pnpm-lock.yaml', 'packages/cli/src/a.ts'];
		expect(dropDevDepOnlyDeps(files, {})).toEqual(files);
	});
	it('mixed devDep-only + runtime manifests → keeps all', () => {
		const files = ['pnpm-lock.yaml', 'a/package.json', 'b/package.json'];
		expect(
			dropDevDepOnlyDeps(files, { 'a/package.json': devOnly, 'b/package.json': runtime }),
		).toEqual(files);
	});
});
