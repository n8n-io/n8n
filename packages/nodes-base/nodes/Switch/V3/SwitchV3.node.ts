import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { capitalize } from '@utils/utilities';

import { ENABLE_LESS_STRICT_TYPE_VALIDATION } from '../../../utils/constants';
import { looseTypeValidationProperty } from '../../../utils/descriptions';
import { getTypeValidationParameter, getTypeValidationStrictness } from '../../If/V2/utils';

const configuredOutputs = (parameters: INodeParameters) => {
	const mode = parameters.mode as string;

	if (mode === 'expression') {
		return Array.from({ length: parameters.numberOutputs as number }, (_, i) => ({
			type: 'main',
			displayName: i.toString(),
		}));
	} else {
		const rules = ((parameters.rules as IDataObject)?.values as IDataObject[]) ?? [];
		const ruleOutputs = rules.map((rule, index) => {
			return {
				type: 'main',
				displayName: rule.outputKey || index.toString(),
			};
		});
		if ((parameters.options as IDataObject)?.fallbackOutput === 'extra') {
			const renameFallbackOutput = (parameters.options as IDataObject)?.renameFallbackOutput;
			ruleOutputs.push({
				type: 'main',
				displayName: renameFallbackOutput || 'Fallback',
			});
		}
		return ruleOutputs;
	}
};

export class SwitchV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			subtitle: `=mode: {{(${capitalize})($parameter["mode"])}}`,
			version: [3, 3.1, 3.2],
			defaults: {
				name: 'Switch',
				color: '#506000',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: `={{(${configuredOutputs})($parameter)}}`,
			properties: [
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Rules',
							value: 'rules',
							description: 'Build a matching rule for each output',
						},
						{
							name: 'Expression',
							value: 'expression',
							description: 'Write an expression to return the output index',
						},
					],
					default: 'rules',
					description: 'How data should be routed',
				},
				{
					displayName: 'Number of Outputs',
					name: 'numberOutputs',
					type: 'number',
					displayOptions: {
						show: {
							mode: ['expression'],
						},
					},
					default: 4,
					description: 'How many outputs to create',
				},
				{
					displayName: 'Output Index',
					name: 'output',
					type: 'number',
					validateType: 'number',
					hint: 'The index to route the item to, starts at 0',
					displayOptions: {
						show: {
							mode: ['expression'],
						},
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-number
					default: '={{}}',
					description:
						'The output index to send the input item to. Use an expression to calculate which input item should be routed to which output. The expression must return a number.',
				},
				{
					displayName: 'Routing Rules',
					name: 'rules',
					placeholder: 'Add Routing Rule',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					default: {
						values: [
							{
								conditions: {
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
									},
									conditions: [
										{
											leftValue: '',
											rightValue: '',
											operator: {
												type: 'string',
												operation: 'equals',
											},
										},
									],
									combinator: 'and',
								},
							},
						],
					},
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							name: 'values',
							displayName: 'Values',
							values: [
								{
									displayName: 'Conditions',
									name: 'conditions',
									placeholder: 'Add Condition',
									type: 'filter',
									default: {},
									typeOptions: {
										multipleValues: false,
										filter: {
											caseSensitive: '={{!$parameter.options.ignoreCase}}',
											typeValidation: getTypeValidationStrictness(3.1),
											version: '={{ $nodeVersion >= 3.2 ? 2 : 1 }}',
										},
									},
								},
								{
									displayName: 'Rename Output',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: 'Output Name',
									name: 'outputKey',
									type: 'string',
									default: '',
									description: 'The label of output to which to send data to if rule matches',
									displayOptions: {
										show: {
											renameOutput: [true],
										},
									},
								},
							],
						},
					],
				},
				{
					...looseTypeValidationProperty,
					default: false,
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 3.1 } }],
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add option',
					default: {},
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
							displayName: 'Fallback Output',
							name: 'fallbackOutput',
							type: 'options',
							typeOptions: {
								loadOptionsDependsOn: ['rules.values', '/rules', '/rules.values'],
								loadOptionsMethod: 'getFallbackOutputOptions',
							},
							default: 'none',
							// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
							description:
								'If no rule matches the item will be sent to this output, by default they will be ignored',
						},
						{
							displayName: 'Ignore Case',
							description: 'Whether to ignore letter case when evaluating conditions',
							name: 'ignoreCase',
							type: 'boolean',
							default: true,
						},
						{
							...looseTypeValidationProperty,
							displayOptions: {
								show: {
									'@version': [{ _cnd: { lt: 3.1 } }],
								},
							},
						},
						{
							displayName: 'Rename Fallback Output',
							name: 'renameFallbackOutput',
							type: 'string',
							placeholder: 'e.g. Fallback',
							default: '',
							displayOptions: {
								show: {
									fallbackOutput: ['extra'],
								},
							},
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
							displayName: 'Send data to all matching outputs',
							name: 'allMatchingOutputs',
							type: 'boolean',
							default: false,
							description:
								'Whether to send data to all outputs meeting conditions (and not just the first one)',
						},
					],
				},
			],
		};
	}

	methods = {
		loadOptions: {
			async getFallbackOutputOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rules = (this.getCurrentNodeParameter('rules.values') as INodeParameters[]) ?? [];

				const outputOptions: INodePropertyOptions[] = [
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
				];

				for (const [index, rule] of rules.entries()) {
					outputOptions.push({
						name: `Output ${rule.outputKey || index}`,
						value: index,
						description: `Items will be sent to the same output as when matched rule ${index + 1}`,
					});
				}

				return outputOptions;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];

		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as string;

		const checkIndexRange = (returnDataLength: number, index: number, itemIndex = 0) => {
			if (Number(index) === returnDataLength) {
				throw new NodeOperationError(this.getNode(), `The ouput ${index} is not allowed. `, {
					itemIndex,
					description: `Output indexes are zero based, if you want to use the extra output use ${
						index - 1
					}`,
				});
			}
			if (index < 0 || index > returnDataLength) {
				throw new NodeOperationError(this.getNode(), `The ouput ${index} is not allowed`, {
					itemIndex,
					description: `It has to be between 0 and ${returnDataLength - 1}`,
				});
			}
		};

		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];

				item.pairedItem = { item: itemIndex };

				if (mode === 'expression') {
					const numberOutputs = this.getNodeParameter('numberOutputs', itemIndex) as number;
					if (itemIndex === 0) {
						returnData = new Array(numberOutputs).fill(0).map(() => []);
					}
					const outputIndex = this.getNodeParameter('output', itemIndex) as number;
					checkIndexRange(returnData.length, outputIndex, itemIndex);

					returnData[outputIndex].push(item);
				} else if (mode === 'rules') {
					const rules = this.getNodeParameter('rules.values', itemIndex, []) as INodeParameters[];
					if (!rules.length) continue;
					const options = this.getNodeParameter('options', itemIndex, {});
					const fallbackOutput = options.fallbackOutput;

					if (itemIndex === 0) {
						returnData = new Array(rules.length).fill(0).map(() => []);

						if (fallbackOutput === 'extra') {
							returnData.push([]);
						}
					}

					let matchFound = false;
					for (const [ruleIndex, rule] of rules.entries()) {
						let conditionPass;

						try {
							conditionPass = this.getNodeParameter(
								`rules.values[${ruleIndex}].conditions`,
								itemIndex,
								false,
								{
									extractValue: true,
								},
							) as boolean;
						} catch (error) {
							if (
								!getTypeValidationParameter(3.1)(
									this,
									itemIndex,
									options.looseTypeValidation as boolean,
								) &&
								!error.description
							) {
								error.description = ENABLE_LESS_STRICT_TYPE_VALIDATION;
							}
							set(error, 'context.itemIndex', itemIndex);
							set(error, 'node', this.getNode());
							throw error;
						}

						if (conditionPass) {
							matchFound = true;
							checkIndexRange(returnData.length, rule.output as number, itemIndex);
							returnData[ruleIndex].push(item);

							if (!options.allMatchingOutputs) {
								continue itemLoop;
							}
						}
					}

					if (fallbackOutput !== undefined && fallbackOutput !== 'none' && !matchFound) {
						if (fallbackOutput === 'extra') {
							returnData[returnData.length - 1].push(item);
							continue;
						}
						checkIndexRange(returnData.length, fallbackOutput as number, itemIndex);
						returnData[fallbackOutput as number].push(item);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({ json: { error: error.message } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}

				if (error instanceof ApplicationError) {
					set(error, 'context.itemIndex', itemIndex);
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error, {
					itemIndex,
				});
			}
		}

		if (!returnData.length) return [[]];

		return returnData;
	}
}
