import type { INode } from '../src/interfaces';
import { nodeNameToToolName } from '../src/tool-helpers';

describe('nodeNameToToolName', () => {
	const getNodeWithName = (name: string): INode => ({
		id: 'test-node',
		name,
		type: 'test',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	});

	it('should replace spaces with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test Node'))).toBe('Test_Node');
	});

	it('should replace dots with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node'))).toBe('Test_Node');
	});

	it('should replace question marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test?Node'))).toBe('Test_Node');
	});

	it('should replace exclamation marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test!Node'))).toBe('Test_Node');
	});

	it('should replace equals signs with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test=Node'))).toBe('Test_Node');
	});

	it('should replace multiple special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node?With!Special=Chars'))).toBe(
			'Test_Node_With_Special_Chars',
		);
	});

	it('should handle names that already have underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test_Node'))).toBe('Test_Node');
	});

	it('should handle names with consecutive special characters', () => {
		expect(nodeNameToToolName(getNodeWithName('Test..!!??==Node'))).toBe('Test_Node');
	});

	it('should replace various special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test#+*()[]{}:;,<>/\\\'"%$Node'))).toBe('Test_Node');
	});

	describe('when passed a string directly', () => {
		it('should replace spaces with underscores', () => {
			expect(nodeNameToToolName('Test Node')).toBe('Test_Node');
		});

		it('should replace dots with underscores', () => {
			expect(nodeNameToToolName('Test.Node')).toBe('Test_Node');
		});

		it('should replace multiple special characters with underscores', () => {
			expect(nodeNameToToolName('Test.Node?With!Special=Chars')).toBe(
				'Test_Node_With_Special_Chars',
			);
		});

		it('should handle consecutive special characters', () => {
			expect(nodeNameToToolName('Test..!!??==Node')).toBe('Test_Node');
		});

		it('should replace various special characters with underscores', () => {
			expect(nodeNameToToolName('Test#+*()[]{}:;,<>/\\\'"%$Node')).toBe('Test_Node');
		});
	});
});
