import { TimeoutError, MemoryLimitError, SecurityViolationError } from '@n8n/expression-runtime';
import type { IExpressionEvaluator } from '@n8n/expression-runtime';

import { ExpressionError } from '../src/errors/expression.error';
import { ExpressionExtensionError } from '../src/errors/expression-extension.error';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';
import * as Helpers from './helpers';

/**
 * Tests that VM-specific error types from @n8n/expression-runtime
 * are caught and wrapped in workflow ExpressionError instances.
 *
 * The runtime package defines its own ExpressionError class hierarchy
 * (TimeoutError, MemoryLimitError, SecurityViolationError), which is
 * different from packages/workflow's ExpressionError. Without explicit
 * handling, these errors bypass the isExpressionError() check and
 * propagate as raw runtime errors.
 */
describe('Expression VM error handling', () => {
	const nodeTypes = Helpers.NodeTypes();
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'node',
				typeVersion: 1,
				type: 'test.set',
				id: 'uuid-1234',
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});

	let originalEngine: 'current' | 'vm';
	let originalEvaluator: IExpressionEvaluator | undefined;

	beforeEach(() => {
		originalEngine = Expression.getActiveImplementation();
		originalEvaluator = (Expression as any).vmEvaluator;
	});

	afterEach(() => {
		Expression.setExpressionEngine(originalEngine);
		(Expression as any).vmEvaluator = originalEvaluator;
	});

	function setVmEvaluator(evaluator: Partial<IExpressionEvaluator>) {
		Expression.setExpressionEngine('vm');
		(Expression as any).vmEvaluator = evaluator;
	}

	const evaluate = (expr: string) =>
		workflow.expression.getParameterValue(expr, null, 0, 0, 'node', [], 'manual', {});

	it('should wrap TimeoutError in ExpressionError', () => {
		const timeoutError = new TimeoutError('Expression timed out after 5000ms', {});
		setVmEvaluator({
			evaluate: () => {
				throw timeoutError;
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).message).toBe('Expression timed out');
		expect((caught as ExpressionError).cause).toBe(timeoutError);
	});

	it('should wrap MemoryLimitError in ExpressionError', () => {
		const memoryError = new MemoryLimitError('Expression exceeded memory limit of 128MB', {});
		setVmEvaluator({
			evaluate: () => {
				throw memoryError;
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).message).toBe('Expression exceeded memory limit');
		expect((caught as ExpressionError).cause).toBe(memoryError);
	});

	it('should wrap SecurityViolationError in ExpressionError', () => {
		const securityError = new SecurityViolationError(
			'Cannot access "constructor" due to security concerns',
			{},
		);
		setVmEvaluator({
			evaluate: () => {
				throw securityError;
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).message).toBe(
			'Cannot access "constructor" due to security concerns',
		);
		expect((caught as ExpressionError).cause).toBe(securityError);
	});

	it('should preserve description when reconstructing ExpressionError across isolate boundary', () => {
		setVmEvaluator({
			evaluate: () => {
				throw new ExpressionError('something went wrong', {
					description: 'A human-readable description',
				});
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).description).toBe('A human-readable description');
	});

	it('should preserve description when reconstructing ExpressionExtensionError across isolate boundary', () => {
		// After crossing the isolate boundary, the error is a plain Error with
		// name='ExpressionExtensionError' and properties restored via Object.assign.
		// Simulate what reconstructError() produces:
		const boundaryError = Object.assign(new Error('extension failed'), {
			name: 'ExpressionExtensionError',
			description: 'Extension-specific description',
			context: {},
		});
		setVmEvaluator({
			evaluate: () => {
				throw boundaryError;
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionExtensionError);
		expect((caught as ExpressionExtensionError).description).toBe('Extension-specific description');
	});

	it('should convert built-in SyntaxError to ExpressionError', () => {
		setVmEvaluator({
			evaluate: () => {
				throw new SyntaxError('Unexpected token');
			},
		});

		let caught: unknown;
		try {
			evaluate('={{ $json.id }}');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).message).toBe('invalid syntax');
	});
});
