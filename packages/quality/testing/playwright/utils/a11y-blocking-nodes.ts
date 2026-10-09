/** The axe impacts that fail a journey when they are not on a known list. */
export const BLOCKING_IMPACTS: readonly string[] = ['serious', 'critical'];

/** The part of an axe violation that the classifiers read. */
export type AxeViolationLike = {
	id: string;
	impact?: string | null;
	nodes: Array<{ html: string }>;
};

/** One axe node with a blocking impact, with the rule that reports it. */
export type BlockingNode = { rule: string; impact: string; html: string };

/** The nodes of the violations that have a blocking impact. */
export function blockingNodes(violations: AxeViolationLike[]): BlockingNode[] {
	return violations.flatMap((violation) =>
		BLOCKING_IMPACTS.includes(violation.impact ?? '')
			? violation.nodes.map((node) => ({
					rule: violation.id,
					impact: violation.impact ?? '',
					html: node.html,
				}))
			: [],
	);
}

/** The opening tag of an axe node, for example `<a href="/home" class="logo">`. */
function openingTag(html: string): string {
	return html.match(/^<[^>]*>/)?.[0] ?? html;
}

/**
 * The N8nMenuItem links of the design system: a menu item with no menu parent. The design
 * system owns this pattern, so the known lists do not name it. Other blocking nodes of these
 * links still fail.
 */
export function isDesignSystemMenuItem(node: BlockingNode): boolean {
	// The role must be an attribute of the link itself: not of a child, not `data-role`. It can
	// be the first attribute of the link.
	return node.rule === 'aria-required-parent' && /^<a\s(?:[^>]*\s)?role="menuitem"/.test(node.html);
}

// N8nMenuItem sets this test id on every item, so it does not name one element.
const GENERIC_TEST_IDS = ['menu-item'];

/**
 * Names the element of a node by its test id. Without one, the name is the opening tag
 * without its class, id and label, which change with the build and with the data.
 */
export function elementName(html: string): string {
	const tag = openingTag(html);
	const testId = tag.match(/\sdata-test-id="([^"]+)"/)?.[1];
	if (testId && !GENERIC_TEST_IDS.includes(testId)) return testId;
	return tag.replace(/\s(?:class|id|aria-label)="[^"]*"/g, '');
}

/** The label of a node in a known list: the rule, the impact and the element. */
export function describeNode(node: BlockingNode): string {
	return `${node.rule} (${node.impact}): ${elementName(node.html)}`;
}
