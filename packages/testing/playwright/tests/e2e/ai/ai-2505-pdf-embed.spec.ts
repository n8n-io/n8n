import {
	importWorkflowWithOpenAiCredential,
	recordEmbeddingsExpectations,
	setupEmbeddingsProxy,
} from './openai-embeddings-proxy';
import { test } from '../../../fixtures/base';

/**
 * Regression guard for AI-2505 — PDF embedding via Default Data Loader →
 * In-Memory Vector Store insert was throwing
 *   "Failed to load pdf-parse. This loader currently supports pdf-parse v1 only…"
 * because @langchain/community's PDFLoader resolved pdf-parse@2 in the
 * @n8n/ai-utilities install context.
 *
 * The fix replaces LangChain's PDFLoader with N8nPdfLoader (pdf-parse@2 backed).
 * This test exercises the end-to-end path on the real n8n runtime. The
 * Embeddings OpenAI node is answered by the MockServer proxy, so the workflow
 * completes without a real API key.
 */
test.use({ capability: 'proxy' });
test.describe(
	'AI-2505 — PDF embed regression @capability:proxy',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test.beforeEach(async ({ services }) => {
			await setupEmbeddingsProxy(services.proxy);
		});

		test.afterEach(async ({ services }) => {
			await recordEmbeddingsExpectations(services.proxy);
		});

		test('embeds a PDF through Default Data Loader → In-Memory Vector Store without the pdf-parse v1 error', async ({
			n8n,
			api,
		}) => {
			const imported = await importWorkflowWithOpenAiCredential(api, 'AI-2505_pdf_embed.json');
			await n8n.start.fromExistingWorkflow(imported.workflowId);
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();

			// Partial execution up to and including the Vector Store node —
			// mirrors the proven pattern in langchain-vectorstores.spec.ts and
			// avoids any flakiness around full-workflow trigger plumbing.
			await n8n.canvas.executeNode('Populate VS');

			// If PDF parsing fails (the AI-2505 regression), no success
			// notification ever appears and this assertion times out.
			await n8n.notifications.waitForNotificationAndClose('Node executed successfully', {
				timeout: 30000,
			});
		});
	},
);
