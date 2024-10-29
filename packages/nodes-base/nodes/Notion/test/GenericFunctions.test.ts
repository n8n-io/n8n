import { databasePageUrlExtractionRegexp } from '../shared/constants';
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
	const baseUrl = 'https://www.notion.so/fake-instance';
	const testIds = [
		'4eb10d5001254b7faaa831d72d9445aa', // Taken from Notion
		'fffb95d3060b80309027eb9c99605ec3', // Taken from user comment
		'a6356387779d4df485449a72a408f0d4', // Random v4 UUID
		'f4c1217e48f711ef94540242ac120002', // Random v1 UUID
	];
	describe('extractPageId From URL', () => {
		// RLC does some Regex extraction before extractPageId is called
		const extractIdFromUrl = (url: string): string => {
			const match = url.match(databasePageUrlExtractionRegexp);
			return match ? match[1] : url;
		};

		test('should return the part after "p="', () => {
			for (const testId of testIds) {
				const page = `${baseUrl}?p=${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should return the last part after splitting by "-" when URL contains multiple "-"', () => {
			for (const testId of testIds) {
				const page = `${baseUrl}/some-page-${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should return the last part after splitting by "-" when URL contains one "-"', () => {
			for (const testId of testIds) {
				const page = `${baseUrl}/1-${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should return just the id when there is an instance name', () => {
			for (const testId of testIds) {
				const page = `${baseUrl}/${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should return the id when there is no instance name', () => {
			for (const testId of testIds) {
				const page = `https://www.notion.so/${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});
	});
});
