import { test } from '../../../fixtures/base';

/**
 * Regression guard for AI-2505 — PDF embedding via Default Data Loader →
 * In-Memory Vector Store insert was throwing
 *   "Failed to load pdf-parse. This loader currently supports pdf-parse v1 only…"
 * because @langchain/community's PDFLoader resolved pdf-parse@2 in the
 * @n8n/ai-utilities install context.
 *
 * The fix replaces LangChain's PDFLoader with N8nPdfLoader (pdf-parse@2 backed).
 * This test exercises the end-to-end path on the real n8n runtime, using
 * FakeEmbeddings so the workflow can complete without external API keys.
 */
test.describe(
	'AI-2505 — PDF embed regression',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('embeds a PDF through Default Data Loader → In-Memory Vector Store without the pdf-parse v1 error', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('AI-2505_pdf_embed_fake_embeddings.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();

			// Partial execution up to and including the Vector Store node —
			// mirrors the proven pattern in langchain-vectorstores.spec.ts and
			// avoids any flakiness around full-workflow trigger plumbing.
			await n8n.canvas.executeNode('Populate VS');

			// If PDF parsing fails (the AI-2505 regression), no success
			// notification ever appears and this assertion times out.
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully', {
				timeout: 30000,
			});
		});
	},
);
