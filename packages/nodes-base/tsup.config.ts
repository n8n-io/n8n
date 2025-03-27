// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';
import glob from 'fast-glob';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

const packagesDir = resolve(__dirname, '..');
const aiNodesDir = resolve(packagesDir, '@n8n', 'nodes-langchain');

const aiNodesFiles = await glob('nodes/**/*.ts', { cwd: aiNodesDir });
const aiNodesFilesContents = aiNodesFiles.map((filePath) =>
	readFile(resolve(aiNodesDir, filePath), 'utf-8'),
);

// Files used in @n8n/nodes-langchain package
const aiNodesPackageImports = (await Promise.all(aiNodesFilesContents)).reduce(
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

const aiNodesPackageDependencies = Array.from(aiNodesPackageImports).map(
	(i) => i.replace('n8n-nodes-base/dist/', '') + '.ts',
);

const commonIgnoredFiles = ['!**/*.d.ts', '!**/*.test.ts'];

// eslint-disable-next-line import/no-default-export
export default defineConfig([
	{
		entry: [
			'{credentials,nodes,test,types,utils}/**/*.ts',
			...commonIgnoredFiles,
			...aiNodesPackageDependencies.map((path) => `!${path}`),
		],
		format: ['cjs'],
		dts: false,
		bundle: false,
	},
	{
		entry: [...aiNodesPackageDependencies, ...commonIgnoredFiles],
		format: ['cjs'],
		dts: true,
		bundle: false,
	},
]);
