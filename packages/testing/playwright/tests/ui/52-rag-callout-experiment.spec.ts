import { test, expect } from '../../fixtures/base';

test.describe('RAG callout experiment', () => {
	test.describe('NDV callout', () => {
		test('should show callout and open template on click', async ({ n8n, page }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Zep Vector Store', {
				action: 'Add documents to vector store',
				closeNDV: false,
			});

			await expect(n8n.canvas.getRagCalloutTip()).toBeVisible();

			const popupPromise = page.waitForEvent('popup');
			await n8n.canvas.clickRagTemplateLink();

			const popup = await popupPromise;
			expect(popup.url()).toContain('/workflows/templates/rag-starter-template?fromJson=true');

			await popup.close();
		});
	});

	test.describe('search callout', () => {
		test('should show callout and open template on click', async ({ n8n, page }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.fillNodeCreatorSearchBar('rag');

			const popupPromise = page.waitForEvent('popup');
			await expect(n8n.canvas.getRagTemplateLink()).toBeVisible();
			await n8n.canvas.clickRagTemplateLink();

			const popup = await popupPromise;
			expect(popup.url()).toContain('/workflows/templates/rag-starter-template?fromJson=true');

			await popup.close();
		});
	});
});
