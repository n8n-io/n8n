import type { Page } from '@playwright/test';

import { TestError } from '../Types';

/** The structural rule a problem breaks, so a caller can assert on one of them. */
export type MainLandmarkRule = 'single-main' | 'main-not-nested' | 'unique-content-id';

export type MainLandmarkProblem = {
	rule: MainLandmarkRule;
	message: string;
};

export type MainLandmarkStructure = {
	ok: boolean;
	/** Empty when the page is conforming. One entry for each rule the page breaks. */
	problems: MainLandmarkProblem[];
};

/**
 * Reads the main landmark structure of the composed DOM - the document plus every
 * open shadow tree in it, which is where a composed layout puts half its markup.
 *
 * The walk is plain DOM, so it runs no axe rules at all and leaves the axe fixture's
 * default tag selection (`DEFAULT_A11Y_TAGS` in `fixtures/a11y.ts`) untouched.
 */
export async function checkMainLandmarkStructure(page: Page): Promise<MainLandmarkStructure> {
	const snapshot = await page.evaluate(() => {
		// Roles that make an element a landmark. `main` is one of them, so a <main>
		// inside another <main> is reported as a nesting problem as well as a duplicate.
		const landmarkRoles = new Set([
			'banner',
			'complementary',
			'contentinfo',
			'form',
			'main',
			'navigation',
			'region',
			'search',
		]);
		// <header> and <footer> only map to banner/contentinfo outside sectioning content.
		const sectioningTags = new Set(['ARTICLE', 'ASIDE', 'MAIN', 'NAV', 'SECTION']);

		// Composed-tree parent. A slotted element is rendered where its <slot> sits, so the
		// walk continues there; an element at the root of a shadow tree continues at its host.
		const parentOf = (element: Element): Element | null => {
			if (element.assignedSlot) return element.assignedSlot;
			const parent: ParentNode | null = element.parentNode;
			if (parent instanceof ShadowRoot) return parent.host;
			return parent instanceof Element ? parent : null;
		};

		// ID references resolve inside the element's own root, so a shadow tree
		// resolves against itself and not against the document.
		const rootOf = (element: Element): Document | ShadowRoot => {
			const root = element.getRootNode();
			return root instanceof ShadowRoot ? root : document;
		};

		const hasAccessibleName = (element: Element) => {
			if (element.getAttribute('aria-label')?.trim()) return true;

			// An aria-labelledby that resolves to nothing, or to empty elements, names nothing.
			const labelledBy = element.getAttribute('aria-labelledby')?.trim();
			if (!labelledBy) return false;

			const root = rootOf(element);
			return labelledBy.split(/\s+/).some((id) => {
				const referenced = root.getElementById(id);
				if (!referenced) return false;
				return !!referenced.getAttribute('aria-label')?.trim() || !!referenced.textContent?.trim();
			});
		};

		const landmarkRoleOf = (element: Element): string | undefined => {
			// An explicit role wins over the tag, including when it is not a landmark.
			const explicit = element.getAttribute('role')?.trim().toLowerCase();
			if (explicit) return landmarkRoles.has(explicit) ? explicit : undefined;

			switch (element.tagName) {
				case 'MAIN':
					return 'main';
				case 'NAV':
					return 'navigation';
				case 'ASIDE':
					return 'complementary';
				case 'HEADER':
				case 'FOOTER': {
					for (let ancestor = parentOf(element); ancestor; ancestor = parentOf(ancestor)) {
						if (sectioningTags.has(ancestor.tagName)) return undefined;
					}
					return element.tagName === 'HEADER' ? 'banner' : 'contentinfo';
				}
				// <section> and <form> are landmarks only once they carry an accessible name.
				case 'SECTION':
					return hasAccessibleName(element) ? 'region' : undefined;
				case 'FORM':
					return hasAccessibleName(element) ? 'form' : undefined;
				default:
					return undefined;
			}
		};

		// Enough to point a reader at the element without dumping its markup.
		const labelFor = (element: Element) => {
			const id = element.id ? `#${element.id}` : '';
			const classes =
				typeof element.className === 'string'
					? element.className.trim().split(/\s+/).filter(Boolean)
					: [];
			const firstClass = !id && classes.length > 0 ? `.${classes[0]}` : '';
			return `${element.tagName.toLowerCase()}${id}${firstClass}`;
		};

		const landmarkAncestorOf = (element: Element): string | null => {
			for (let ancestor = parentOf(element); ancestor; ancestor = parentOf(ancestor)) {
				const role = landmarkRoleOf(ancestor);
				if (role) return `${labelFor(ancestor)} (${role})`;
			}
			return null;
		};

		const elements: Element[] = [];
		const collect = (root: Document | ShadowRoot) => {
			for (const element of root.querySelectorAll('*')) {
				elements.push(element);
				if (element.shadowRoot) collect(element.shadowRoot);
			}
		};
		collect(document);

		return {
			mains: elements
				.filter((element) => element.tagName === 'MAIN')
				.map((main) => ({ element: labelFor(main), landmarkAncestor: landmarkAncestorOf(main) })),
			contentIds: elements.filter((element) => element.id === 'content').map(labelFor),
		};
	});

	const problems: MainLandmarkProblem[] = [];
	const listed = (elements: string[]) => (elements.length > 0 ? `: ${elements.join(', ')}` : '');

	if (snapshot.mains.length !== 1) {
		problems.push({
			rule: 'single-main',
			message: `Expected exactly one <main> element, found ${snapshot.mains.length}${listed(
				snapshot.mains.map((main) => main.element),
			)}`,
		});
	}

	for (const main of snapshot.mains) {
		if (!main.landmarkAncestor) continue;
		problems.push({
			rule: 'main-not-nested',
			message: `<main> element ${main.element} is inside another landmark ${main.landmarkAncestor}`,
		});
	}

	if (snapshot.contentIds.length > 1) {
		problems.push({
			rule: 'unique-content-id',
			message: `Expected id="content" on at most one element, found ${
				snapshot.contentIds.length
			}${listed(snapshot.contentIds)}`,
		});
	}

	return { ok: problems.length === 0, problems };
}

/**
 * Same check as {@link checkMainLandmarkStructure}, as an assertion: it throws with
 * every problem it found, so a journey can fail on the structure without reading the
 * result itself.
 */
export async function assertMainLandmarkStructure(page: Page): Promise<void> {
	const { ok, problems } = await checkMainLandmarkStructure(page);
	if (ok) return;

	const detail = problems.map((problem) => `  [${problem.rule}] ${problem.message}`).join('\n');
	throw new TestError(`Main landmark structure check failed at ${page.url()}:\n${detail}`);
}
