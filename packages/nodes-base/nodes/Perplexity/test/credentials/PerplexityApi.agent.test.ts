import { Container } from '@n8n/di';
import { ExecuteContext, InstanceSettings, RoutingNode } from 'n8n-core';
import type {
	ICredentialsDecrypted,
	ICredentialsHelper,
	IDataObject,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createEmptyRunExecutionData, Workflow } from 'n8n-workflow';
import nock from 'nock';
import { rmSync } from 'node:fs';
import { mock } from 'vitest-mock-extended';

import { PerplexityApi } from '../../../../credentials/PerplexityApi.credentials';
import { PerplexityV3 } from '../../v3/PerplexityV3.node';

const userFolder = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const folder = mkdtempSync(join(tmpdir(), 'n8n-perplexity-credential-test-'));
	vi.stubEnv('N8N_USER_FOLDER', folder);
	return folder;
});

describe('Perplexity API credential validation with Agent API access', () => {
	const credentialType = new PerplexityApi();
	const credentials: ICredentialsDecrypted = {
		id: 'perplexity-test-credential',
		name: 'Perplexity test credential',
		type: credentialType.name,
		data: { apiKey: 'test-api-key' },
	};
	const agentResponse = {
		id: 'resp_test',
		object: 'response',
		model: 'perplexity/sonar',
		status: 'completed',
		output: [
			{
				type: 'message',
				role: 'assistant',
				content: [{ type: 'output_text', text: 'Hello.' }],
			},
		],
	};
	const agentNode = new PerplexityV3({
		displayName: 'Perplexity',
		name: 'perplexity',
		group: ['transform'],
		description: 'Perplexity',
	});
	const agentParameters: INodeParameters = {
		resource: 'agent',
		operation: 'createResponse',
		input: 'Say hello.',
		model: { mode: 'id', value: 'perplexity/sonar' },
	};

	beforeEach(() => {
		// Prevent execution contexts from loading or creating instance settings.
		Container.set(InstanceSettings, mock<InstanceSettings>());
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		Container.reset();
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	});

	const runNode = async (nodeType: INodeType, parameters: INodeParameters = {}) => {
		const node: INode = {
			id: 'perplexity-test-node',
			name: 'Perplexity',
			type: nodeType.description.name,
			typeVersion: 3,
			position: [0, 0],
			parameters,
			credentials: {
				perplexityApi: { id: credentials.id, name: credentials.name },
			},
		};
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		const workflow = new Workflow({ nodes: [node], connections: {}, active: false, nodeTypes });
		const credentialsHelper = mock<ICredentialsHelper>();
		credentialsHelper.getParentTypes.mockReturnValue([]);
		credentialsHelper.authenticate.mockImplementation(async (data, _type, options) => ({
			...(options as IHttpRequestOptions),
			headers: {
				...options.headers,
				...(workflow.expression.getParameterValue(
					credentialType.authenticate.properties.headers as INodeParameters,
					null,
					0,
					0,
					node.name,
					[],
					'internal',
					{ $credentials: data },
				) as IDataObject),
			},
		}));
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			credentialsHelper,
			currentNodeParameters: node.parameters,
			evalLlmMockHandler: undefined,
			ssrfBridge: undefined,
		});
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			'internal',
			createEmptyRunExecutionData(),
			0,
			[],
			{ main: [[{ json: {} }]] },
			{ node, data: {}, source: null },
			[],
		);

		try {
			await workflow.expression.acquireIsolate();
			return await new RoutingNode(context, nodeType, credentials).runNode();
		} finally {
			await workflow.expression.releaseIsolate();
		}
	};

	const mockAgentResponse = () =>
		nock('https://api.perplexity.ai')
			.matchHeader('Authorization', 'Bearer test-api-key')
			.post('/v1/agent', { input: 'Say hello.', model: 'perplexity/sonar', preset: '' })
			.reply(200, agentResponse);

	it('should execute the v3 Agent operation with a valid credential', async () => {
		const agentScope = mockAgentResponse();

		const result = await runNode(agentNode, agentParameters);

		expect(result?.[0]?.[0]?.json).toEqual(agentResponse);
		expect(agentScope.isDone()).toBe(true);
	});

	// NODE-6067: Agent API access must not require Chat Completions access.
	it('should validate a credential that works with the v3 Agent operation', async () => {
		const agentScope = mockAgentResponse();
		nock('https://api.perplexity.ai')
			.matchHeader('Authorization', 'Bearer test-api-key')
			.post('/chat/completions')
			.reply(403, {
				error: {
					type: 'chat_completions_not_available',
					message: 'Chat Completions is not available. Migrate to the Agent API.',
				},
			});
		nock('https://api.perplexity.ai')
			.matchHeader('Authorization', 'Bearer test-api-key')
			.post(
				'/v1/agent',
				(body: { input?: string; model?: string }) =>
					typeof body.input === 'string' && body.model === 'perplexity/sonar',
			)
			.reply(200, agentResponse);
		nock('https://api.perplexity.ai')
			.matchHeader('Authorization', 'Bearer test-api-key')
			.get('/v1/models')
			.reply(200, { data: [{ id: 'perplexity/sonar', owned_by: 'perplexity' }] });

		const agentResult = await runNode(agentNode, agentParameters);
		expect(agentResult?.[0]?.[0]?.json).toEqual(agentResponse);
		expect(agentScope.isDone()).toBe(true);

		// Run the declared credential test through the editor's request routing path.
		const validationNode: INodeType = {
			description: {
				...agentNode.description,
				requestDefaults: {},
				properties: [
					{
						displayName: 'Test',
						name: 'test',
						type: 'string',
						default: '',
						routing: { request: credentialType.test.request },
					},
				],
			},
		};

		await expect(runNode(validationNode)).resolves.toBeDefined();
	});
});
