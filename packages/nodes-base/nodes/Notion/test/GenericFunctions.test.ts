import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { databasePageUrlExtractionRegexp } from '../shared/constants';
import {
	extractPageId,
	formatBlocks,
	getPageId,
	mapFilters,
	notionApiRequest,
} from '../shared/GenericFunctions';

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

		test('should return the id when page slug contains underscores', () => {
			for (const testId of testIds) {
				const page = `https://www.notion.so/url_with-underscore-${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});
	});
});

describe('Test NotionV2, mapFilters', () => {
	const timezone = 'America/New_York';

	describe('formula filters', () => {
		it('should map text formula filter with "contains" to use "string" sub-type', () => {
			const filters = [
				{
					key: 'My Formula|formula',
					type: 'formula',
					returnType: 'text',
					condition: 'contains',
					textValue: 'search term',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'My Formula',
				formula: { string: { contains: 'search term' } },
			});
		});

		it('should map text formula filter with "equals" to use "string" sub-type', () => {
			const filters = [
				{
					key: 'Title Formula|formula',
					type: 'formula',
					returnType: 'text',
					condition: 'equals',
					textValue: 'exact match',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Title Formula',
				formula: { string: { equals: 'exact match' } },
			});
		});

		it('should map number formula filter preserving "number" sub-type', () => {
			const filters = [
				{
					key: 'Score|formula',
					type: 'formula',
					returnType: 'number',
					condition: 'greater_than',
					numberValue: 50,
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Score',
				formula: { number: { greater_than: 50 } },
			});
		});

		it('should map checkbox formula filter preserving "checkbox" sub-type', () => {
			const filters = [
				{
					key: 'Is Active|formula',
					type: 'formula',
					returnType: 'checkbox',
					condition: 'equals',
					checkboxValue: true,
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Is Active',
				formula: { checkbox: { equals: true } },
			});
		});

		it('should map date formula filter preserving "date" sub-type', () => {
			const filters = [
				{
					key: 'Due Date|formula',
					type: 'formula',
					returnType: 'date',
					condition: 'after',
					dateValue: '2026-01-01',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Due Date',
				formula: { date: { after: '2026-01-01' } },
			});
		});

		it('should map text formula "is_empty" with formula wrapper and "string" sub-type', () => {
			const filters = [
				{
					key: 'Notes Formula|formula',
					type: 'formula',
					returnType: 'text',
					condition: 'is_empty',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Notes Formula',
				formula: { string: { is_empty: true } },
			});
		});

		it('should map text formula "is_not_empty" with formula wrapper and "string" sub-type', () => {
			const filters = [
				{
					key: 'Notes Formula|formula',
					type: 'formula',
					returnType: 'text',
					condition: 'is_not_empty',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Notes Formula',
				formula: { string: { is_not_empty: true } },
			});
		});

		it('should map number formula "is_empty" with formula wrapper', () => {
			const filters = [
				{
					key: 'Count|formula',
					type: 'formula',
					returnType: 'number',
					condition: 'is_empty',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Count',
				formula: { number: { is_empty: true } },
			});
		});

		it('should map checkbox formula "is_not_empty" with formula wrapper', () => {
			const filters = [
				{
					key: 'Flag|formula',
					type: 'formula',
					returnType: 'checkbox',
					condition: 'is_not_empty',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Flag',
				formula: { checkbox: { is_not_empty: true } },
			});
		});
	});

	describe('non-formula filters', () => {
		it('should map rich_text filter', () => {
			const filters = [
				{
					key: 'Description|rich_text',
					type: 'rich_text',
					condition: 'contains',
					richTextValue: 'hello',
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Description',
				text: { contains: 'hello' },
			});
		});

		it('should map number filter', () => {
			const filters = [
				{
					key: 'Amount|number',
					type: 'number',
					condition: 'equals',
					numberValue: 42,
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Amount',
				number: { equals: 42 },
			});
		});

		it('should map checkbox filter', () => {
			const filters = [
				{
					key: 'Done|checkbox',
					type: 'checkbox',
					condition: 'equals',
					checkboxValue: true,
				},
			];

			const result = mapFilters(filters, timezone);

			expect(result).toEqual({
				property: 'Done',
				checkbox: { equals: true },
			});
		});
	});
});

describe('Test Notion, getPageId', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	const id = '3ab5bc794647496dac48feca926813fd';

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return page ID directly when mode is id', () => {
		const page = {
			mode: 'id',
			value: id,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pageId', 0, {});
	});

	it('should extract page ID from URL with p parameter', () => {
		const page = {
			mode: 'url',
			value: `https://www.notion.so/xxxxx?v=xxxxx&p=${id}&pm=s`,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
	});

	it('should extract page ID from URL using regex', () => {
		const page = {
			mode: 'url',
			value: `https://www.notion.so/page-name-${id}`,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
	});

	it('should throw error when page ID cannot be extracted', () => {
		const page = {
			mode: 'url',
			value: 'https://www.notion.so/invalid-url',
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: https://www.notion.so/invalid-url',
		);
	});

	it('should throw error when page value is empty', () => {
		const page = {
			mode: 'url',
			value: '',
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: ',
		);
	});

	it('should throw error when page value is undefined', () => {
		const page = {
			mode: 'url',
			value: undefined,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: undefined',
		);
	});

	it('should throw error when page value is not a string', () => {
		const page = {
			mode: 'url',
			value: 123 as any,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: 123',
		);
	});
});

describe('Test Notion, notionApiRequest', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue({}),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should use notionApi credential when authentication is apiKey', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('apiKey');

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({ method: 'GET', uri: 'https://api.notion.com/v1/users' }),
		);
	});

	it('should use notionOAuth2Api credential when authentication is oAuth2', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionOAuth2Api',
			expect.objectContaining({ method: 'GET', uri: 'https://api.notion.com/v1/users' }),
		);
	});

	it('should default to notionApi credential when authentication parameter is not set', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({ method: 'GET' }),
		);
	});
});
