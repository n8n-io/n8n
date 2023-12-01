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
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { capitalize } from '@utils/utilities';

const configuredOutputs = (parameters: INodeParameters) => {
	const mode = parameters.mode as string;

	if (mode === 'expression') {
		return Array.from({ length: parameters.numberOutputs as number }, (_, i) => ({
			type: `${NodeConnectionType.Main}`,
			displayName: i.toString(),
		}));
	} else {
		const rules = ((parameters.rules as IDataObject)?.rules as IDataObject[]) ?? [];
		const ruleOutputs = rules.map((rule, index) => {
			return {
				type: `${NodeConnectionType.Main}`,
				displayName: rule.outputKey || index.toString(),
			};
		});
		if ((parameters.options as IDataObject)?.fallbackOutput === 'last') {
			const renameFallbackOutput = (parameters.options as IDataObject)?.renameFallbackOutput;
			ruleOutputs.push({
				type: `${NodeConnectionType.Main}`,
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
			version: [3],
			defaults: {
				name: 'Switch',
				color: '#506000',
			},
			inputs: ['main'],
			outputs: `={{(${configuredOutputs})($parameter)}}`,
			properties: [
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
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

				// ----------------------------------
				//         mode:expression
				// ----------------------------------
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
					default: '={{ $itemIndex }}',
					description:
						"The output's index to which send an input item, use expressions to calculate what input item should be routed to which output, expression must return a number",
				},

				// ----------------------------------
				//         mode:rules
				// ----------------------------------
				{
					displayName: 'Data Type',
					name: 'dataType',
					type: 'options',
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							name: 'Boolean',
							value: 'boolean',
						},
						{
							name: 'Date & Time',
							value: 'dateTime',
						},
						{
							name: 'Number',
							value: 'number',
						},
						{
							name: 'String',
							value: 'string',
						},
					],
					default: 'string',
					description: 'The type of data to route on',
				},

				// ----------------------------------
				//         dataType:boolean
				// ----------------------------------
				{
					displayName: 'Value or Expression',
					name: 'value1',
					type: 'boolean',
					displayOptions: {
						show: {
							dataType: ['boolean'],
							mode: ['rules'],
						},
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description: 'Use expression to change this value dynamically',
					default: false,
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
					displayOptions: {
						show: {
							dataType: ['boolean'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: 'Boolean',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: 'Operation',
									name: 'operation',
									type: 'options',
									options: [
										{
											name: 'Equal',
											value: 'equal',
										},
										{
											name: 'Not Equal',
											value: 'notEqual',
										},
									],
									default: 'equal',
									description: 'Operation to decide where the the data should be mapped to',
								},
								{
									displayName: 'Compare To',
									name: 'value2',
									type: 'boolean',
									default: false,
									// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
									description:
										'The value to aply operation to, this value is usualy constant and does not change per item',
								},
								{
									displayName: 'Rename Output',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: 'Output Key',
									displayNameIndexed: 'Output {{entryIndex}}',
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

				// ----------------------------------
				//         dataType:dateTime
				// ----------------------------------
				{
					displayName: 'Value or Expression',
					name: 'value1',
					type: 'dateTime',
					displayOptions: {
						show: {
							dataType: ['dateTime'],
							mode: ['rules'],
						},
					},
					default: '',
					description: 'Use expression to change this value dynamically',
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
					displayOptions: {
						show: {
							dataType: ['dateTime'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: 'Dates',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: 'Operation',
									name: 'operation',
									type: 'options',
									options: [
										{
											name: 'Occurred After',
											value: 'after',
										},
										{
											name: 'Occurred Before',
											value: 'before',
										},
									],
									default: 'after',
									description: 'Operation to decide where the the data should be mapped to',
								},
								{
									displayName: 'Compare To',
									name: 'value2',
									type: 'dateTime',
									default: 0,
									description:
										'The value to aply operation to, this value is usualy constant and does not change per item',
								},
								{
									displayName: 'Rename Output',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: 'Output Key',
									displayNameIndexed: 'Output {{entryIndex}}',
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

				// ----------------------------------
				//         dataType:number
				// ----------------------------------
				{
					displayName: 'Value or Expression',
					name: 'value1',
					type: 'number',
					displayOptions: {
						show: {
							dataType: ['number'],
							mode: ['rules'],
						},
					},
					default: 0,
					description: 'Use expression to change this value dynamically',
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
					displayOptions: {
						show: {
							dataType: ['number'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: 'Numbers',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: 'Operation',
									name: 'operation',
									type: 'options',
									// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
									options: [
										{
											name: 'Smaller',
											value: 'smaller',
										},
										{
											name: 'Smaller Equal',
											value: 'smallerEqual',
										},
										{
											name: 'Equal',
											value: 'equal',
										},
										{
											name: 'Not Equal',
											value: 'notEqual',
										},
										{
											name: 'Larger',
											value: 'larger',
										},
										{
											name: 'Larger Equal',
											value: 'largerEqual',
										},
									],
									default: 'smaller',
									description: 'Operation to decide where the the data should be mapped to',
								},
								{
									displayName: 'Compare To',
									name: 'value2',
									type: 'number',
									default: 0,
									description:
										'The value to aply operation to, this value is usualy constant and does not change per item',
								},
								{
									displayName: 'Rename Output',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: 'Output Key',
									displayNameIndexed: 'Output {{entryIndex}}',
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

				// ----------------------------------
				//         dataType:string
				// ----------------------------------
				{
					displayName: 'Value or Expression',
					name: 'value1',
					type: 'string',
					displayOptions: {
						show: {
							dataType: ['string'],
							mode: ['rules'],
						},
					},
					default: '',
					description: 'Use expression to change this value dynamically',
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
					displayOptions: {
						show: {
							dataType: ['string'],
							mode: ['rules'],
						},
					},
					default: {},
					options: [
						{
							name: 'rules',
							displayName: 'Strings',
							values: [
								// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
								{
									displayName: 'Operation',
									name: 'operation',
									type: 'options',
									// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
									options: [
										{
											name: 'Contains',
											value: 'contains',
										},
										{
											name: 'Not Contains',
											value: 'notContains',
										},
										{
											name: 'Ends With',
											value: 'endsWith',
										},
										{
											name: 'Not Ends With',
											value: 'notEndsWith',
										},
										{
											name: 'Equal',
											value: 'equal',
										},
										{
											name: 'Not Equal',
											value: 'notEqual',
										},
										{
											name: 'Regex Match',
											value: 'regex',
										},
										{
											name: 'Regex Not Match',
											value: 'notRegex',
										},
										{
											name: 'Starts With',
											value: 'startsWith',
										},
										{
											name: 'Not Starts With',
											value: 'notStartsWith',
										},
									],
									default: 'equal',
									description: 'Operation to decide where the the data should be mapped to',
								},
								{
									displayName: 'Compare To',
									name: 'value2',
									type: 'string',
									displayOptions: {
										hide: {
											operation: ['regex', 'notRegex'],
										},
									},
									default: '',
									description:
										'The value to aply operation to, this value is usualy constant and does not change per item',
								},
								{
									displayName: 'Regex',
									name: 'value2',
									type: 'string',
									displayOptions: {
										show: {
											operation: ['regex', 'notRegex'],
										},
									},
									default: '',
									placeholder: '/text/i',
									description: 'The regex which has to match',
								},
								{
									displayName: 'Rename Output',
									name: 'renameOutput',
									type: 'boolean',
									default: false,
								},
								{
									displayName: 'Output Key',
									displayNameIndexed: 'Output {{entryIndex}}',
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
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					displayOptions: {
						show: {
							mode: ['rules'],
						},
					},
					options: [
						{
							displayName: 'Case Sensitive',
							name: 'caseSensitive',
							type: 'boolean',
							default: true,
							description: 'Whether to compare case sensitive or not',
							displayOptions: {
								show: {
									'/dataType': ['string'],
								},
							},
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
							displayName: 'Fallback Output',
							name: 'fallbackOutput',
							type: 'options',
							typeOptions: {
								loadOptionsDependsOn: ['rules.rules', '/rules', '/rules.rules'],
								loadOptionsMethod: 'getFallbackOutputOptions',
							},
							default: 'none',
							// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
							description:
								'If no rule matches the item will be sent to this output, by default they will be ignored',
						},
						{
							displayName: 'Rename Fallback Output',
							name: 'renameFallbackOutput',
							type: 'string',
							placeholder: 'e.g. Default',
							default: '',
							displayOptions: {
								show: {
									fallbackOutput: ['last'],
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
				const rules = (this.getCurrentNodeParameter('rules.rules') as INodeParameters[]) ?? [];

				const outputOptions: INodePropertyOptions[] = [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'None (default)',
						value: 'none',
						description: 'Items will be ignored',
					},
					{
						name: 'Last',
						value: 'last',
						description: 'Items will be sent to the last, separate, output',
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

		let compareOperationResult: boolean;
		let item: INodeExecutionData;
		let mode: string;
		let outputIndex: number;
		let ruleData: INodeParameters;

		// The compare operations
		const compareOperationFunctions: {
			[key: string]: (value1: NodeParameterValue, value2: NodeParameterValue) => boolean;
		} = {
			after: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) > (value2 || 0),
			before: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) < (value2 || 0),
			contains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || '').toString().includes((value2 || '').toString()),
			notContains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 || '').toString().includes((value2 || '').toString()),
			endsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 as string).endsWith(value2 as string),
			notEndsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 as string).endsWith(value2 as string),
			equal: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 === value2,
			notEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 !== value2,
			larger: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) > (value2 || 0),
			largerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) >= (value2 || 0),
			smaller: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) < (value2 || 0),
			smallerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 || 0) <= (value2 || 0),
			startsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				(value1 as string).startsWith(value2 as string),
			notStartsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
				!(value1 as string).startsWith(value2 as string),
			regex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
				const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

				let regex: RegExp;
				if (!regexMatch) {
					regex = new RegExp((value2 || '').toString());
				} else if (regexMatch.length === 1) {
					regex = new RegExp(regexMatch[1]);
				} else {
					regex = new RegExp(regexMatch[1], regexMatch[2]);
				}

				return !!(value1 || '').toString().match(regex);
			},
			notRegex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
				const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

				let regex: RegExp;
				if (!regexMatch) {
					regex = new RegExp((value2 || '').toString());
				} else if (regexMatch.length === 1) {
					regex = new RegExp(regexMatch[1]);
				} else {
					regex = new RegExp(regexMatch[1], regexMatch[2]);
				}

				return !(value1 || '').toString().match(regex);
			},
		};

		// Converts the input data of a dateTime into a number for easy compare
		const convertDateTime = (value: NodeParameterValue): number => {
			let returnValue: number | undefined = undefined;
			if (typeof value === 'string') {
				returnValue = new Date(value).getTime();
			} else if (typeof value === 'number') {
				returnValue = value;
			}
			if ((value as unknown as object) instanceof Date) {
				returnValue = (value as unknown as Date).getTime();
			}

			if (returnValue === undefined || isNaN(returnValue)) {
				throw new NodeOperationError(
					this.getNode(),
					`The value "${value}" is not a valid DateTime.`,
				);
			}

			return returnValue;
		};

		const checkIndexRange = (returnDataLength: number, index: number, itemIndex = 0) => {
			if (Number(index) === returnDataLength) {
				throw new NodeOperationError(this.getNode(), `The ouput ${index} is not allowed. `, {
					itemIndex,
					description: `Output indexes are zero based, if you want to use the last output use ${
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

		// Iterate over all items to check to which output they should be routed to
		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];
				const rules = this.getNodeParameter('rules.rules', itemIndex, []) as INodeParameters[];
				mode = this.getNodeParameter('mode', itemIndex) as string;

				if (mode === 'expression') {
					const numberOutputs = this.getNodeParameter('numberOutputs', itemIndex) as number;
					if (itemIndex === 0) {
						returnData = new Array(numberOutputs).fill(0).map(() => []);
					}
					// One expression decides how to route item
					outputIndex = this.getNodeParameter('output', itemIndex) as number;
					checkIndexRange(returnData.length, outputIndex, itemIndex);

					returnData[outputIndex].push(item);
				} else if (mode === 'rules') {
					// Rules decide how to route item
					const options = this.getNodeParameter('options', itemIndex, {});
					const fallbackOutput = options.fallbackOutput;

					if (itemIndex === 0) {
						returnData = new Array(rules.length).fill(0).map(() => []);
						if (fallbackOutput === 'last') {
							returnData.push([]);
						}
					}
					const dataType = this.getNodeParameter('dataType', 0) as string;

					let value1 = this.getNodeParameter('value1', itemIndex) as NodeParameterValue;
					if (dataType === 'dateTime') {
						value1 = convertDateTime(value1);
					}

					if (dataType === 'string' && options.caseSensitive === false) {
						value1 = (value1 as string).toLowerCase();
					}

					let matchFound = false;
					for (ruleData of rules) {
						// Check if the values passes

						let value2 = ruleData.value2 as NodeParameterValue;
						if (dataType === 'dateTime') {
							value2 = convertDateTime(value2);
						}

						if (dataType === 'string' && options.caseSensitive === false) {
							value2 = (value2 as string).toLowerCase();
						}

						compareOperationResult = compareOperationFunctions[ruleData.operation as string](
							value1,
							value2,
						);

						if (compareOperationResult) {
							matchFound = true;
							// If rule matches add it to the correct output and continue with next item
							checkIndexRange(returnData.length, ruleData.output as number, itemIndex);

							const ruleIndex = rules.indexOf(ruleData);
							returnData[ruleIndex].push(item);

							if (!options.allMatchingOutputs) {
								continue itemLoop;
							}
						}
					}

					if (fallbackOutput !== 'none' && !matchFound) {
						if (fallbackOutput === 'last') {
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
				throw error;
			}
		}

		return returnData;
	}
}
