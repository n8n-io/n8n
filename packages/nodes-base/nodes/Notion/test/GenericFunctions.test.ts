import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { databasePageUrlExtractionRegexp } from '../shared/constants';
import { extractPageId, formatBlocks, getPageId } from '../shared/GenericFunctions';

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
