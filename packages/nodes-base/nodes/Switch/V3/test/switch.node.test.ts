import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeOperationError, ApplicationError } from 'n8n-workflow';

import { SwitchV3 } from '../SwitchV3.node';

describe('SwitchV3 Node', () => {
	let switchNode: SwitchV3;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Switch',
		name: 'n8n-nodes-base.switch',
		group: ['transform'],
		description: 'Route items to different outputs',
	};

	beforeEach(() => {
		switchNode = new SwitchV3(baseDescription);
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
	});

	describe('Version-specific behavior', () => {
		it('should have two numberOutputs parameters with different version conditions', () => {
			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParams = switchNode.description.properties.filter(
				(prop) => prop.name === 'numberOutputs',
			);

			expect(numberOutputsParams).toHaveLength(2);
		});

		it('should have noDataExpression: true for version 3.3+ numberOutputs parameter', () => {
			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParamWithNoExpression = switchNode.description.properties.find(
				(prop) => prop.name === 'numberOutputs' && prop.noDataExpression === true,
			);

			expect(numberOutputsParamWithNoExpression).toBeDefined();
			expect(numberOutputsParamWithNoExpression?.noDataExpression).toBe(true);
			expect(numberOutputsParamWithNoExpression?.displayOptions?.show?.['@version']).toEqual([
				{ _cnd: { gte: 3.3 } },
			]);
		});

		it('should have numberOutputs parameter without noDataExpression for older versions', () => {
			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParamWithoutNoExpression = switchNode.description.properties.find(
				(prop) => prop.name === 'numberOutputs' && !prop.noDataExpression,
			);

			expect(numberOutputsParamWithoutNoExpression).toBeDefined();
			expect(numberOutputsParamWithoutNoExpression?.noDataExpression).toBeUndefined();
			expect(numberOutputsParamWithoutNoExpression?.displayOptions?.show?.['@version']).toEqual([
				{ _cnd: { lt: 3.3 } },
			]);
		});

		it('should include version 3.3 in supported versions', () => {
			const switchNode = new SwitchV3(baseDescription);
			expect(switchNode.description.version).toContain(3.3);
		});
	});

	describe('Expression Mode Execution', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'switch-node',
				name: 'Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.3,
				position: [0, 0],
				parameters: {},
			});
		});

		it('should route items to correct output in expression mode', async () => {
			const inputData = [{ json: { value: 1 } }, { json: { value: 2 } }, { json: { value: 3 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number) => {
					const params: Record<string, any> = {
						mode: 'expression',
						numberOutputs: 3,
						output: itemIndex % 3,
					};
					return params[paramName];
				},
			);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(3);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ value: 1 });
			expect(result[1]).toHaveLength(1);
			expect(result[1][0].json).toEqual({ value: 2 });
			expect(result[2]).toHaveLength(1);
			expect(result[2][0].json).toEqual({ value: 3 });
		});

		it('should handle multiple items routed to same output', async () => {
			const inputData = [{ json: { value: 1 } }, { json: { value: 2 } }, { json: { value: 3 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					mode: 'expression',
					numberOutputs: 2,
					output: 0,
				};
				return params[paramName];
			});

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveLength(3);
			expect(result[1]).toHaveLength(0);
		});

		it('should throw error for invalid output index', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					mode: 'expression',
					numberOutputs: 2,
					output: 5,
				};
				return params[paramName];
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for negative output index', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					mode: 'expression',
					numberOutputs: 2,
					output: -1,
				};
				return params[paramName];
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle empty input data', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);
			mockExecuteFunctions.getNodeParameter.mockReturnValue('expression');

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[]]);
		});
	});

	describe('Rules Mode Execution', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'switch-node',
				name: 'Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.3,
				position: [0, 0],
				parameters: {},
			});
		});

		it('should route items based on matching rules', async () => {
			const inputData = [
				{ json: { status: 'active' } },
				{ json: { status: 'inactive' } },
				{ json: { status: 'pending' } },
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'mode') return 'rules';
				if (paramName === 'rules.values') {
					return [
						{
							conditions: {
								conditions: [
									{
										leftValue: '={{$json.status}}',
										rightValue: 'active',
										operator: { type: 'string', operation: 'equals' },
									},
								],
								combinator: 'and',
							},
						},
						{
							conditions: {
								conditions: [
									{
										leftValue: '={{$json.status}}',
										rightValue: 'inactive',
										operator: { type: 'string', operation: 'equals' },
									},
								],
								combinator: 'and',
							},
						},
					];
				}
				if (paramName === 'options') return {};
				return false;
			});

			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number, defaultValue: any, options?: any) => {
					if (paramName === 'mode') return 'rules';
					if (paramName === 'rules.values') {
						return [
							{ conditions: { conditions: [], combinator: 'and' } },
							{ conditions: { conditions: [], combinator: 'and' } },
						];
					}
					if (paramName === 'options') return {};
					if (paramName.includes('conditions') && options?.extractValue) {
						if (itemIndex === 0) return true; // active matches first rule
						if (itemIndex === 1) return false; // inactive doesn't match first rule
						return false;
					}
					return defaultValue;
				},
			);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ status: 'active' });
			expect(result[1]).toHaveLength(0);
		});

		it('should handle fallback output when no rules match', async () => {
			const inputData = [{ json: { status: 'unknown' } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _itemIndex: number, defaultValue: any, options?: any) => {
					if (paramName === 'mode') return 'rules';
					if (paramName === 'rules.values') {
						return [{ conditions: { conditions: [], combinator: 'and' } }];
					}
					if (paramName === 'options') return { fallbackOutput: 'extra' };
					if (paramName.includes('conditions') && options?.extractValue) {
						return false; // No rule matches
					}
					return defaultValue;
				},
			);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(2); // One rule output + one fallback output
			expect(result[0]).toHaveLength(0); // No matches for rule
			expect(result[1]).toHaveLength(1); // Item goes to fallback
			expect(result[1][0].json).toEqual({ status: 'unknown' });
		});

		it('should handle allMatchingOutputs option', async () => {
			const inputData = [{ json: { value: 10 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _itemIndex: number, defaultValue: any, options?: any) => {
					if (paramName === 'mode') return 'rules';
					if (paramName === 'rules.values') {
						return [
							{ conditions: { conditions: [], combinator: 'and' } },
							{ conditions: { conditions: [], combinator: 'and' } },
						];
					}
					if (paramName === 'options') return { allMatchingOutputs: true };
					if (paramName.includes('conditions') && options?.extractValue) {
						return true; // Both rules match
					}
					return defaultValue;
				},
			);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveLength(1);
			expect(result[1]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ value: 10 });
			expect(result[1][0].json).toEqual({ value: 10 });
		});

		it('should skip items when no rules are defined', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'mode') return 'rules';
				if (paramName === 'rules.values') return [];
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[]]);
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'switch-node',
				name: 'Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.3,
				position: [0, 0],
				parameters: {},
			});
		});

		it('should handle errors with continueOnFail', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'mode') return 'expression';
				if (paramName === 'numberOutputs') return 1;
				if (paramName === 'output') {
					throw new Error('Parameter error');
				}
				return undefined;
			});
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('error', 'Parameter error');
		});

		it('should rethrow NodeOperationError', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
				throw new NodeOperationError(mockExecuteFunctions.getNode(), 'Invalid parameter');
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle ApplicationError with context', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
				const error = new ApplicationError('Application error');
				throw error;
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(ApplicationError);
		});

		it('should wrap generic errors in NodeOperationError', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'mode') return 'expression';
				if (paramName === 'numberOutputs') return 1;
				if (paramName === 'output') {
					throw new Error('Generic error');
				}
				return undefined;
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Load Options', () => {
		it('should load fallback output options with no rules', async () => {
			mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue([]);

			const result =
				await switchNode.methods.loadOptions.getFallbackOutputOptions.call(
					mockLoadOptionsFunctions,
				);

			expect(result).toEqual([
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'None (default)',
					value: 'none',
					description: 'Items will be ignored',
				},
				{
					name: 'Extra Output',
					value: 'extra',
					description: 'Items will be sent to the extra, separate, output',
				},
			]);
		});

		it('should load fallback output options with rules', async () => {
			const rules = [
				{ outputKey: 'Rule 1' },
				{ outputKey: 'Rule 2' },
				{}, // Rule without outputKey
			];

			mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue(rules);

			const result =
				await switchNode.methods.loadOptions.getFallbackOutputOptions.call(
					mockLoadOptionsFunctions,
				);

			expect(result).toEqual([
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'None (default)',
					value: 'none',
					description: 'Items will be ignored',
				},
				{
					name: 'Extra Output',
					value: 'extra',
					description: 'Items will be sent to the extra, separate, output',
				},
				{
					name: 'Output Rule 1',
					value: 0,
					description: 'Items will be sent to the same output as when matched rule 1',
				},
				{
					name: 'Output Rule 2',
					value: 1,
					description: 'Items will be sent to the same output as when matched rule 2',
				},
				{
					name: 'Output 2',
					value: 2,
					description: 'Items will be sent to the same output as when matched rule 3',
				},
			]);
		});

		it('should handle null rules parameter', async () => {
			mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue(null);

			const result =
				await switchNode.methods.loadOptions.getFallbackOutputOptions.call(
					mockLoadOptionsFunctions,
				);

			expect(result).toEqual([
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'None (default)',
					value: 'none',
					description: 'Items will be ignored',
				},
				{
					name: 'Extra Output',
					value: 'extra',
					description: 'Items will be sent to the extra, separate, output',
				},
			]);
		});
	});

	describe('Edge Cases', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'switch-node',
				name: 'Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.3,
				position: [0, 0],
				parameters: {},
			});
		});

		it('should handle items with pairedItem already set', async () => {
			const inputData = [{ json: { value: 1 }, pairedItem: { item: 5 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					mode: 'expression',
					numberOutputs: 1,
					output: 0,
				};
				return params[paramName];
			});

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should handle output index equal to returnData length', async () => {
			const inputData = [{ json: { value: 1 } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					mode: 'expression',
					numberOutputs: 2,
					output: 2, // Equal to returnData length
				};
				return params[paramName];
			});

			await expect(switchNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle fallback output to existing rule output', async () => {
			const inputData = [{ json: { status: 'unknown' } }];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _itemIndex: number, defaultValue: any, options?: any) => {
					if (paramName === 'mode') return 'rules';
					if (paramName === 'rules.values') {
						return [{ conditions: { conditions: [], combinator: 'and' } }];
					}
					if (paramName === 'options') return { fallbackOutput: 0 };
					if (paramName.includes('conditions') && options?.extractValue) {
						return false; // No rule matches
					}
					return defaultValue;
				},
			);

			const result = await switchNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ status: 'unknown' });
		});
	});
});
