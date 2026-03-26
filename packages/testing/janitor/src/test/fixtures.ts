import { Project, type SourceFile } from 'ts-morph';
import { test as base, expect } from 'vitest';

import { setConfig, resetConfig, defineConfig, type DefineConfigInput } from '../config.js';

export interface RuleTestContext {
	project: Project;
	createFile: (path: string, code: string) => SourceFile;
}

const defaultTestConfig: DefineConfigInput = {
	rootDir: '/',
	excludeFromPages: ['BasePage.ts'],
	fixtureObjectName: 'n8n',
	apiFixtureName: 'api',
	flowLayerName: 'Composable',
	rawApiPatterns: [/\brequest\.(get|post|put|patch|delete|head)\s*\(/i, /\bfetch\s*\(/],
	patterns: {
		pages: ['pages/**/*.ts'],
		components: ['pages/components/**/*.ts'],
		flows: ['composables/**/*.ts'],
		tests: ['tests/**/*.spec.ts'],
		services: ['services/**/*.ts'],
		fixtures: ['fixtures/**/*.ts'],
		helpers: ['helpers/**/*.ts'],
		factories: ['factories/**/*.ts'],
		testData: [],
	},
};

export const test = base.extend<RuleTestContext>({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	project: async ({ task: _ }, use) => {
		const project = new Project({ useInMemoryFileSystem: true });
		setConfig(defineConfig(defaultTestConfig));
		await use(project);
		resetConfig();
	},

	createFile: async ({ project }, use) => {
		await use((path: string, code: string) => project.createSourceFile(path, code));
	},
});

export { expect };
