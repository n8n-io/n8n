import { expect, test } from '../../../fixtures/base';
import {
	assertMainLandmarkStructure,
	checkMainLandmarkStructure,
} from '../../../utils/a11y-landmark-check';

/**
 * Regression cover for the main landmark structure check. Every case is synthetic
 * markup rendered with `page.setContent`, so no application route is loaded and no
 * axe scan runs - the check is the only thing under test.
 */
test.describe(
	'the main landmark structure check',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('fails a page with two <main> elements', async ({ page }) => {
			await page.setContent('<main id="content">first</main><main>second</main>');

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('single-main');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/single-main/);
		});

		test('fails a page with a <main> nested inside another landmark', async ({ page }) => {
			await page.setContent('<nav aria-label="Primary"><main id="content">nested</main></nav>');

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('main-not-nested');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/main-not-nested/);
		});

		test('fails a page with two elements sharing id="content"', async ({ page }) => {
			await page.setContent('<main id="content">first</main><div id="content">second</div>');

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('unique-content-id');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/unique-content-id/);
		});

		test('fails a page whose second <main> is inside a shadow root', async ({ page }) => {
			await page.setContent('<main id="content">light tree</main><div id="host"></div>');
			await page.evaluate(() => {
				const host = document.querySelector('#host');
				host?.attachShadow({ mode: 'open' }).appendChild(document.createElement('main'));
			});

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('single-main');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/single-main/);
		});

		test('fails a page whose <main> is slotted into a landmark in a shadow root', async ({
			page,
		}) => {
			await page.setContent('<div id="host"><main id="content">slotted</main></div>');
			await page.evaluate(() => {
				const host = document.querySelector('#host');
				const shadow = host?.attachShadow({ mode: 'open' });
				if (shadow) shadow.innerHTML = '<nav aria-label="Primary"><slot></slot></nav>';
			});

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('main-not-nested');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/main-not-nested/);
		});

		test('fails a page whose <main> is inside a <section> named by aria-labelledby', async ({
			page,
		}) => {
			await page.setContent(
				'<section aria-labelledby="section-title">' +
					'<h2 id="section-title">Settings</h2>' +
					'<main id="content">nested</main>' +
					'</section>',
			);

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(ok).toBe(false);
			expect(problems.map((problem) => problem.rule)).toContain('main-not-nested');
			await expect(assertMainLandmarkStructure(page)).rejects.toThrow(/main-not-nested/);
		});

		test('passes a page whose <section> aria-labelledby resolves to nothing', async ({ page }) => {
			await page.setContent(
				'<section aria-labelledby="missing-title">' +
					'<main id="content">not nested in a landmark</main>' +
					'</section>' +
					'<form aria-labelledby="empty-title"><span id="empty-title"> </span></form>',
			);

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(problems).toEqual([]);
			expect(ok).toBe(true);
		});

		test('passes a page with one top-level <main> and a unique id="content"', async ({ page }) => {
			await page.setContent(
				'<header>banner</header>' +
					'<nav aria-label="Primary">navigation</nav>' +
					'<main id="content"><h1>Title</h1></main>' +
					'<footer>contentinfo</footer>',
			);

			const { ok, problems } = await checkMainLandmarkStructure(page);

			expect(problems).toEqual([]);
			expect(ok).toBe(true);
			await expect(assertMainLandmarkStructure(page)).resolves.toBeUndefined();
		});
	},
);
