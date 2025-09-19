/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { mock } from 'jest-mock-extended';
import type {
	AssignmentCollectionValue,
	IBinaryData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { prepareReturnItem } from '../utils';
import type { SetNodeOptions } from '../interfaces';
import { INCLUDE } from '../interfaces';

describe('prepareReturnItem', () => {
	const mockNode = mock<INode>({
		name: 'Set Node',
		typeVersion: 3.4,
	});

	const mockContext = mock<IExecuteFunctions>({
		getNodeParameter: jest.fn(),
		helpers: {
			assertBinaryData: jest.fn(),
		},
	});

	const baseItem: INodeExecutionData = {
		json: { existingField: 'existingValue' },
		binary: {
			existingBinary: {
				data: 'base64data',
				mimeType: 'text/plain',
				fileName: 'existing.txt',
			},
		},
	};

	const baseOptions: SetNodeOptions = {
		dotNotation: true,
		ignoreConversionErrors: false,
		include: INCLUDE.ALL,
		stripBinary: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');
	});

	describe('JSON assignments', () => {
		it('should handle string assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'stringField',
						value: 'test string',
						type: 'string',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				stringField: 'test string',
			});
		});

		it('should handle number assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'numberField',
						value: 42,
						type: 'number',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				numberField: 42,
			});
		});

		it('should handle boolean assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'booleanField',
						value: true,
						type: 'boolean',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				booleanField: true,
			});
		});

		it('should handle array assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'arrayField',
						value: '["item1", "item2"]',
						type: 'array',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toHaveProperty('arrayField');
		});

		it('should handle object assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'objectField',
						value: '{"nested": "value"}',
						type: 'object',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toHaveProperty('objectField');
		});

		it('should handle multiple JSON assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'field1',
						value: 'value1',
						type: 'string',
					},
					{
						id: '2',
						name: 'field2',
						value: 123,
						type: 'number',
					},
					{
						id: '3',
						name: 'field3',
						value: false,
						type: 'boolean',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				field1: 'value1',
				field2: 123,
				field3: false,
			});
		});
	});

	describe('binary assignments', () => {
		it('should handle binary assignments', () => {
			const mockBinaryData: IBinaryData = {
				data: 'newbinarydata',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
			};

			(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'newBinary',
						value: 'binaryPropertyName',
						type: 'binary',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.binary).toEqual({
				existingBinary: {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'existing.txt',
				},
				newBinary: mockBinaryData,
			});
			expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'binaryPropertyName');
		});

		it('should handle multiple binary assignments', () => {
			const mockBinaryData1: IBinaryData = {
				data: 'binary1',
				mimeType: 'image/png',
				fileName: 'image1.png',
			};

			const mockBinaryData2: IBinaryData = {
				data: 'binary2',
				mimeType: 'image/jpeg',
				fileName: 'image2.jpg',
			};

			(mockContext.helpers.assertBinaryData as jest.Mock)
				.mockReturnValueOnce(mockBinaryData1)
				.mockReturnValueOnce(mockBinaryData2);

			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'image1',
						value: 'binaryProp1',
						type: 'binary',
					},
					{
						id: '2',
						name: 'image2',
						value: 'binaryProp2',
						type: 'binary',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.binary).toEqual({
				existingBinary: {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'existing.txt',
				},
				image1: mockBinaryData1,
				image2: mockBinaryData2,
			});
		});

		it('should create binary object when item has no existing binary data', () => {
			const itemWithoutBinary: INodeExecutionData = {
				json: { field: 'value' },
			};

			const mockBinaryData: IBinaryData = {
				data: 'binarydata',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			};

			(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'newBinary',
						value: 'binaryPropertyName',
						type: 'binary',
					},
				],
			};

			const result = prepareReturnItem(
				mockContext,
				value,
				0,
				itemWithoutBinary,
				mockNode,
				baseOptions,
			);

			expect(result.binary).toEqual({
				newBinary: mockBinaryData,
			});
		});

		it('should throw error when binary data is not found', () => {
			(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue('not-binary-data');

			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'invalidBinary',
						value: 'nonExistentBinary',
						type: 'binary',
					},
				],
			};

			expect(() =>
				prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions),
			).toThrow(NodeOperationError);
			expect(() =>
				prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions),
			).toThrow('Could not find binary data specified in field invalidBinary');
		});
	});

	describe('Mixed assignments', () => {
		it('should handle both JSON and binary assignments', () => {
			const mockBinaryData: IBinaryData = {
				data: 'mixedbinary',
				mimeType: 'application/json',
				fileName: 'data.json',
			};

			(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'textField',
						value: 'mixed content',
						type: 'string',
					},
					{
						id: '2',
						name: 'numberField',
						value: 999,
						type: 'number',
					},
					{
						id: '3',
						name: 'binaryField',
						value: 'binaryProp',
						type: 'binary',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				textField: 'mixed content',
				numberField: 999,
			});

			expect(result.binary).toEqual({
				existingBinary: {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'existing.txt',
				},
				binaryField: mockBinaryData,
			});
		});
	});

	describe('Edge cases', () => {
		it('should handle empty assignments array', () => {
			const value: AssignmentCollectionValue = {
				assignments: [],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
			});
			expect(result.binary).toEqual({
				existingBinary: {
					data: 'base64data',
					mimeType: 'text/plain',
					fileName: 'existing.txt',
				},
			});
		});

		it('should handle undefined assignments', () => {
			const value: AssignmentCollectionValue = {
				assignments: undefined as any,
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
			});
		});

		it('should handle null assignments value', () => {
			const result = prepareReturnItem(
				mockContext,
				null as any,
				0,
				baseItem,
				mockNode,
				baseOptions,
			);

			expect(result.json).toEqual({
				existingField: 'existingValue',
			});
		});

		it('should handle assignments with null/undefined values', () => {
			const value: AssignmentCollectionValue = {
				assignments: [
					{
						id: '1',
						name: 'nullField',
						value: null,
						type: 'string',
					},
					{
						id: '2',
						name: 'undefinedField',
						value: undefined,
						type: 'string',
					},
				],
			};

			const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

			expect(result.json).toEqual({
				existingField: 'existingValue',
				nullField: null,
				undefinedField: null,
			});
		});
	});
});
