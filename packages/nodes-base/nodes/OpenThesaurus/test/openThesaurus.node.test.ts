import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OpenThesaurus } from '../OpenThesaurus.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions');

describe('OpenThesaurus Node', () => {
	let openThesaurusNode: OpenThesaurus;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	const mockApiRequest = jest.spyOn(GenericFunctions, 'openThesaurusApiRequest');

	beforeEach(() => {
		openThesaurusNode = new OpenThesaurus();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct properties', () => {
			expect(openThesaurusNode.description.displayName).toBe('OpenThesaurus');
			expect(openThesaurusNode.description.name).toBe('openThesaurus');
			expect(openThesaurusNode.description.version).toBe(1);
		});

		it('should have getSynonyms operation', () => {
			const operationParam = openThesaurusNode.description.properties.find(
				(prop) => prop.name === 'operation',
			);
			expect(operationParam).toBeDefined();
			expect(operationParam?.options).toContainEqual(
				expect.objectContaining({ value: 'getSynonyms' }),
			);
		});
	});

	describe('getSynonyms Operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _itemIndex: number) => {
					const params: Record<string, unknown> = {
						operation: 'getSynonyms',
						text: 'Haus',
						options: {},
					};
					return params[paramName];
				},
			);
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(
				(data) => data as any,
			);
			mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(
				(data) => (Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }]) as any,
			);
		});

		it('should return synonyms for a German word', async () => {
			const mockResponse = {
				synsets: [
					{
						id: 1,
						terms: [{ term: 'Haus' }, { term: 'Gebäude' }, { term: 'Bauwerk' }],
					},
				],
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Haus' }),
			);
			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
		});

		it('should handle empty synsets response', async () => {
			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(0);
		});

		it('should process multiple input items', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number) => {
					const texts = ['Haus', 'Auto'];
					const params: Record<string, unknown> = {
						operation: 'getSynonyms',
						text: texts[itemIndex] || 'Haus',
						options: {},
					};
					return params[paramName];
				},
			);

			const mockResponse = {
				synsets: [{ id: 1, terms: [{ term: 'Synonym' }] }],
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
		});
	});

	describe('Options', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(
				(data) => data as any,
			);
			mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(
				(data) => (Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }]) as any,
			);
		});

		it('should pass baseform option to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Häuser',
					options: { baseform: true },
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Häuser', baseform: true }),
			);
		});

		it('should pass similar option to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Haus',
					options: { similar: true },
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Haus', similar: true }),
			);
		});

		it('should pass startswith option to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Hau',
					options: { startswith: true },
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Hau', startswith: true }),
			);
		});

		it('should pass substring options to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'aus',
					options: {
						substring: true,
						substringFromResults: 5,
						substringMaxResults: 20,
					},
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({
					q: 'aus',
					substring: true,
					substringFromResults: 5,
					substringMaxResults: 20,
				}),
			);
		});

		it('should pass subsynsets option to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Haus',
					options: { subsynsets: true },
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Haus', subsynsets: true }),
			);
		});

		it('should pass supersynsets option to API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Haus',
					options: { supersynsets: true },
				};
				return params[paramName];
			});

			const mockResponse = { synsets: [] };
			mockApiRequest.mockResolvedValue(mockResponse);

			await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/synonyme/search',
				{},
				expect.objectContaining({ q: 'Haus', supersynsets: true }),
			);
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'getSynonyms',
					text: 'Haus',
					options: {},
				};
				return params[paramName];
			});
			mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(
				(data) => data as any,
			);
			mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(
				(data) => (Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }]) as any,
			);
		});

		it('should handle error with continueOnFail enabled', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockApiRequest.mockRejectedValue(new Error('API Error'));

			const result = await openThesaurusNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('error', 'API Error');
		});

		it('should throw error when continueOnFail is disabled', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockApiRequest.mockRejectedValue(new Error('API Error'));

			await expect(openThesaurusNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'API Error',
			);
		});
	});
});
