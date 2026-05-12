import type { WorkflowExecuteMode } from '../src/interfaces';
import { isInteractiveExecution } from '../src/execution-modes';

describe('isInteractiveExecution', () => {
	it.each<[WorkflowExecuteMode, boolean]>([
		['manual', true],
		['single-node', true],
		['trigger', false],
		['webhook', false],
		['cli', false],
		['retry', false],
		['integrated', false],
		['internal', false],
		['error', false],
		['evaluation', false],
		['chat', false],
		['agent', false],
	])('returns %s for mode %s', (mode, expected) => {
		expect(isInteractiveExecution(mode)).toBe(expected);
	});
});
