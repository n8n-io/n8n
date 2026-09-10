import type { ServiceHelpers } from 'n8n-containers/services/types';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from '../../../services/api-helper';

/**
 * Helpers for fixtures that embed documents with the Embeddings OpenAI node.
 *
 * The OpenAI calls go through the MockServer proxy. In replay mode (default)
 * the recorded `/v1/embeddings` responses in `expectations/langchain/` answer
 * them, so no real key is needed. To refresh the recordings, run the specs
 * once with `RECORD_EMBEDDINGS_EXPECTATIONS=true` and a real `OPENAI_API_KEY`
 * in the environment; the teardown then writes the captured responses back
 * into `expectations/langchain/`.
 */

const EMBEDDINGS_PATH = '/v1/embeddings';
const EXPECTATIONS_FOLDER = 'langchain';
const OPENAI_NODE_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.embeddingsOpenAi',
	'@n8n/n8n-nodes-langchain.lmChatOpenAi',
]);

export const isRecordingEmbeddings = process.env.RECORD_EMBEDDINGS_EXPECTATIONS === 'true';

type ProxyServer = ServiceHelpers['proxy'];

/**
 * Loads the langchain recordings. In replay mode, an embeddings request with no
 * matching recording fails loudly instead of being forwarded to the real API.
 */
export async function setupEmbeddingsProxy(proxy: ProxyServer): Promise<void> {
	await proxy.clearAllExpectations();
	await proxy.loadExpectations(EXPECTATIONS_FOLDER);
	if (!isRecordingEmbeddings) {
		await proxy.failOnUnmatched([EMBEDDINGS_PATH]);
	}
}

/** Response headers worth replaying; everything else (project id, request ids) is dropped. */
const KEPT_RESPONSE_HEADERS = /^(content-type|x-ratelimit-)/i;

/** Persists the embeddings responses captured during a recording run. */
export async function recordEmbeddingsExpectations(proxy: ProxyServer): Promise<void> {
	if (!isRecordingEmbeddings) return;

	await proxy.recordExpectations(EXPECTATIONS_FOLDER, {
		dedupe: true,
		pathOrRequestDefinition: { method: 'POST', path: EMBEDDINGS_PATH },
		transform: (expectation) => {
			const response = expectation.httpResponse as {
				headers?: Record<string, string[]>;
				cookies?: Record<string, string>;
			};
			if (response?.headers) {
				response.headers = Object.fromEntries(
					Object.entries(response.headers).filter(([name]) => KEPT_RESPONSE_HEADERS.test(name)),
				);
			}
			delete response?.cookies;
			return expectation;
		},
	});
}

/**
 * Imports a workflow fixture and attaches an OpenAI credential to every OpenAI
 * node in it. The key is a placeholder unless the run is recording.
 */
export async function importWorkflowWithOpenAiCredential(api: ApiHelpers, fileName: string) {
	const credential = await api.credentials.createCredential({
		name: `OpenAI account ${nanoid()}`,
		type: 'openAiApi',
		data: { apiKey: isRecordingEmbeddings ? (process.env.OPENAI_API_KEY ?? '') : 'abcd' },
	});

	return await api.workflows.importWorkflowFromFile(fileName, {
		transform: (workflow) => {
			for (const node of workflow.nodes ?? []) {
				if (OPENAI_NODE_TYPES.has(node.type)) {
					node.credentials = { openAiApi: { id: credential.id, name: credential.name } };
				}
			}
			return workflow;
		},
	});
}
