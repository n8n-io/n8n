import { describe, it, expect } from 'vitest';

import {
	isNonImpactful,
	filterImpactfulChanges,
	forcesBroad,
	isTsconfig,
	tsconfigForcesBroad,
	isBackendConfig,
	configForcesBroad,
	classifyManifestChange,
	dropDevDepOnlyDeps,
	overrideTargetName,
	changedOverrideTargets,
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
		'biome.jsonc',
		'packages/testing/test-impact/vitest.config.ts',
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
		// tsconfig can carry module-resolution keys → routed via tsconfigForcesBroad
		'tsconfig.json',
		'packages/cli/tsconfig.build.json',
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
		'packages/nodes-base/credentials/MicrosoftOAuth2Api.credentials.ts',
		// Module registry: decides which modules load at boot, so a default flip
		// changes behaviour in specs that never execute this file.
		'packages/@n8n/backend-common/src/modules/module-registry.ts',
		'packages/@n8n/backend-common/src/modules/modules.config.ts',
	])('treats %s as runtime-defining (force broad)', (file) => {
		expect(forcesBroad(file)).toBe(true);
	});

	it.each([
		'packages/cli/src/server.ts',
		'packages/testing/playwright/tests/e2e/x.spec.ts',
		'packages/nodes-base/nodes/If/If.node.ts',
		// A unit test beside the registry can't change the runtime — stays scoped.
		'packages/@n8n/backend-common/src/modules/__tests__/module-registry.test.ts',
		// Per-module descriptors are NOT the registry: high churn, and they can't
		// change which modules are enabled by default.
		'packages/cli/src/modules/instance-ai/instance-ai.module.ts',
	])('does not force broad for %s', (file) => {
		expect(forcesBroad(file)).toBe(false);
	});
});

describe('isTsconfig', () => {
	it.each(['tsconfig.json', 'packages/cli/tsconfig.build.json', 'a/tsconfig.go.json'])(
		'recognises %s',
		(file) => {
			expect(isTsconfig(file)).toBe(true);
		},
	);

	it.each(['tsconfig.ts', 'packages/cli/package.json', 'config.json'])(
		'does not match %s',
		(file) => {
			expect(isTsconfig(file)).toBe(false);
		},
	);
});

describe('tsconfigForcesBroad', () => {
	const ts = (compilerOptions = {}, extra = {}) => JSON.stringify({ compilerOptions, ...extra });

	it('forces broad when compilerOptions.paths changes', () => {
		const before = ts({ paths: { 'esprima-next': ['./x'] } });
		const after = ts({ paths: { 'n8n-workflow': ['./src/index.ts'], 'esprima-next': ['./x'] } });
		expect(tsconfigForcesBroad(before, after)).toBe(true);
	});

	it('forces broad when baseUrl changes', () => {
		expect(tsconfigForcesBroad(ts({ baseUrl: '.' }), ts({ baseUrl: './src' }))).toBe(true);
	});

	it('forces broad when moduleResolution changes', () => {
		expect(
			tsconfigForcesBroad(ts({ moduleResolution: 'node' }), ts({ moduleResolution: 'bundler' })),
		).toBe(true);
	});

	it('forces broad when customConditions changes', () => {
		const before = ts({ customConditions: ['development'] });
		const after = ts({ customConditions: ['production'] });
		expect(tsconfigForcesBroad(before, after)).toBe(true);
	});

	it('forces broad when extends changes', () => {
		const before = ts({}, { extends: '@n8n/typescript-config/modern/tsconfig.json' });
		const after = ts({}, { extends: '@n8n/typescript-config/modern/tsconfig.go.json' });
		expect(tsconfigForcesBroad(before, after)).toBe(true);
	});

	it('does NOT force broad for a resolution-neutral flag change', () => {
		const before = ts({ strict: true, paths: { a: ['./a'] } });
		const after = ts({ strict: false, target: 'ES2022', paths: { a: ['./a'] } });
		expect(tsconfigForcesBroad(before, after)).toBe(false);
	});

	it('tolerates comments and trailing commas', () => {
		const before = '{\n  // base\n  "compilerOptions": { "paths": { "a": ["./a"] } },\n}';
		const after = '{\n  // base\n  "compilerOptions": { "paths": { "a": ["./b"] } },\n}';
		expect(tsconfigForcesBroad(before, after)).toBe(true);
	});

	it('forces broad when content is unparseable (conservative)', () => {
		expect(tsconfigForcesBroad('{ not json', '{ still not')).toBe(true);
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

const ovr = (overrides: Record<string, string>, deps = {}, devDeps = {}) =>
	JSON.stringify({ name: 'x', dependencies: deps, devDependencies: devDeps, pnpm: { overrides } });

describe('overrideTargetName', () => {
	it.each([
		['@vitest/browser@<4.1.10', '@vitest/browser'],
		['brace-expansion@5', 'brace-expansion'],
		['node-gyp>undici', 'undici'],
		['@babel/traverse', '@babel/traverse'],
		['undici@7', 'undici'],
		['a>b>@scope/c@^1.0.0', '@scope/c'],
		['@n8n/typeorm>@sentry/node', '@sentry/node'],
		// `>` inside a version range is not a parent separator
		['pkg@>=2.0.0', 'pkg'],
		['pkg@>2', 'pkg'],
		['pkg@1||>2', 'pkg'],
		['pkg@^1||>=2.0.0', 'pkg'],
		['pkg@>=1||>=2', 'pkg'],
		['a@1>b@>=2', 'b'],
		['a@=1.2.3>b', 'b'],
		['pkg@1=>2', 'pkg'],
	])('%s → %s', (selector, expected) => {
		expect(overrideTargetName(selector)).toBe(expected);
	});

	it('returns null when no package name can be extracted', () => {
		expect(overrideTargetName('>=2.0.0')).toBeNull();
	});
});

describe('changedOverrideTargets', () => {
	it('returns the target when a pin is added', () => {
		expect(changedOverrideTargets(ovr({}), ovr({ 'ws@<8.21.1': '8.21.1' }))).toEqual(['ws']);
	});
	it('returns the target when a pin is removed', () => {
		expect(changedOverrideTargets(ovr({ 'ws@<8.21.1': '8.21.1' }), ovr({}))).toEqual(['ws']);
	});
	it('returns the target when a pin version changes', () => {
		expect(
			changedOverrideTargets(
				ovr({ 'brace-expansion@5': '5.0.7' }),
				ovr({ 'brace-expansion@5': '5.0.9' }),
			),
		).toEqual(['brace-expansion']);
	});
	it('de-duplicates selectors pinning the same package', () => {
		expect(
			changedOverrideTargets(ovr({}), ovr({ 'undici@7': '7.29.0', 'node-gyp>undici': '7.29.0' })),
		).toEqual(['undici']);
	});
	it('ignores untouched pins', () => {
		const same = ovr({ 'ws@<8.21.1': '8.21.1' });
		expect(changedOverrideTargets(same, same)).toEqual([]);
	});
});

describe('classifyManifestChange — overrides', () => {
	it('override when only a pnpm.overrides pin moves', () => {
		expect(classifyManifestChange(ovr({}), ovr({ 'ws@1': '1.0.1' }))).toBe('override');
	});
	it('runtime wins over a co-occurring override change', () => {
		expect(
			classifyManifestChange(ovr({}, { axios: '1' }), ovr({ 'ws@1': '1.0.1' }, { axios: '2' })),
		).toBe('runtime');
	});
	it('override wins over a co-occurring devDependencies change', () => {
		expect(
			classifyManifestChange(
				ovr({}, {}, { vitest: '1' }),
				ovr({ 'ws@1': '1.0.1' }, {}, { vitest: '2' }),
			),
		).toBe('override');
	});
});

describe('dropDevDepOnlyDeps — overrides (safety-critical)', () => {
	const files = ['pnpm-lock.yaml', 'package.json'];
	const overrideDiff = (target: string) => ({
		'package.json': { before: ovr({}), after: ovr({ [`${target}@<2`]: '2.0.0' }) },
	});
	const closure = new Set(['ajv', 'fast-uri']);

	it('drops when every override target is outside the runtime closure', () => {
		expect(dropDevDepOnlyDeps(files, overrideDiff('@vitest/browser'), closure)).toEqual([]);
	});
	it('KEEPS when the override target is inside the runtime closure', () => {
		expect(dropDevDepOnlyDeps(files, overrideDiff('fast-uri'), closure)).toEqual(files);
	});
	it('KEEPS when no closure is supplied', () => {
		expect(dropDevDepOnlyDeps(files, overrideDiff('@vitest/browser'), undefined)).toEqual(files);
	});
	it('KEEPS when the closure is empty (broken walk, not proof)', () => {
		expect(dropDevDepOnlyDeps(files, overrideDiff('@vitest/browser'), new Set())).toEqual(files);
	});
	it('KEEPS when any one of several targets is inside the closure', () => {
		const manifests = {
			'package.json': {
				before: ovr({}),
				after: ovr({ '@vitest/browser@<2': '2.0.0', 'fast-uri@<4': '4.0.0' }),
			},
		};
		expect(dropDevDepOnlyDeps(files, manifests, closure)).toEqual(files);
	});
	it('KEEPS a runtime-section change even when its override target is outside the closure', () => {
		const manifests = {
			'package.json': {
				before: ovr({}, { axios: '1' }),
				after: ovr({ '@vitest/browser@<2': '2.0.0' }, { axios: '2' }),
			},
		};
		expect(dropDevDepOnlyDeps(files, manifests, closure)).toEqual(files);
	});
	it('KEEPS when a changed selector cannot be attributed to a package', () => {
		const manifests = {
			'package.json': { before: ovr({}), after: ovr({ '>=2.0.0': '2.0.0' }) },
		};
		expect(dropDevDepOnlyDeps(files, manifests, closure)).toEqual(files);
	});
});

describe('isBackendConfig', () => {
	it.each([
		'packages/@n8n/config/src/configs/ai.config.ts',
		'packages/@n8n/config/src/configs/logging.config.ts',
	])('matches %s', (file) => {
		expect(isBackendConfig(file)).toBe(true);
	});

	it.each([
		'packages/@n8n/config/src/configs/__tests__/ai.config.test.ts',
		'packages/@n8n/config/src/decorators.ts',
		'packages/cli/src/config/index.ts',
	])('does not match %s', (file) => {
		expect(isBackendConfig(file)).toBe(false);
	});
});

describe('configForcesBroad', () => {
	const cfg = (body: string) =>
		`import { Config, Env } from '../decorators';\n@Config\nexport class C {\n${body}\n}`;
	const enabled = "\t@Env('N8N_AI_ENABLED')\n\tenabled: boolean = false;";

	it('forces broad when a default value changes', () => {
		const after = cfg(enabled.replace('= false', '= true'));
		expect(configForcesBroad(cfg(enabled), after)).toBe(true);
	});

	it('forces broad when an env var is renamed', () => {
		const after = cfg(enabled.replace('N8N_AI_ENABLED', 'N8N_AI_ON'));
		expect(configForcesBroad(cfg(enabled), after)).toBe(true);
	});

	it('forces broad when a field is removed', () => {
		expect(configForcesBroad(cfg(enabled), cfg(''))).toBe(true);
	});

	it('forces broad when an optional field gains a default', () => {
		const before = cfg('\tthreshold?: number;');
		const after = cfg('\tthreshold?: number = 5;');
		expect(configForcesBroad(before, after)).toBe(true);
	});

	it('does NOT force broad for a new field (additive)', () => {
		const after = cfg(`${enabled}\n\n\t@Env('N8N_AI_TIMEOUT')\n\ttimeout: number = 60;`);
		expect(configForcesBroad(cfg(enabled), after)).toBe(false);
	});

	it('does NOT force broad for a comment-only edit', () => {
		const before = cfg(`\t/** Old wording. */\n${enabled}`);
		const after = cfg(`\t/** New wording, same default. */\n${enabled}`);
		expect(configForcesBroad(before, after)).toBe(false);
	});

	it('does NOT force broad for reformatted whitespace', () => {
		const before = cfg('\tmaxSize: number = 50 * 1024 * 1024;');
		const after = cfg('\tmaxSize: number =\t50 *  1024 * 1024;');
		expect(configForcesBroad(before, after)).toBe(false);
	});
});
