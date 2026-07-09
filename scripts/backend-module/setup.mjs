#!/usr/bin/env zx
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MODULE_NAME = 'my-feature';

const moduleDir = `./packages/cli/src/modules/${MODULE_NAME}`;
const testsDir = `${moduleDir}/__tests__`;
const templateDir = './scripts/backend-module';

await $`mkdir -p ${moduleDir}`;
await $`mkdir -p ${testsDir}`;

const templateFiles = [
	{ template: `${MODULE_NAME}.config.template`, target: `${moduleDir}/${MODULE_NAME}.config.ts` },
	{
		template: `${MODULE_NAME}.controller.template`,
		target: `${moduleDir}/${MODULE_NAME}.controller.ts`,
	},
	{ template: `${MODULE_NAME}.entity.template`, target: `${moduleDir}/${MODULE_NAME}.entity.ts` },
	{ template: `${MODULE_NAME}.module.template`, target: `${moduleDir}/${MODULE_NAME}.module.ts` },
	{
		template: `${MODULE_NAME}.repository.template`,
		target: `${moduleDir}/${MODULE_NAME}.repository.ts`,
	},
	{
		template: `${MODULE_NAME}.service.test.template`,
		target: `${testsDir}/${MODULE_NAME}.service.test.ts`,
	},
	{ template: `${MODULE_NAME}.service.template`, target: `${moduleDir}/${MODULE_NAME}.service.ts` },
];

await Promise.all(
	templateFiles.map(async ({ template, target }) => {
		const content = await readFile(path.join(templateDir, template), 'utf8');
		await fs.writeFile(target, content);
	}),
);

console.log(`Backend module setup done at: ${moduleDir}`);
