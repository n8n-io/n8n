import type { IDataObject, INodeParameters, INodeType, INodeTypes } from 'n8n-workflow';
import { Workflow, webhookDescriptionIsNativelyResolvable } from 'n8n-workflow';

import { defaultWebhookDescription } from '../description';
import { Webhook } from '../Webhook.node';

// The webhook description is resolved on every incoming production request. Its
// templates are only `$parameter` reads (plus two that inline a function body
// and are backed by a `resolve` entry), which lets the webhook layer resolve
// them without the expression engine — and therefore, under
// `N8N_EXPRESSION_ENGINE=vm`, without building an isolate per request.
//
// These tests pin the two properties that makes safe: every field is natively
// resolvable, and each `resolve` entry returns exactly what evaluating its
// template through the engine returns.

const webhookNode = new Webhook();

const nodeTypes: INodeTypes = {
	getByName: () => webhookNode as INodeType,
	getByNameAndVersion: () => webhookNode as INodeType,
	getKnownTypes: () => ({}) as IDataObject,
};

const nodeWithParameters = (parameters: INodeParameters) => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.1,
				id: 'webhook-1',
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: true,
		nodeTypes,
	});

	return { workflow, node: workflow.getNode('Webhook')! };
};

describe('defaultWebhookDescription', () => {
	it('is fully resolvable without the expression engine', () => {
		// Guards the `LiveWebhooks` isolate skip: a field added here that neither
		// is a plain `$parameter` read nor has a `resolve` entry makes this false,
		// which costs performance but stays correct.
		expect(webhookDescriptionIsNativelyResolvable(defaultWebhookDescription)).toBe(true);
	});

	describe('resolve entries match their templates', () => {
		const parameterSets: Array<[string, INodeParameters]> = [
			['defaults only', {}],
			['respond immediately with a fixed body', { responseMode: 'onReceived', options: {} }],
			[
				'last node, all entries',
				{ responseMode: 'lastNode', responseData: 'allEntries', options: {} },
			],
			['respond via node', { responseMode: 'responseNode', options: {} }],
			['no response body', { responseMode: 'onReceived', options: { noResponseBody: true } }],
			[
				'response data from options',
				{ responseMode: 'onReceived', options: { responseData: 'noData' } },
			],
			['custom status code', { options: { responseCode: { values: { responseCode: 201 } } } }],
			[
				'custom status code with a custom value',
				{ options: { responseCode: { values: { responseCode: 0, customCode: 418 } } } },
			],
			['legacy typeVersion 1 status code', { responseCode: 302, options: {} }],
			['multiple methods', { httpMethod: ['GET', 'POST'], multipleMethods: true, options: {} }],
		];

		describe.each(parameterSets)('%s', (_name, parameters) => {
			const { workflow, node } = nodeWithParameters(parameters);

			test.each(Object.keys(defaultWebhookDescription.resolve ?? {}))('%s', (field) => {
				const native = defaultWebhookDescription.resolve![field](node.parameters);

				const viaEngine = workflow.expression.getSimpleParameterValue(
					node,
					defaultWebhookDescription[field] as string,
					'internal',
					{},
				);

				expect(native).toEqual(viaEngine);
			});
		});
	});
});
