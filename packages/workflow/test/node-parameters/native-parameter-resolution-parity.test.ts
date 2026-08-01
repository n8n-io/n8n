import type {
	IDataObject,
	INode,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookDescription,
} from '../../src/interfaces';
import {
	resolveNativeParameterValue,
	valuesAreNativelyResolvable,
} from '../../src/node-parameters/native-parameter-resolution';
import { createEmptyRunExecutionData } from '../../src/run-execution-data-factory';
import { Workflow } from '../../src/workflow';

// Native (engine-free) resolution of node-description templates, and its parity
// with evaluating the same templates through the expression engine.
//
// Parity is the whole safety argument: `LiveWebhooks` skips acquiring an
// isolate when a description resolves natively, so a native result that
// differs from the engine's would silently change webhook behaviour. This file
// runs under both vitest projects (legacy-engine and vm-engine, see
// vitest.config.ts), so it pins native == legacy AND native == vm.
//
// The fixtures are webhook descriptions because that is the first consumer, but
// nothing under test knows what a webhook is.

// A stand-in for the base Webhook node, declaring the parameters the
// description templates read. Declaring them matters: the `Workflow`
// constructor runs `NodeHelpers.getNodeParameters`, which drops values the node
// type does not declare — and the engine's `$parameter` proxy reads that same
// post-processed object, which is exactly why native resolution can stand in
// for it.
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
			{ displayName: 'Code', name: 'responseCode', type: 'number', default: 200 },
			{ displayName: 'Data', name: 'responseData', type: 'string', default: '' },
			{
				displayName: 'Binary Property',
				name: 'responseBinaryPropertyName',
				type: 'string',
				default: 'data',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{ displayName: 'Content-Type', name: 'responseContentType', type: 'string', default: '' },
					{ displayName: 'Property', name: 'responsePropertyName', type: 'string', default: '' },
					{ displayName: 'Headers', name: 'responseHeaders', type: 'json', default: {} },
					{ displayName: 'No Body', name: 'noResponseBody', type: 'boolean', default: false },
					{ displayName: 'Only Run If', name: 'onlyRunIf', type: 'string', default: '' },
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

const buildWorkflow = (parameters: INodeParameters) =>
	new Workflow({
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

/**
 * Deliberately not `getSimpleParameterValue`, which takes the native path itself
 * and would compare a value against itself.
 */
const evaluateWithEngine = (workflow: Workflow, node: INode, template: string) =>
	workflow.expression.resolveSimpleParameterValue(
		template,
		{},
		createEmptyRunExecutionData(),
		0,
		0,
		node.name,
		[],
		'internal',
		{},
	);

/** Mirrors the shapes real webhook descriptions use. */
const description = (extra: Partial<IWebhookDescription> = {}): IWebhookDescription => ({
	name: 'default',
	path: '={{$parameter["path"]}}',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	isFullPath: true,
	responseMode: '={{$parameter["responseMode"]}}',
	responseContentType: '={{$parameter["options"]["responseContentType"]}}',
	...extra,
});

describe('valuesAreNativelyResolvable over a description', () => {
	it('accepts plain values, plain $parameter templates and declared resolvers', () => {
		const withResolver = description({
			// Needs the engine on its own, but has a native equivalent
			responseCode: '={{(function (p) { return p.code; })($parameter)}}',
			resolve: { responseCode: (p) => p.code as number },
		});

		expect(valuesAreNativelyResolvable(withResolver, withResolver.resolve)).toBe(true);
	});

	it('rejects a description with a template it cannot resolve', () => {
		expect(
			valuesAreNativelyResolvable(
				description({ responseCode: '={{(function (p) { return p.code; })($parameter)}}' }),
			),
		).toBe(false);
		// Reads request data, not just parameters
		expect(valuesAreNativelyResolvable(description({ path: '={{$json.body.p}}' }))).toBe(false);
	});
});

describe('resolveNativeParameterValue over a description', () => {
	const workflow = buildWorkflow({ path: 'my-path', options: {} });
	const node = workflow.getNode('Webhook')!;

	it('resolves a plain $parameter template', () => {
		expect(resolveNativeParameterValue(node, description().path)).toEqual({
			resolved: true,
			value: 'my-path',
		});
	});

	it('uses a declared resolver in place of the template', () => {
		expect(
			resolveNativeParameterValue(node, '={{(function (p) { return 1; })($parameter)}}', () => 418),
		).toEqual({ resolved: true, value: 418 });
	});

	it('declines for non-expression values, which need no isolate anyway', () => {
		expect(resolveNativeParameterValue(node, description().isFullPath)).toEqual({
			resolved: false,
		});
		expect(resolveNativeParameterValue(node, description().restartWebhook)).toEqual({
			resolved: false,
		});
	});

	it('declines entirely once any node parameter is an expression', () => {
		const dynamic = buildWorkflow({ path: 'my-path', options: { onlyRunIf: '={{ true }}' } });
		const dynamicNode = dynamic.getNode('Webhook')!;

		expect(resolveNativeParameterValue(dynamicNode, description().path)).toEqual({
			resolved: false,
		});
		expect(resolveNativeParameterValue(dynamicNode, description().path, () => 'native')).toEqual({
			resolved: false,
		});
	});
});

describe('native resolution matches the expression engine', () => {
	// Every shape the base Webhook node's description uses, over parameter sets
	// that exercise the interesting branches (missing keys, falsy values, arrays,
	// nested objects, inlined function bodies).
	const parameterSets: Array<[string, INodeParameters]> = [
		[
			'fully configured',
			{
				path: 'hook',
				httpMethod: 'POST',
				responseMode: 'lastNode',
				responseCode: 201,
				responseData: 'allEntries',
				responseBinaryPropertyName: 'file',
				options: {
					responseContentType: 'application/json',
					responsePropertyName: 'payload',
					responseHeaders: { entries: [{ name: 'x-a', value: 'b' }] },
				},
			},
		],
		['empty options', { path: 'hook', httpMethod: 'GET', responseMode: 'onReceived', options: {} }],
		['missing keys', { path: 'hook' }],
		[
			'falsy values',
			{ path: '', httpMethod: '', responseMode: '', options: { responsePropertyName: '' } },
		],
		['array httpMethod', { path: 'hook', httpMethod: ['GET', 'POST'], options: {} }],
		[
			'numeric and boolean values',
			{ path: 'hook', responseCode: 0, options: { noResponseBody: true } },
		],
	];

	const fields = [
		'path',
		'httpMethod',
		'responseMode',
		'responseContentType',
		'responsePropertyName',
		'responseHeaders',
		'responseBinaryPropertyName',
		'inlinedFunction',
	];

	// Same shape as the real description, including a field whose template
	// inlines a function body and is backed by a resolver.
	const inlinedFunction = (parameters: INodeParameters) =>
		(parameters.responseCode as number | undefined) ??
		((parameters.options as INodeParameters | undefined)?.noResponseBody ? 204 : 200);

	const fullDescription: IWebhookDescription = {
		name: 'default',
		path: '={{$parameter["path"]}}',
		httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
		responseMode: '={{$parameter["responseMode"]}}',
		responseContentType: '={{$parameter["options"]["responseContentType"]}}',
		responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
		responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
		responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
		inlinedFunction: `={{(${inlinedFunction.toString()})($parameter)}}`,
		resolve: { inlinedFunction },
	};

	it('resolves every field natively', () => {
		expect(valuesAreNativelyResolvable(fullDescription, fullDescription.resolve)).toBe(true);
	});

	describe.each(parameterSets)('%s', (_name, parameters) => {
		const workflow = buildWorkflow(parameters);
		const node = workflow.getNode('Webhook')!;

		// The engine comparison needs an isolate under the VM engine; the native
		// path deliberately does not, which is what the skip relies on.
		beforeAll(async () => {
			await workflow.expression.acquireIsolate();
		});
		afterAll(async () => {
			await workflow.expression.releaseIsolate();
		});

		test.each(fields)('%s', (field) => {
			const native = resolveNativeParameterValue(
				node,
				fullDescription[field],
				fullDescription.resolve?.[field],
			);
			expect(native.resolved).toBe(true);

			expect(native.resolved && native.value).toEqual(
				evaluateWithEngine(workflow, node, fullDescription[field] as string),
			);
		});
	});
});

// Templates chosen to stress the matcher rather than to mirror a real
// description. Each row states whether the matcher takes it; the ones it takes
// must resolve to what the engine resolves. Escapes are the interesting half:
// `parseLiteral` only strips the quotes, so a matcher that accepted them would
// resolve them raw.
describe('matcher decisions and their parity', () => {
	// `path` is falsy so `||` tails are taken, and every key is declared on the
	// node type — undeclared keys read `undefined` on both sides, hiding mismatches.
	const workflow = buildWorkflow({ path: '', options: {} });
	const node = workflow.getNode('Webhook')!;

	beforeAll(async () => {
		await workflow.expression.acquireIsolate();
	});
	afterAll(async () => {
		await workflow.expression.releaseIsolate();
	});

	const NATIVE = true;
	const ENGINE = false;

	const templates: Array<[string, boolean]> = [
		['={{$parameter["path"] || "plain"}}', NATIVE],
		['={{$parameter["path"] || \'plain\'}}', NATIVE],
		['={{$parameter["path"] || \'x"y\'}}', NATIVE],
		['={{$parameter["path"] || -1.5}}', NATIVE],
		['={{$parameter["path"] || false}}', NATIVE],
		['={{$parameter["path"] || null}}', NATIVE],
		['={{$parameter["options"]["responseHeaders"]}}', NATIVE],
		['={{$parameter["path"] || "x\\ny"}}', ENGINE],
		['={{$parameter["path"] || "x\\ty"}}', ENGINE],
		['={{$parameter["path"] || "x\\u0041y"}}', ENGINE],
		['={{$parameter["path"] || "x\\\'y"}}', ENGINE],
		['={{$parameter["path"] || \'x\\\\\'}}', ENGINE],
		// A raw line break inside the quotes: a syntax error to the engine
		['={{$parameter["path"] || "x\ny"}}', ENGINE],
	];

	it.each(templates)('%s: matcher takes it === %s', (template, resolvesNatively) => {
		expect(resolveNativeParameterValue(node, template).resolved).toBe(resolvesNatively);
	});

	it.each(templates.filter(([, resolvesNatively]) => resolvesNatively))(
		'%s: resolves to what the engine resolves',
		(template) => {
			const native = resolveNativeParameterValue(node, template);

			expect(native.resolved && native.value).toEqual(evaluateWithEngine(workflow, node, template));
		},
	);
});

// The opt-in that makes the isolate skip safe: with it, every caller that reads
// a description through `workflow.expression` — including ones in other
// packages, e.g. `getNodeWebhookUrl` in n8n-core — resolves natively.
describe('Workflow.nativeParameterResolution', () => {
	const isVm = process.env.N8N_EXPRESSION_ENGINE === 'vm';

	const buildOptedInWorkflow = (parameters: INodeParameters) => {
		const workflow = buildWorkflow(parameters);
		return new Workflow({
			id: workflow.id,
			nodes: Object.values(workflow.nodes),
			connections: {},
			active: false,
			nodeTypes,
			nativeParameterResolution: true,
		});
	};

	it('resolves without an isolate when opted in', () => {
		const workflow = buildOptedInWorkflow({ path: 'hook', options: {} });
		const node = workflow.getNode('Webhook')!;

		// No `acquireIsolate()` anywhere in this test — the point of the feature
		expect(
			workflow.expression.getSimpleParameterValue(node, description().path, 'internal', {}),
		).toBe('hook');
		expect(
			workflow.expression.getSimpleParameterValue(
				node,
				'={{(function (p) { return p.path; })($parameter)}}',
				'internal',
				{},
				undefined,
				undefined,
				(parameters) => parameters.path as string,
			),
		).toBe('hook');
	});

	it.runIf(isVm)('needs an isolate when not opted in', () => {
		const workflow = buildWorkflow({ path: 'hook', options: {} });
		const node = workflow.getNode('Webhook')!;

		expect(() =>
			workflow.expression.getSimpleParameterValue(node, description().path, 'internal', {}),
		).toThrow();
	});

	it.runIf(isVm)('needs an isolate once a node parameter is an expression', () => {
		const workflow = buildOptedInWorkflow({ path: 'hook', options: { onlyRunIf: '={{ true }}' } });
		const node = workflow.getNode('Webhook')!;

		expect(() =>
			workflow.expression.getSimpleParameterValue(node, description().path, 'internal', {}),
		).toThrow();
	});
});
