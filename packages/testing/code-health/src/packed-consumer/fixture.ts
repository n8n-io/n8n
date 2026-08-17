/**
 * The generated consumer project.
 *
 * It is written fresh on every run rather than committed, so it cannot drift from the `exports`
 * map it probes: the specifier lists below are arguments, derived by the caller from the target
 * manifest and from what the monorepo actually imports.
 *
 * Kept pure (string in, string out) so the interesting parts are unit-testable without packing,
 * installing or compiling anything.
 */

export interface FixtureInput {
	packageName: string;
	/** name -> `file:` spec for every packed workspace tarball. */
	tarballDeps: Record<string, string>;
	/** name -> version range for the toolchain, resolved from the target's own manifest. */
	toolchainDeps: Record<string, string>;
	/** Every module specifier from the `exports` map, probed one at a time under plain Node. */
	moduleSpecifiers: string[];
	/** Stylesheet specifiers the monorepo really imports, e.g. `@n8n/design-system/css/_tokens`. */
	styleSpecifiers: string[];
	/** Plain-CSS specifiers from the `exports` map, e.g. `@n8n/design-system/style.css`. */
	cssSpecifiers: string[];
}

const PROBE_ICON = 'activity';

function json(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function consumerManifest(input: FixtureInput): string {
	return json({
		name: 'packed-consumer-fixture',
		private: true,
		version: '0.0.0',
		type: 'module',
		scripts: {
			typecheck: 'vue-tsc --noEmit',
			build: 'vite build',
			'probe:runtime': 'node runtime-probe.mjs',
		},
		dependencies: { ...input.tarballDeps },
		devDependencies: { ...input.toolchainDeps },
		overrides: {
			// Every workspace package in the closure is at a version npm has never seen, so each one
			// must be forced to its local tarball or the install resolves a stale published copy.
			...input.tarballDeps,
			// `@vitejs/plugin-vue@5` still declares a Vite 5–6 peer range, and the catalog is on
			// Vite 8 — the same pairing the package itself builds with, where pnpm only warns.
			// Narrowing that one stale peer keeps every other peer strict. `--legacy-peer-deps`
			// was the alternative and it is worse than the problem: it flattens the tree instead
			// of nesting it, which broke `@tiptap/extension-list` against an older `@tiptap/core`
			// and reported it as a defect in the tarball.
			'@vitejs/plugin-vue': { vite: '$vite' },
		},
	});
}

function tsconfig(): string {
	return json({
		compilerOptions: {
			target: 'ESNext',
			module: 'ESNext',
			// `bundler`, matching the only resolution mode this package supports. `node16` is
			// unattainable for a `.vue` library without flattening the declarations, which
			// api-extractor cannot do for `.vue` specifiers — a documented limitation, not a gap.
			moduleResolution: 'bundler',
			strict: true,
			noEmit: true,
			noUnusedLocals: false,
			jsx: 'preserve',
			lib: ['ESNext', 'DOM', 'DOM.Iterable'],
			// Left on deliberately. Turning it off checks every third-party `.d.ts` in the install
			// too, so an upstream dependency shipping bad types would redden this job for a defect
			// nobody here can fix — and a check that goes red for reasons the reader cannot act on
			// is how a red signal stops meaning anything. The declarations that matter are held to
			// account at their use site instead, by the assertions in `src/type-probe.ts`.
			skipLibCheck: true,
		},
		include: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.vue', 'vite.config.mts'],
	});
}

function viteConfig(): string {
	// No `lucideIconsPlugin()`. The icon bodies are compiled into the published `dist` as lazy
	// chunks, so an external consumer resolves them with the stock Vue plugin and nothing else.
	// Needing a plugin here would mean the pre-built chunks stopped shipping.
	return `import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue()],
	build: {
		// A warning is not a failure, and a silently truncated build is worse than a loud one.
		chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
	},
});
`;
}

function indexHtml(): string {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>packed-consumer-fixture</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
`;
}

function mainTs(input: FixtureInput): string {
	const cssImports = input.cssSpecifiers.map((s) => `import '${s}';`).join('\n');
	const styleImport = input.styleSpecifiers.length > 0 ? "import './styles.scss';" : '';
	return `import { createApp } from 'vue';

import { IconBodyLoaderKey } from '${input.packageName}';
import { loadLucideIconBody } from '${input.packageName}/icons/lucide';

${cssImports}
${styleImport}
import App from './App.vue';

const app = createApp(App);

// The published icon entry has to satisfy the published injection key's type. These two come
// from different \`exports\` subpaths, so this is also an interop check between them.
app.provide(IconBodyLoaderKey, loadLucideIconBody);
app.mount('#app');
`;
}

/**
 * A component with a statically named, generically typed slot.
 *
 * `N8nDataTableServer` is the probe because its slot payload reaches a `@tanstack/vue-table`
 * type through the emitted declarations. That is the shape that broke before: flattening the
 * declarations left 38 external imports dangling and degraded a component's props to `any`.
 *
 * The slot is `#item`, not the `item.<key>` index signature: a dynamic slot name (`#[…]`) is
 * unchecked by `vue-tsc`, so it would compile no matter how badly the types had rotted.
 */
function appVue(input: FixtureInput): string {
	return `<script setup lang="ts">
import { N8nDataTableServer, N8nIcon, type TableHeader } from '${input.packageName}';

type Row = { id: string; label: string };

const headers: Array<TableHeader<Row>> = [{ title: 'Label', key: 'label' }];
const items: Row[] = [{ id: 'a', label: 'first' }];
</script>

<template>
	<N8nDataTableServer :headers="headers" :items="items" :items-length="items.length">
		<template #item="{ item, cells }">
			<N8nIcon icon="${PROBE_ICON}" />
			<span>{{ item.id }} / {{ item.label }} / {{ cells.length }}</span>
		</template>
	</N8nDataTableServer>
</template>
`;
}

/**
 * Compile-time negative controls.
 *
 * `skipLibCheck` means a rotted declaration does not fail on its own — it quietly resolves to
 * `any`, and every use site keeps compiling. Each assertion below fails when that happens, so
 * the typecheck has something it can actually lose.
 */
function typeProbeTs(input: FixtureInput): string {
	return `import {
	IconBodyLoaderKey,
	N8nDataTableServer,
	N8nIcon,
	type IconBodyLoader,
	type TableHeader,
	type TableOptions,
} from '${input.packageName}';
import { loadLucideIconBody } from '${input.packageName}/icons/lucide';

type IsAny<T> = 0 extends 1 & T ? true : false;
/**
 * Fails to compile when the argument is not \`true\`.
 *
 * Each assertion below spells \`IsAny<…> extends true ? false : true\` out at the use site rather
 * than behind a generic alias: with a type parameter still open, the conditional stays deferred
 * and TypeScript rejects the alias itself, which is a compile error that says nothing about the
 * package under test.
 */
type Assert<T extends true> = T;

type Row = { id: string; label: string };

export type AssertHeaderTyped = Assert<IsAny<TableHeader<Row>> extends true ? false : true>;
export type AssertOptionsTyped = Assert<IsAny<TableOptions> extends true ? false : true>;
export type AssertLoaderTyped = Assert<IsAny<IconBodyLoader> extends true ? false : true>;
export type AssertTableTyped = Assert<
	IsAny<typeof N8nDataTableServer> extends true ? false : true
>;
export type AssertIconTyped = Assert<IsAny<typeof N8nIcon> extends true ? false : true>;
export type AssertKeyTyped = Assert<IsAny<typeof IconBodyLoaderKey> extends true ? false : true>;

// The two subpaths have to agree: the icon entry's export must satisfy the barrel's key type.
export const loader: IconBodyLoader = loadLucideIconBody;

// \`key\` is constrained to the keys of \`Row\`, so this object is invalid. If the generic
// parameter was dropped or the type widened to \`any\`, the error disappears and \`vue-tsc\`
// reports the unused directive instead — either way the assertion is load-bearing.
// @ts-expect-error 'nope' is not a key of Row
export const rejectedHeader: TableHeader<Row> = { key: 'nope' };
`;
}

/**
 * Stylesheet imports carry no types, and TypeScript 6 errors on a side-effect import it cannot
 * resolve to a declaration. Every app that imports a stylesheet declares these; that the files
 * themselves ship is asserted before the fixture is written, and again by the Vite build.
 */
function shimsDts(): string {
	return `declare module '*.css';
declare module '*.scss';
`;
}

function stylesScss(input: FixtureInput): string {
	// Distinct namespaces: several of these define the same token names, and a collision would
	// fail for a reason that has nothing to do with whether the stylesheet shipped.
	const uses = input.styleSpecifiers
		.map((specifier, index) => `@use '${specifier}' as probe${index};`)
		.join('\n');
	return `// Every stylesheet specifier the monorepo imports from this package, compiled through
// sass against the packed tarball rather than against \`src\`.
${uses}
`;
}

/**
 * Runtime probe, run by plain \`node\` — no bundler.
 *
 * Per specifier, one at a time. A single module that imports everything stops at the first
 * failure and hides the rest; that is how an extensionless CJS subpath stayed hidden while a
 * different bad import was being fixed. Bundlers paper over these with \`cjs-module-lexer\`, so an
 * all-green \`vite build\` is not evidence that Node can load the package.
 */
function runtimeProbeMjs(input: FixtureInput): string {
	return `import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE = ${JSON.stringify(input.packageName)};
const SPECIFIERS = ${JSON.stringify(input.moduleSpecifiers, null, 1)};

const failures = [];

for (const specifier of SPECIFIERS) {
	try {
		const module = await import(specifier);
		if (module === null || typeof module !== 'object') {
			failures.push(\`\${specifier}: imported but produced no module namespace\`);
			continue;
		}
		if (Object.keys(module).length === 0) {
			failures.push(\`\${specifier}: module namespace is empty\`);
			continue;
		}
		console.log(\`  ok  \${specifier} (\${Object.keys(module).length} exports)\`);
	} catch (error) {
		failures.push(\`\${specifier}: \${error.message}\`);
	}
}

// The pre-built icon chunks. \`files\` ships \`dist\`, and the loader reaches its chunks by relative
// dynamic import, so a chunk that stopped being emitted or stopped being packed is invisible
// until an icon body is actually requested through the public API.
// \`import.meta.resolve\`, not \`createRequire().resolve\`: the exports map declares \`types\` and
// \`import\` and no \`require\`, which is correct for an ESM-only package — so CJS resolution refuses
// the subpath, and using it here would fail on a healthy tarball.
const entryPath = fileURLToPath(import.meta.resolve(\`\${PACKAGE}/icons/lucide\`));

// The expected chunk set comes from the entry's own dynamic imports, never from a directory
// listing. Listing the directory would make the check agree with whatever happens to be there:
// delete a chunk and the probe would just verify one fewer, and pass.
const entrySource = readFileSync(entryPath, 'utf-8');
const referenced = [
	...entrySource.matchAll(/import\\(\\s*["']([^"']+)["']\\s*\\)/g),
].map((m) => m[1]);
const chunkRefs = referenced.filter((r) => /lucide-icons-bucket-\\d+/.test(r));

if (chunkRefs.length === 0) {
	failures.push(
		\`icon chunks: \${entryPath} dynamically imports no bucket chunk — the icon bodies are no \` +
			'longer pre-built, so every consumer needs the build-time plugin again',
	);
} else {
	const { loadLucideIconBody } = await import(\`\${PACKAGE}/icons/lucide\`);
	console.log(\`  ok  entry references \${chunkRefs.length} pre-built icon chunk(s)\`);

	// One real icon per referenced chunk, requested through the public loader. This also proves
	// the loader's bucket function still agrees with the partitioning the build used: a name is
	// only found if it is looked for in the chunk it was compiled into.
	for (const ref of chunkRefs) {
		const chunkPath = resolve(dirname(entryPath), ref);
		if (!existsSync(chunkPath)) {
			failures.push(\`\${ref}: referenced by the icon entry but absent from the tarball\`);
			continue;
		}
		const contents = await import(pathToFileURL(chunkPath).href);
		const names = Object.keys(contents.default ?? {});
		if (names.length === 0) {
			failures.push(\`\${ref}: chunk has no icon bodies\`);
			continue;
		}
		const name = names[0];
		const body = await loadLucideIconBody(name);
		if (typeof body !== 'string' || body.length === 0) {
			failures.push(\`\${ref}: loadLucideIconBody('\${name}') returned \${JSON.stringify(body)}\`);
		}
	}

	// Negative control: an icon that does not exist must resolve to \`null\`, not throw and not
	// return a body. A probe that is never shown to fail is not evidence.
	const missing = await loadLucideIconBody('n8n-not-a-real-icon-name');
	if (missing !== null) {
		failures.push(\`loadLucideIconBody returned \${JSON.stringify(missing)} for an unknown icon\`);
	}
	console.log('  ok  icon bodies load for every chunk; unknown icon resolves to null');
}

if (failures.length > 0) {
	console.error(\`\\nFAIL: \${failures.length} runtime problem(s) loading the packed tarball:\`);
	for (const failure of failures) console.error(\`  - \${failure}\`);
	process.exit(1);
}

console.log('\\nOK: the packed tarball loads under plain Node.');
`;
}

/** Every file of the generated consumer, keyed by its path relative to the project root. */
export function buildFixture(input: FixtureInput): Record<string, string> {
	const files: Record<string, string> = {
		'package.json': consumerManifest(input),
		'tsconfig.json': tsconfig(),
		'vite.config.mts': viteConfig(),
		'index.html': indexHtml(),
		'runtime-probe.mjs': runtimeProbeMjs(input),
		'src/main.ts': mainTs(input),
		'src/App.vue': appVue(input),
		'src/type-probe.ts': typeProbeTs(input),
		'src/shims.d.ts': shimsDts(),
	};
	if (input.styleSpecifiers.length > 0) {
		files['src/styles.scss'] = stylesScss(input);
	}
	return files;
}
