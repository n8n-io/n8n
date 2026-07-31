import type {
	IDataObject,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookDescription,
} from '../src/interfaces';
import {
	resolveWebhookDescriptionValue,
	webhookDescriptionIsNativelyResolvable,
} from '../src/webhook-description-resolution';
import { Workflow } from '../src/workflow';

// Native (engine-free) resolution of `webhookDescription` fields, and its
// parity with evaluating the same templates through the expression engine.
//
// Parity is the whole safety argument: `LiveWebhooks` skips acquiring an
// isolate when a description resolves natively, so a native result that
// differs from the engine's would silently change webhook behaviour. This file
// runs under both vitest projects (legacy-engine and vm-engine, see
// vitest.config.ts), so it pins native == legacy AND native == vm.

const isVm = process.env.N8N_EXPRESSION_ENGINE === 'vm';

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

describe('webhookDescriptionIsNativelyResolvable', () => {
	it('accepts plain values, plain $parameter templates and `resolve` entries', () => {
		expect(
			webhookDescriptionIsNativelyResolvable(
				description({
					// Needs the engine on its own, but has a native equivalent
					responseCode: '={{(function (p) { return p.code; })($parameter)}}',
					resolve: { responseCode: (p) => p.code as number },
				}),
			),
		).toBe(true);
	});

	it('rejects a description with a template it cannot resolve', () => {
		expect(
			webhookDescriptionIsNativelyResolvable(
				description({ responseCode: '={{(function (p) { return p.code; })($parameter)}}' }),
			),
		).toBe(false);
		// Reads request data, not just parameters
		expect(webhookDescriptionIsNativelyResolvable(description({ path: '={{$json.body.p}}' }))).toBe(
			false,
		);
	});
});

describe('resolveWebhookDescriptionValue', () => {
	const workflow = buildWorkflow({ path: 'my-path', options: {} });
	const node = workflow.getNode('Webhook')!;

	it('resolves a plain $parameter template', () => {
		expect(resolveWebhookDescriptionValue(node, description(), 'path')).toEqual({
			resolved: true,
			value: 'my-path',
		});
	});

	it('prefers a `resolve` entry over the template', () => {
		const withResolver = description({
			responseCode: '={{(function (p) { return 1; })($parameter)}}',
			resolve: { responseCode: () => 418 },
		});
		expect(resolveWebhookDescriptionValue(node, withResolver, 'responseCode')).toEqual({
			resolved: true,
			value: 418,
		});
	});

	it('declines for non-expression values, which need no isolate anyway', () => {
		expect(resolveWebhookDescriptionValue(node, description(), 'isFullPath')).toEqual({
			resolved: false,
		});
		expect(resolveWebhookDescriptionValue(node, description(), 'restartWebhook')).toEqual({
			resolved: false,
		});
	});

	it('declines entirely once any node parameter is an expression', () => {
		const dynamic = buildWorkflow({ path: 'my-path', options: { onlyRunIf: '={{ true }}' } });
		const dynamicNode = dynamic.getNode('Webhook')!;

		expect(resolveWebhookDescriptionValue(dynamicNode, description(), 'path')).toEqual({
			resolved: false,
		});
		expect(
			resolveWebhookDescriptionValue(
				dynamicNode,
				description({ resolve: { path: () => 'native' } }),
				'path',
			),
		).toEqual({ resolved: false });
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

	// Same shape as the real description, including the two fields whose
	// templates inline a function body and are backed by `resolve`.
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
		expect(webhookDescriptionIsNativelyResolvable(fullDescription)).toBe(true);
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
			const native = resolveWebhookDescriptionValue(node, fullDescription, field);
			expect(native.resolved).toBe(true);

			const viaEngine = workflow.expression.getSimpleParameterValue(
				node,
				fullDescription[field] as string,
				'internal',
				{},
			);

			expect(native.resolved && native.value).toEqual(viaEngine);
		});
	});
});

describe('resolution without an acquired isolate', () => {
	const workflow = buildWorkflow({ path: 'hook', options: {} });
	const node = workflow.getNode('Webhook')!;

	// No `acquireIsolate()` anywhere in this suite — the point of the feature.
	it('resolves description fields natively', () => {
		expect(
			workflow.expression.getWebhookDescriptionValue(node, description(), 'path', 'internal', {}),
		).toBe('hook');
		expect(
			workflow.expression.getComplexWebhookDescriptionValue(
				node,
				description({
					responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
				}),
				'responseHeaders',
				'internal',
				{},
			),
		).toBeUndefined();
	});

	it('falls back to the default for a field the description does not define', () => {
		expect(
			workflow.expression.getWebhookDescriptionValue(
				node,
				description(),
				'restartWebhook',
				'internal',
				{},
				undefined,
				false,
			),
		).toBe(false);
	});

	it.runIf(isVm)('the same templates need an isolate through the engine', () => {
		expect(() =>
			workflow.expression.getSimpleParameterValue(node, '={{$parameter["path"]}}', 'internal', {}),
		).toThrow();
	});
});
