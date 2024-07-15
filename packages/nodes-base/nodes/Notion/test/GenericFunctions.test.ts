import { extractPageId, formatBlocks } from '../shared/GenericFunctions';

describe('Test NotionV2, formatBlocks', () => {
	it('should format to_do block', () => {
		const blocks = [
			{
				type: 'to_do',
				checked: false,
				richText: false,
				textContent: 'Testing',
			},
		];

		const result = formatBlocks(blocks);

		expect(result).toEqual([
			{
				object: 'block',
				type: 'to_do',
				to_do: {
					checked: false,
					text: [
						{
							text: {
								content: 'Testing',
							},
						},
					],
				},
			},
		]);
	});
});

describe('Test Notion', () => {
	describe('extractPageId', () => {
		const baseUrl = 'https://www.notion.so/fake-instance';
		test('should return the part after "p="', () => {
			const page = `${baseUrl}?p=4eb10d5001254b7faaa831d72d9445aa`;
			const result = extractPageId(page);
			expect(result).toBe('4eb10d5001254b7faaa831d72d9445aa');
		});
		test('should return the last part after splitting by "-" when URL contains "-" and "https"', () => {
			const page = `${baseUrl}/some-page-4eb10d5001254b7faaa831d72d9445aa`;
			const result = extractPageId(page);
			expect(result).toBe('4eb10d5001254b7faaa831d72d9445aa');
		});
		test('should return the last part after splitting by "-" when URL contains "-" and "https" and ignore extra url param', () => {
			const page = `${baseUrl}/some-page-4eb10d5001254b7faaa831d72d9445aa?pvs=4`;
			const result = extractPageId(page);
			expect(result).toBe('4eb10d5001254b7faaa831d72d9445aa');
		});
		test('should return just the ID', () => {
			const page = `${baseUrl}/4eb10d5001254b7faaa831d72d9445aa`;
			const result = extractPageId(page);
			expect(result).toBe('4eb10d5001254b7faaa831d72d9445aa');
		});
		test('should return the input as is when no conditions are met', () => {
			const page = `${baseUrl}/some-page`;
			const result = extractPageId(page);
			expect(result).toBe(page);
		});
		test('should return the input as is when input is an empty string', () => {
			const page = '';
			const result = extractPageId(page);
			expect(result).toBe(page);
		});
	});
});
