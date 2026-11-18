import { resetConfig, ScopeLockdownRule, setConfig } from '@n8n/playwright-janitor';
import { readFileSync } from 'node:fs';
import { Project } from 'ts-morph';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import config from './janitor.config.mjs';

describe('AIAssistantPage scope configuration', () => {
	beforeEach(() => setConfig(config));
	afterEach(() => resetConfig());

	test('allows the external locators in AIAssistantPage', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/AIAssistantPage.ts`,
			readFileSync(`${config.rootDir}/pages/AIAssistantPage.ts`, 'utf8'),
		);

		expect(new ScopeLockdownRule().analyzeProject(project, [file])).toEqual([]);
	});

	test.each([
		"this.page.getByTestId('ask-assistant-chat')",
		"this.page.getByTestId('send-message-button')",
		"this.page.getByTestId('close-chat-button')",
		"this.page.getByTestId('new-assistant-session-modal').getByRole('button')",
		"this.page.getByTestId('node-error-view-ask-assistant-button').locator('input')",
	])('reports an unscoped assistant control: %s', (locator) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/AIAssistantPage.ts`,
			`export class AIAssistantPage {
				get container() { return this.page.getByTestId('ask-assistant-sidebar'); }
				getControl() { return ${locator}; }
			}`,
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unscoped locator');
	});

	test.each([
		{ fileName: 'OtherPage.ts', className: 'AIAssistantPage' },
		{ fileName: 'AIAssistantPage.ts', className: 'OtherPage' },
	])('keeps external locators scoped to $fileName:$className', ({ fileName, className }) => {
		const project = new Project({ useInMemoryFileSystem: true });
		const file = project.createSourceFile(
			`${config.rootDir}/pages/${fileName}`,
			readFileSync(`${config.rootDir}/pages/AIAssistantPage.ts`, 'utf8').replace(
				'export class AIAssistantPage',
				`export class ${className}`,
			),
		);

		const violations = new ScopeLockdownRule().analyzeProject(project, [file]);
		expect(violations).toHaveLength(5);
		expect(violations.every(({ message }) => message.includes('Unscoped locator'))).toBe(true);
	});
});

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
