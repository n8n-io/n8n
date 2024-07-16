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
		const testId = '4eb10d5001254b7faaa831d72d9445aa';
		const extractPattern =
			'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9-]{1,}-)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})';

		// RLC does some Regex extraction before extractPageId is called
		const extractIdFromUrl = (url: string): string => {
			const match = url.match(extractPattern);
			return match ? match[1] : url;
		};

		test('should return the part after "p="', () => {
			const page = `${baseUrl}?p=${testId}`;
			const result = extractPageId(extractIdFromUrl(page));
			expect(result).toBe(testId);
		});

		test('should return the last part after splitting by "-" when URL contains "-" and "https"', () => {
			const page = `${baseUrl}/some-page-${testId}`;
			const result = extractPageId(extractIdFromUrl(page));
			expect(result).toBe(testId);
		});

		test('should return the last part after splitting by "-" when URL contains "-"', () => {
			const page = `${baseUrl}/1-${testId}`;
			const result = extractPageId(extractIdFromUrl(page));
			expect(result).toBe(testId);
		});

		test('should return just the ID', () => {
			const page = `${baseUrl}/${testId}`;
			const result = extractPageId(extractIdFromUrl(page));
			expect(result).toBe(testId);
		});
	});
});
