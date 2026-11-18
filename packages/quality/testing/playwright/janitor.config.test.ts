import { resetConfig, ScopeLockdownRule, setConfig } from '@n8n/playwright-janitor';
import { readFileSync } from 'node:fs';
import { Project } from 'ts-morph';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import config from './janitor.config.mjs';

describe('SidebarPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the external locators in SidebarPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/SidebarPage.ts`,
			readFileSync(`${config.rootDir}/pages/SidebarPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		"this.page.getByTestId('universal-add')",
		"this.page.getByTestId('main-sidebar-account-trigger')",
		"this.page.getByTestId('main-sidebar-source-control-push')",
		"this.page.getByRole('link', { name: 'Settings' }).click()",
		"this.page.getByTestId('about-modal').getByRole('button')",
		"this.page.locator('body').getByTestId('universal-add')",
	])('reports an unscoped sidebar control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/SidebarPage.ts`,
			`export class SidebarPage {
				get container() { return this.page.locator('#side-menu'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'SidebarPage' },
		{ fileName: 'SidebarPage.ts', className: 'OtherPage' },
	])('keeps external locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			`export class ${className} {
				get container() { return this.page.locator('#side-menu'); }
				getAboutModal() { return this.page.getByTestId('about-modal'); }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});
});
