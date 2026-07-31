import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, test } from 'vitest';

import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';
import * as Helpers from './helpers';

describe('Expression VM engine dispatch', () => {
	let workflow: Workflow;

	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine: 'vm',
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
			poolSize: 1,
			maxCodeCacheSize: 64,
		});

		const nodeTypes = Helpers.NodeTypes();
		workflow = new Workflow({
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1',
					parameters: {},
					position: [0, 0],
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});

	beforeEach(async () => {
		await workflow.expression.acquireIsolate();
	});

	afterEach(async () => {
		await workflow.expression.releaseIsolate();
	});

	test('reports vm as active implementation while engine is set', () => {
		expect(Expression.getActiveImplementation()).toBe('vm');
	});

	test('evaluates a simple expression through the VM engine', () => {
		const result = workflow.expression.getSimpleParameterValue(
			workflow.nodes.node,
			'={{ 7 * 6 }}',
			'manual',
			{},
		);
		expect(result).toBe(42);
	});

	test('evaluates string concatenation through the VM engine', () => {
		const result = workflow.expression.getSimpleParameterValue(
			workflow.nodes.node,
			'={{ "hello " + "world" }}',
			'manual',
			{},
		);
		expect(result).toBe('hello world');
	});
});
