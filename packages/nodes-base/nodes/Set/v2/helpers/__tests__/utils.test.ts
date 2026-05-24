/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { mock } from 'jest-mock-extended';
import type {
	AssignmentCollectionValue,
	IBinaryData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError, BINARY_MODE_COMBINED } from 'n8n-workflow';

import type { SetNodeOptions } from '../interfaces';
import { INCLUDE } from '../interfaces';
import { parseJsonParameter, prepareReturnItem } from '../utils';

describe('prepareReturnItem', () => {
	const mockNode = mock<INode>({
		name: 'Set Node',
		typeVersion: 3.4,
	});

	const mockContext = mock<IExecuteFunctions>({
		getNodeParameter: jest.fn(),
		getWorkflowSettings: jest.fn(() => ({})),
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
		(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({});
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

	describe('binary assignments - mode handling', () => {
		describe('non-combined binary mode', () => {
			it('should push binary assignments to binaryValues when binaryMode is not combined', () => {
				const mockBinaryData: IBinaryData = {
					data: 'binarydata',
					mimeType: 'image/png',
					fileName: 'image.png',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({ binaryMode: 'default' });

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'binaryField',
							value: 'binaryProp',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.binary).toHaveProperty('binaryField');
				expect(result.binary?.binaryField).toEqual(mockBinaryData);
			});

			it('should handle binary assignments in separate mode', () => {
				const mockBinaryData: IBinaryData = {
					data: 'separatedata',
					mimeType: 'application/pdf',
					fileName: 'doc.pdf',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({ binaryMode: 'separate' });

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'pdfBinary',
							value: 'pdfProp',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.binary).toHaveProperty('pdfBinary');
				expect(result.binary?.pdfBinary).toEqual(mockBinaryData);
			});
		});

		describe('combined binary mode', () => {
			it('should place binary only in binary when id is missing', () => {
				const mockBinaryData: IBinaryData = {
					data: 'combineddata',
					mimeType: 'text/plain',
					fileName: 'file.txt',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({
					binaryMode: BINARY_MODE_COMBINED,
				});

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'textBinary',
							value: 'binaryProp',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.binary).toHaveProperty('textBinary');
				expect(result.binary?.textBinary).toEqual(mockBinaryData);
				expect(result.json).not.toHaveProperty('textBinary');
			});

			it('should place binary in json when id is present', () => {
				const mockBinaryDataWithId: IBinaryData = {
					data: 'combineddata',
					mimeType: 'image/jpeg',
					fileName: 'photo.jpg',
					id: 'binary-id-123',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryDataWithId);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({
					binaryMode: BINARY_MODE_COMBINED,
				});

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'photoField',
							value: 'binaryProp',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.json).toHaveProperty('photoField');
				expect(result.json.photoField).toEqual(mockBinaryDataWithId);
			});

			it('should handle mixed binary assignments (with and without id)', () => {
				const mockBinaryDataNoId: IBinaryData = {
					data: 'data1',
					mimeType: 'text/plain',
					fileName: 'file1.txt',
				};

				const mockBinaryDataWithId: IBinaryData = {
					data: 'data2',
					mimeType: 'text/plain',
					fileName: 'file2.txt',
					id: 'binary-id-456',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock)
					.mockReturnValueOnce(mockBinaryDataNoId)
					.mockReturnValueOnce(mockBinaryDataWithId);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({
					binaryMode: BINARY_MODE_COMBINED,
				});

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'binaryNoId',
							value: 'binaryProp1',
							type: 'binary',
						},
						{
							id: '2',
							name: 'binaryWithId',
							value: 'binaryProp2',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.binary).toHaveProperty('binaryNoId');
				expect(result.binary?.binaryNoId).toEqual(mockBinaryDataNoId);
				expect(result.json).not.toHaveProperty('binaryNoId');

				expect(result.json).toHaveProperty('binaryWithId');
				expect(result.json.binaryWithId).toEqual(mockBinaryDataWithId);
			});

			it('should treat empty string id as missing id (place only in binary)', () => {
				const mockBinaryDataEmptyId: IBinaryData = {
					id: '',
					data: 'emptyiddata',
					mimeType: 'text/plain',
					fileName: 'file.txt',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryDataEmptyId);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({
					binaryMode: BINARY_MODE_COMBINED,
				});

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'emptyIdBinary',
							value: 'binaryProp',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.binary).toHaveProperty('emptyIdBinary');
				expect(result.binary?.emptyIdBinary).toEqual(mockBinaryDataEmptyId);
				expect(result.json).not.toHaveProperty('emptyIdBinary');
			});

			it('should handle string reference in non-combined mode and resolve via assertBinaryData', () => {
				const mockBinaryData: IBinaryData = {
					data: 'referenceddata',
					mimeType: 'application/json',
					fileName: 'data.json',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({ binaryMode: 'default' });

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'binaryRef',
							value: 'binaryPropertyName',
							type: 'binary',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'binaryPropertyName');

				expect(result.binary).toHaveProperty('binaryRef');
				expect(result.binary?.binaryRef).toEqual(mockBinaryData);
			});
		});

		describe('mixed mode scenarios', () => {
			it('should handle JSON and binary assignments together in non-combined mode', () => {
				const mockBinaryData: IBinaryData = {
					data: 'mixeddata',
					mimeType: 'image/png',
					fileName: 'image.png',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({ binaryMode: 'default' });

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'stringField',
							value: 'text value',
							type: 'string',
						},
						{
							id: '2',
							name: 'binaryField',
							value: 'binaryProp',
							type: 'binary',
						},
						{
							id: '3',
							name: 'numberField',
							value: 42,
							type: 'number',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.json).toHaveProperty('stringField', 'text value');
				expect(result.json).toHaveProperty('numberField', 42);
				expect(result.binary).toHaveProperty('binaryField');
			});

			it('should handle JSON and binary assignments together in combined mode with id', () => {
				const mockBinaryDataWithId: IBinaryData = {
					data: 'combineddata',
					mimeType: 'video/mp4',
					fileName: 'video.mp4',
					id: 'video-id-789',
				};

				(mockContext.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryDataWithId);
				(mockContext.getWorkflowSettings as jest.Mock).mockReturnValue({
					binaryMode: BINARY_MODE_COMBINED,
				});

				const value: AssignmentCollectionValue = {
					assignments: [
						{
							id: '1',
							name: 'title',
							value: 'My Video',
							type: 'string',
						},
						{
							id: '2',
							name: 'videoData',
							value: 'binaryProp',
							type: 'binary',
						},
						{
							id: '3',
							name: 'duration',
							value: 120,
							type: 'number',
						},
					],
				};

				const result = prepareReturnItem(mockContext, value, 0, baseItem, mockNode, baseOptions);

				expect(result.json).toHaveProperty('title', 'My Video');
				expect(result.json).toHaveProperty('duration', 120);
				expect(result.json).toHaveProperty('videoData', mockBinaryDataWithId);
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

describe('parseJsonParameter', () => {
	const mockNode = mock<INode>({
		name: 'Set Node',
		typeVersion: 3.4,
	});

	describe('Valid JSON input', () => {
		it('should parse valid JSON string', () => {
			const result = parseJsonParameter('{"key": "value"}', mockNode, 0);
			expect(result).toEqual({ key: 'value' });
		});

		it('should parse valid JSON object directly', () => {
			const input = { key: 'value' };
			const result = parseJsonParameter(input, mockNode, 0);
			expect(result).toEqual(input);
		});

		it('should parse complex valid JSON', () => {
			const json = '{"nested": {"key": "value"}, "array": [1, 2, 3]}';
			const result = parseJsonParameter(json, mockNode, 0);
			expect(result).toEqual({ nested: { key: 'value' }, array: [1, 2, 3] });
		});
	});

	describe('JSON repair', () => {
		it('should repair JSON string', () => {
			const result = parseJsonParameter('{key: "value"}', mockNode, 0);
			expect(result).toEqual({ key: 'value' });
		});
	});

	describe('Error cases', () => {
		it('should throw error for invalid JSON that cannot be recovered', () => {
			expect(() => parseJsonParameter('{key1: "value",, key2: "value2"}', mockNode, 0)).toThrow(
				"The 'JSON Output' in item 0 contains invalid JSON",
			);
		});
	});
});
