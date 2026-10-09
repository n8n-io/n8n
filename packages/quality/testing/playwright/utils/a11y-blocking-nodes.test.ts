import { describe, expect, test } from 'vitest';

import {
	blockingNodes,
	describeNode,
	elementName,
	isDesignSystemMenuItem,
	type AxeViolationLike,
	type BlockingNode,
} from './a11y-blocking-nodes';

function violation(
	id: string,
	impact: string | null | undefined,
	...htmls: string[]
): AxeViolationLike {
	return { id, impact, nodes: htmls.map((html) => ({ html })) };
}

describe('blockingNodes', () => {
	test('keeps the nodes of serious and critical violations and drops the other impacts', () => {
		const nodes = blockingNodes([
			violation('link-name', 'serious', '<a href="/a">'),
			violation('aria-required-parent', 'critical', '<a role="menuitem">', '<a role="menuitem">'),
			violation('color-contrast', 'moderate', '<span>'),
			violation('region', 'minor', '<div>'),
			violation('unknown-impact', undefined, '<p>'),
			violation('null-impact', null, '<p>'),
		]);

		expect(nodes).toEqual([
			{ rule: 'link-name', impact: 'serious', html: '<a href="/a">' },
			{ rule: 'aria-required-parent', impact: 'critical', html: '<a role="menuitem">' },
			{ rule: 'aria-required-parent', impact: 'critical', html: '<a role="menuitem">' },
		]);
	});

	test('returns no nodes for a violation without nodes or for no violations', () => {
		expect(blockingNodes([])).toEqual([]);
		expect(blockingNodes([violation('link-name', 'serious')])).toEqual([]);
	});
});

describe('isDesignSystemMenuItem', () => {
	const menuItem = (rule: string, html: string): BlockingNode => ({
		rule,
		impact: 'critical',
		html,
	});

	test('matches a menu item link that has no menu parent', () => {
		const html = '<a href="/home" role="menuitem" id="home" aria-label="Overview">';
		expect(isDesignSystemMenuItem(menuItem('aria-required-parent', html))).toBe(true);
	});

	test('does not match a menu item link with another blocking rule', () => {
		const html = '<a href="/home" role="menuitem" aria-label="">';
		expect(isDesignSystemMenuItem(menuItem('link-name', html))).toBe(false);
	});

	test('does not match an element with the menu item role that is not a link', () => {
		expect(isDesignSystemMenuItem(menuItem('aria-required-parent', '<div role="menuitem">'))).toBe(
			false,
		);
	});

	test('does not match a link without the menu item role', () => {
		expect(isDesignSystemMenuItem(menuItem('aria-required-parent', '<a href="/home">'))).toBe(
			false,
		);
	});

	test('does not match a link whose child has the menu item role', () => {
		const html = '<a href="/x"><span role="menuitem"></span></a>';
		expect(isDesignSystemMenuItem(menuItem('aria-required-parent', html))).toBe(false);
	});

	test('does not match a link with a data-role attribute of menu item', () => {
		const html = '<a data-role="menuitem" href="/x">';
		expect(isDesignSystemMenuItem(menuItem('aria-required-parent', html))).toBe(false);
	});
});

describe('elementName', () => {
	test('names an element by its test id', () => {
		expect(
			elementName('<div data-test-id="main-sidebar-help" id="reka-popover-trigger-v-0-9">'),
		).toBe('main-sidebar-help');
	});

	test('ignores the generic test id of the menu items and keeps the href', () => {
		expect(
			elementName('<a href="/shared" class="menu" role="menuitem" data-test-id="menu-item">'),
		).toBe('<a href="/shared" role="menuitem" data-test-id="menu-item">');
	});

	test('drops the class, id and label of an element without a test id', () => {
		expect(elementName('<a href="/home" class="_logo_1jqqp_21" id="logo" aria-label="n8n">')).toBe(
			'<a href="/home">',
		);
	});

	test('keeps attributes whose names only end in class, id or aria-label', () => {
		expect(elementName('<a data-id="7" data-class="x" href="/x">')).toBe(
			'<a data-id="7" data-class="x" href="/x">',
		);
	});

	test('returns text that does not start with a tag as it is', () => {
		expect(elementName('text without tag')).toBe('text without tag');
	});

	test('reads only the opening tag, not the content of the element', () => {
		expect(
			elementName('<a href="/home" class="logo"><svg data-test-id="n8n-logo"></svg></a>'),
		).toBe('<a href="/home">');
	});
});

describe('describeNode', () => {
	test('joins the rule, the impact and the element name', () => {
		const node: BlockingNode = {
			rule: 'aria-allowed-attr',
			impact: 'critical',
			html: '<div data-test-id="main-sidebar-settings" aria-expanded="false">',
		};
		expect(describeNode(node)).toBe('aria-allowed-attr (critical): main-sidebar-settings');
	});
});
