import { test, expect } from '../../../fixtures/eval-base';
import { LANGSMITH_RUN_ID_ANNOTATION } from '../../../fixtures/langsmith';

const TRACING_ON = process.env.LANGSMITH_TRACING === 'true';

test('traced fixture forwards the wrapped function return value', async ({ traced }) => {
	const result = await traced('smoke-success', () => Promise.resolve('ok'));
	expect(result).toBe('ok');
});

test('traced fixture propagates thrown errors', async ({ traced }) => {
	await expect(
		traced('smoke-failure', () => Promise.reject(new Error('intentional smoke failure'))),
	).rejects.toThrow('intentional smoke failure');
});

test('traced fixture emits one run-id annotation per call', async ({ traced }, testInfo) => {
	test.skip(!TRACING_ON, 'LANGSMITH_TRACING not enabled');
	await traced('multi-1', () => Promise.resolve('one'));
	await traced('multi-2', () => Promise.resolve('two'));
	await traced('multi-3', () => Promise.resolve('three'));
	const runIds = testInfo.annotations
		.filter((a) => a.type === LANGSMITH_RUN_ID_ANNOTATION)
		.map((a) => a.description);
	expect(runIds).toHaveLength(3);
});
