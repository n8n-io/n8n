import { normalizeItems } from 'n8n-core';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeTypes,
	IWorkflowDataProxyData,
} from 'n8n-workflow';
import { createRunExecutionData, Expression, Workflow } from 'n8n-workflow';
import { types } from 'node:util';
import { mock } from 'vitest-mock-extended';
import { NodeVM } from 'vm2';

import { standardizeOutput } from '../nodes/Code/utils';
import { Function as FunctionNode } from '../nodes/Function/Function.node';
import { IfV2 } from '../nodes/If/V2/IfV2.node';

const code = `return [{ json: {
	customer: { id: 42, name: 'Ada' },
	contacts: [{ contact: { email: 'ada@example.com' } }],
	createdAt: new Date(0),
	dates: [new Date(0)],
} }];`;

describe.each(['legacy', 'vm', 'quickjs'] as const)('vm2 output (%s engine)', (engine) => {
	const previousEngine = Expression.getActiveImplementation();
	const workflow = new Workflow({
		id: 'vm2-output',
		active: false,
		nodeTypes: mock<INodeTypes>(),
		nodes: ['Function', 'Routed', 'Current'].map(
			(name, index): INode => ({
				id: name,
				name,
				type: 'test.node',
				typeVersion: 1,
				position: [index * 100, 0],
				parameters: {},
			}),
		),
		connections: {
			Function: { main: [[{ node: 'Routed', type: 'main', index: 0 }]] },
			Routed: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
	});

	beforeAll(async () => {
		Expression.setExpressionEngine(engine);
		await Expression.initExpressionEngine({
			engine,
			poolSize: 1,
			maxCodeCacheSize: 16,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
			// Each selected engine must evaluate the expression.
			nativeEvaluation: false,
		});
		expect(Expression.getActiveImplementation()).toBe(engine);
		await workflow.expression.acquireIsolate();
	});

	afterAll(async () => {
		try {
			await workflow.expression.releaseIsolate();
		} finally {
			await Expression.disposeExpressionEngine();
			Expression.setExpressionEngine(previousEngine);
		}
	});

	const evaluate = (items: INodeExecutionData[], expression: string) =>
		workflow.expression.getParameterValue(
			expression,
			createRunExecutionData({
				resultData: {
					runData: {
						Routed: [
							{
								startTime: 0,
								executionTime: 0,
								executionIndex: 0,
								source: [],
								data: { main: [items] },
							},
						],
					},
				},
			}),
			0,
			0,
			'Current',
			items,
			'manual',
			{},
		);

	const runSandbox = async () =>
		(await new NodeVM().run(
			`module.exports = (async () => { ${code} })();`,
		)) as INodeExecutionData[];

	it('reads nested objects and arrays created inside NodeVM', async () => {
		const items = await runSandbox();
		const { json } = items[0];

		expect(types.isProxy(json)).toBe(true);
		expect(types.isProxy(json.customer)).toBe(true);
		expect(Object.getPrototypeOf(json.customer)).toBe(Object.prototype);
		expect(types.isProxy(json.contacts)).toBe(true);
		expect(Array.isArray(json.contacts)).toBe(true);

		expect(evaluate(items, "={{ $('Routed').first().json.customer.name }}")).toBe('Ada');
		expect(evaluate(items, "={{ $('Routed').first().json.contacts[0].contact.email }}")).toBe(
			'ada@example.com',
		);
	});

	it('returns the complete sandbox data with its dates', async () => {
		const items = await runSandbox();

		expect(evaluate(items, "={{ $('Routed').first().json }}")).toEqual({
			customer: { id: 42, name: 'Ada' },
			contacts: [{ contact: { email: 'ada@example.com' } }],
			createdAt: new Date(0),
			dates: [new Date(0)],
		});
	});

	it.each([
		'$json.createdAt',
		'$json.dates[0]',
		"$('Routed').first().json.createdAt",
		"$('Routed').first().json.dates[0]",
	])('preserves a sandbox date read through %s', async (expression) => {
		const items = await runSandbox();
		// LangChain Code uses this cleanup, which keeps Date instances.
		standardizeOutput(items[0].json);

		expect(types.isProxy(items[0].json.createdAt)).toBe(true);
		expect(items[0].json.createdAt).toBeInstanceOf(Date);
		expect(evaluate(items, `={{ ${expression}.getTime() }}`)).toBe(0);
	});

	it('reads Function output after the IF node passes it through', async () => {
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ normalizeItems }),
		});
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getMode.mockReturnValue('manual');
		context.getWorkflowDataProxy.mockReturnValue(mock<IWorkflowDataProxyData>());
		context.getNodeParameter.mockReturnValue(code);
		context.continueOnFail.mockReturnValue(false);

		const [items] = await new FunctionNode().execute.call(context);
		expect(types.isProxy(items[0].json.customer)).toBe(true);

		const ifContext = mock<IExecuteFunctions>();
		ifContext.getInputData.mockReturnValue(items);
		ifContext.getNodeParameter.mockImplementation((name) => (name === 'conditions' ? true : {}));
		ifContext.continueOnFail.mockReturnValue(false);

		const [routed, rejected] = await new IfV2(mock()).execute.call(ifContext);
		expect(rejected).toEqual([]);
		expect(routed[0]).toBe(items[0]);
		expect(types.isProxy(routed[0].json.customer)).toBe(true);
		expect(evaluate(routed, "={{ $('Routed').first().json.customer.name }}")).toBe('Ada');
		expect(evaluate(routed, "={{ $('Routed').first().json.contacts[0].contact.email }}")).toBe(
			'ada@example.com',
		);
	});
});
