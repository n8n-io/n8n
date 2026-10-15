import type {
	IDataObject,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookDescription,
} from '../src/interfaces';
import { WEBHOOK_RESOLVERS } from '../src/interfaces';
import {
	fromFunction,
	fromParameter,
	nodeParametersAreStatic,
	resolveWebhookDescriptionField,
	webhookDescriptionFields,
	webhookDescriptionIsNativelyResolvable,
} from '../src/webhook-description-fields';
import { Workflow } from '../src/workflow';

// Template and resolver are generated from one declaration, so this parity
// corpus is the entire sync guarantee: for every field shape, the resolver must
// return exactly what the generated template returns through the engine.

// Declaring the parameters matters: the `Workflow` constructor runs
// `NodeHelpers.getNodeParameters`, which applies declared defaults — and the
// engine's `$parameter` proxy reads that same post-processed object, which is
// what resolvers read too.
const webhookNodeType: INodeType = {
	description: {
		displayName: 'Webhook',
		name: 'webhook',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: { name: 'Webhook' },
		inputs: [],
		outputs: ['main'],
		properties: [
			{ displayName: 'Method', name: 'httpMethod', type: 'string', default: 'GET' },
			{ displayName: 'Path', name: 'path', type: 'string', default: '' },
			{ displayName: 'Respond', name: 'responseMode', type: 'string', default: 'onReceived' },
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{ displayName: 'Content-Type', name: 'responseContentType', type: 'string', default: '' },
					{ displayName: 'No Body', name: 'noResponseBody', type: 'boolean', default: false },
				],
			},
		],
	},
};

const nodeTypes: INodeTypes = {
	getByName: () => webhookNodeType,
	getByNameAndVersion: () => webhookNodeType,
	getKnownTypes: () => ({}) as IDataObject,
};

const nodeWithParameters = (parameters: INodeParameters) => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Webhook',
				typeVersion: 1,
				type: 'test.webhook',
				id: 'webhook-1',
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});

	return { workflow, node: workflow.getNode('Webhook')! };
};

// This file runs under both vitest projects (legacy and vm), so parity is
// pinned against both engines; the vm engine needs an acquired isolate.
const viaEngine = async (parameters: INodeParameters, template: string) => {
	const { workflow, node } = nodeWithParameters(parameters);
	await workflow.expression.acquireIsolate();
	try {
		return workflow.expression.getSimpleParameterValue(node, template, 'internal', {});
	} finally {
		await workflow.expression.releaseIsolate();
	}
};

const viaResolver = (parameters: INodeParameters, field: ReturnType<typeof fromParameter>) => {
	const { node } = nodeWithParameters(parameters);
	return field.resolve(node.parameters);
};

describe('fromParameter', () => {
	it('generates the long-standing template shapes', () => {
		expect(fromParameter('path').template).toBe('={{$parameter["path"]}}');
		expect(fromParameter('httpMethod', 'GET').template).toBe(
			'={{$parameter["httpMethod"] || "GET"}}',
		);
		expect(fromParameter(['options', 'responseContentType']).template).toBe(
			'={{$parameter["options"]["responseContentType"]}}',
		);
	});

	describe('resolver matches the engine', () => {
		const cases: Array<[string, ReturnType<typeof fromParameter>, INodeParameters]> = [
			['single segment, present', fromParameter('path'), { path: 'my-path' }],
			['single segment, default applies', fromParameter('path'), {}],
			['fallback, value present', fromParameter('httpMethod', 'POST'), { httpMethod: 'DELETE' }],
			['fallback, value falsy', fromParameter('responseMode', 'onReceived'), { responseMode: '' }],
			['fallback, value missing', fromParameter('httpMethod', 'HEAD'), {}],
			[
				'nested, present',
				fromParameter(['options', 'responseContentType']),
				{ options: { responseContentType: 'text/plain' } },
			],
			['nested, missing leaf', fromParameter(['options', 'responseContentType']), { options: {} }],
			[
				'nested boolean, falsy present',
				fromParameter(['options', 'noResponseBody']),
				{ options: { noResponseBody: false } },
			],
		];

		test.each(cases)('%s', async (_name, field, parameters) => {
			expect(viaResolver(parameters, field)).toEqual(await viaEngine(parameters, field.template));
		});
	});

	it('yields undefined when walking into a missing parent, like the engine', async () => {
		// 'undeclared' is not in the node type's properties, so no default is
		// applied and the parent is truly absent — pins that the engine also
		// yields undefined (it does, under both vitest engine projects) rather
		// than throwing on the nested access.
		const field = fromParameter(['undeclared', 'x']);
		expect(viaResolver({}, field)).toBeUndefined();
		expect(await viaEngine({}, field.template)).toBeUndefined();

		expect(fromParameter(['options', 'responseContentType']).resolve({})).toBeUndefined();
	});

	it('applies the fallback when walking into a missing parent', () => {
		expect(fromParameter(['options', 'responseContentType'], 'text/html').resolve({})).toBe(
			'text/html',
		);
	});
});

describe('fromFunction', () => {
	const getResponseData = (parameters: INodeParameters) =>
		parameters.responseMode === 'lastNode' ? 'noData' : undefined;

	it('inlines the function source into the template and reuses it as resolver', () => {
		const field = fromFunction(getResponseData);
		expect(field.template).toBe(`={{(${getResponseData})($parameter)}}`);
		expect(field.resolve).toBe(getResponseData);
	});

	test.each<[string, INodeParameters]>([
		['branch taken', { responseMode: 'lastNode' }],
		['branch not taken', { responseMode: 'onReceived' }],
	])('resolver matches the engine: %s', async (_name, parameters) => {
		const field = fromFunction(getResponseData);
		expect(viaResolver(parameters, field)).toEqual(await viaEngine(parameters, field.template));
	});
});

describe('webhookDescriptionFields', () => {
	const fields = webhookDescriptionFields({
		path: fromParameter('path'),
		httpMethod: fromParameter('httpMethod', 'GET'),
	});

	it('spreads template strings and keeps resolvers under the symbol key', () => {
		expect(fields.path).toBe('={{$parameter["path"]}}');
		expect(fields.httpMethod).toBe('={{$parameter["httpMethod"] || "GET"}}');
		expect(Object.keys(fields[WEBHOOK_RESOLVERS])).toEqual(['path', 'httpMethod']);
	});

	it('does not leak resolvers through JSON serialization', () => {
		expect(JSON.parse(JSON.stringify(fields))).toEqual({
			path: '={{$parameter["path"]}}',
			httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
		});
	});
});

describe('resolveWebhookDescriptionField', () => {
	const description: IWebhookDescription = {
		name: 'default',
		isFullPath: true,
		...webhookDescriptionFields({
			path: fromParameter('path'),
			httpMethod: fromParameter('httpMethod', 'GET'),
		}),
	};

	it('resolves a declared field for a static-parameter node', () => {
		expect(
			resolveWebhookDescriptionField({ parameters: { path: 'my-path' } }, description, 'path'),
		).toEqual({ resolved: true, value: 'my-path' });
	});

	it('does not resolve when the node parameters contain an expression', () => {
		expect(
			resolveWebhookDescriptionField(
				{ parameters: { path: 'my-path', extra: '={{ $json.x }}' } },
				description,
				'path',
			),
		).toEqual({ resolved: false });
	});

	it('does not resolve a field without a resolver', () => {
		expect(resolveWebhookDescriptionField({ parameters: {} }, description, 'isFullPath')).toEqual({
			resolved: false,
		});
	});
});

describe('spread-and-override descriptions (Wait/GitHub pattern)', () => {
	// Object spread copies the resolver map's symbol key, so a description built
	// by spreading another inherits resolvers for fields it may override. The
	// template-identity check must invalidate exactly those.
	const base: IWebhookDescription = {
		name: 'default',
		httpMethod: 'GET',
		...webhookDescriptionFields({
			path: fromParameter('path'),
			responseMode: fromParameter('responseMode'),
		}),
	};
	const overridden: IWebhookDescription = {
		...base,
		path: '={{$parameter["options"]["webhookSuffix"] || ""}}',
	};

	it('does not apply an inherited resolver to an overridden template', () => {
		expect(
			resolveWebhookDescriptionField(
				{ parameters: { options: { webhookSuffix: 'abc' } } },
				overridden,
				'path',
			),
		).toEqual({ resolved: false });
	});

	it('still applies inherited resolvers whose templates are untouched', () => {
		expect(
			resolveWebhookDescriptionField(
				{ parameters: { responseMode: 'lastNode' } },
				overridden,
				'responseMode',
			),
		).toEqual({ resolved: true, value: 'lastNode' });
	});

	it('is not fully resolvable once a template is overridden without a resolver', () => {
		expect(webhookDescriptionIsNativelyResolvable(overridden)).toBe(false);
	});
});

describe('webhookDescriptionIsNativelyResolvable', () => {
	it('accepts a description whose templates all have resolvers', () => {
		const description: IWebhookDescription = {
			name: 'default',
			isFullPath: true,
			httpMethod: 'GET',
			...webhookDescriptionFields({ path: fromParameter('path') }),
		};
		expect(webhookDescriptionIsNativelyResolvable(description)).toBe(true);
	});

	it('rejects a description with a template lacking a resolver', () => {
		const description: IWebhookDescription = {
			name: 'default',
			path: '={{$parameter["path"]}}',
			httpMethod: 'GET',
		};
		expect(webhookDescriptionIsNativelyResolvable(description)).toBe(false);
	});
});

describe('nodeParametersAreStatic', () => {
	test.each<[string, INodeParameters, boolean]>([
		['plain values', { path: 'x', options: { a: 1 } }, true],
		['expression string', { path: '={{ $json.x }}' }, false],
		['nested expression string', { options: { a: '={{ 1 }}' } }, false],
		['expression in array', { list: ['a', '={{ 1 }}'] }, false],
		[
			'resource locator',
			{ target: { __rl: true, mode: 'id', value: 'x' } as unknown as INodeParameters },
			false,
		],
	])('%s', (_name, parameters, expected) => {
		expect(nodeParametersAreStatic({ parameters })).toBe(expected);
	});
});
