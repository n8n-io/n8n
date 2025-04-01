import { defineConfig } from 'tsup';
import glob from 'fast-glob';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

const packagesDir = resolve(__dirname, '..');
const aiNodesDir = resolve(packagesDir, '@n8n', 'nodes-langchain');
const cliDir = resolve(packagesDir, 'cli');

const externalFiles = [
	...(await glob('nodes/**/*.ts', { cwd: aiNodesDir, absolute: true })),
	...(await glob('test/integration/**/*.ts', { cwd: cliDir, absolute: true })),
];

const externalFilesContents = externalFiles.map((filePath) => readFile(filePath, 'utf-8'));

// Files used in other packages
const externalPackageImports = (await Promise.all(externalFilesContents)).reduce(
	(acc, fileContents) => {
		const regex = /from\s+['"](n8n-nodes-base[^'"]+)['"]/g;
		let match;
		while ((match = regex.exec(fileContents)) !== null) {
			acc.add(match[1]);
		}

		return acc;
	},
	new Set<string>(),
);

const externalPackageDependencies = Array.from(externalPackageImports).map(
	(i) => i.replace(/^n8n-nodes-base\/(dist\/)?/, '') + '.ts',
);

const commonIgnoredFiles = ['!**/*.d.ts', '!**/*.test.ts'];

export default defineConfig([
	{
		entry: [
			'{credentials,nodes,test,types,utils}/**/*.ts',
			...commonIgnoredFiles,
			...externalPackageDependencies.map((path) => `!${path}`),
		],
		format: ['cjs'],
		dts: false,
		bundle: false,
		sourcemap: true,
		silent: true,
	},
	{
		entry: [...externalPackageDependencies, ...commonIgnoredFiles],
		format: ['cjs'],
		dts: {
			compilerOptions: {
				composite: false,
			},
		},
		bundle: false,
		sourcemap: true,
		silent: true,
	},
]);
