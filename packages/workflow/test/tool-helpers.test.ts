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

	it('should replace emojis with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test 😀 Node'))).toBe('Test_Node');
	});

	it('should replace multiple emojis with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('🚀 Test 📊 Node 🎉'))).toBe('_Test_Node_');
	});

	it('should handle complex emoji sequences', () => {
		expect(nodeNameToToolName(getNodeWithName('Test 👨‍💻 Node 🔥'))).toBe('Test_Node_');
	});

	describe('truncation to 64 characters', () => {
		it('should not truncate names that are exactly 64 characters', () => {
			const name = 'a'.repeat(64);
			expect(nodeNameToToolName(name)).toBe(name);
			expect(nodeNameToToolName(name)).toHaveLength(64);
		});

		it('should truncate names longer than 64 characters', () => {
			const name = 'a'.repeat(100);
			expect(nodeNameToToolName(name)).toBe('a'.repeat(64));
			expect(nodeNameToToolName(name)).toHaveLength(64);
		});

		it('should truncate the firecrawl-like name from the bug report', () => {
			const name = 'Scrape a URL and get content as markdown or other formats in Firecrawl';
			const result = nodeNameToToolName(name);
			expect(result.length).toBeLessThanOrEqual(64);
		});

		it('should remove trailing underscores after truncation', () => {
			// 63 chars of 'a' + space (becomes underscore at position 64) + more text
			const name = 'a'.repeat(63) + ' more text';
			const result = nodeNameToToolName(name);
			expect(result).toBe('a'.repeat(63));
			expect(result.length).toBeLessThanOrEqual(64);
		});

		it('should remove trailing hyphens after truncation', () => {
			const name = 'a'.repeat(63) + '-more text';
			const result = nodeNameToToolName(name);
			expect(result.length).toBeLessThanOrEqual(64);
			expect(result).not.toMatch(/[-_]$/);
		});
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
