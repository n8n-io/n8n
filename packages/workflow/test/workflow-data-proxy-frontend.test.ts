import { ExpressionError } from '../src/errors/expression.error';
import { createMergeAppendProxy } from './fixtures/merge-append-proxy';

vi.mock('../src/runtime-environment', () => ({ IS_FRONTEND: true }));

describe('WorkflowDataProxy in the editor → pairedItem with no path to the referenced node', () => {
	test.each([
		{ itemIndex: 0, otherBranch: 'Right' },
		{ itemIndex: 1, otherBranch: 'Left' },
	])('throws the not-on-branch expression error for $otherBranch', ({ itemIndex, otherBranch }) => {
		const { proxy } = createMergeAppendProxy(itemIndex);

		let error: unknown;
		try {
			proxy.$(otherBranch).item;
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(ExpressionError);
		expect((error as ExpressionError).context).toMatchObject({
			type: 'paired_item_not_on_branch',
			nodeCause: otherBranch,
		});
	});

	test('resolves a node on the same branch', () => {
		const { proxy } = createMergeAppendProxy(1);

		expect(proxy.$('Right').item.json).toEqual({ value: 'right' });
	});
});
