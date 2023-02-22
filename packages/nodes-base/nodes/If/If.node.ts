import moment from 'moment';
import type { IExecuteFunctions } from 'n8n-core';
import type {
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class If implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IF',
		name: 'if',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'Splits a stream based on comparisons',
		defaults: {
			name: 'IF',
			color: '#408000',
		},
		inputs: ['main'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The type of values to compare',
				default: {},
				options: [
					{
						name: 'boolean',
						displayName: 'Boolean',
						values: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'boolean',
								default: false,
								// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
								description: 'The value to compare with the second one',
							},
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
								displayName: 'Value 2',
								name: 'value2',
								type: 'boolean',
								default: false,
								// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
								description: 'The value to compare with the first one',
							},
						],
					},
					{
						name: 'dateTime',
						displayName: 'Date & Time',
						values: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'dateTime',
								default: '',
								description: 'The value to compare with the second one',
							},
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
								displayName: 'Value 2',
								name: 'value2',
								type: 'dateTime',
								default: '',
								description: 'The value to compare with the first one',
							},
						],
					},
					{
						name: 'number',
						displayName: 'Number',
						values: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'number',
								default: 0,
								description: 'The value to compare with the second one',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: 'Smaller',
										value: 'smaller',
									},
									{
										name: 'Smaller or Equal',
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
										name: 'Larger or Equal',
										value: 'largerEqual',
									},
									{
										name: 'Is Empty',
										value: 'isEmpty',
									},
									{
										name: 'Is Not Empty',
										value: 'isNotEmpty',
									},
								],
								default: 'smaller',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'number',
								displayOptions: {
									hide: {
										operation: ['isEmpty', 'isNotEmpty'],
									},
								},
								default: 0,
								description: 'The value to compare with the first one',
							},
						],
					},
					{
						name: 'string',
						displayName: 'String',
						values: [
							{
								displayName: 'Value 1',
								name: 'value1',
								type: 'string',
								default: '',
								description: 'The value to compare with the second one',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
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
									{
										name: 'Is Empty',
										value: 'isEmpty',
									},
									{
										name: 'Is Not Empty',
										value: 'isNotEmpty',
									},
								],
								default: 'equal',
								description: 'Operation to decide where the the data should be mapped to',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'string',
								displayOptions: {
									hide: {
										operation: ['isEmpty', 'isNotEmpty', 'regex', 'notRegex'],
									},
								},
								default: '',
								description: 'The value to compare with the first one',
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
						],
					},
				],
			},
			{
				displayName: 'Combine',
				name: 'combineOperation',
				type: 'options',
				options: [
					{
						name: 'ALL',
						description: 'Only if all conditions are meet it goes into "true" branch',
						value: 'all',
					},
					{
						name: 'ANY',
						description: 'If any of the conditions is meet it goes into "true" branch',
						value: 'any',
					},
				],
				default: 'all',
				description:
					'If multiple rules got set this settings decides if it is true as soon as ANY condition matches or only if ALL get meet',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnDataTrue: INodeExecutionData[] = [];
		const returnDataFalse: INodeExecutionData[] = [];

		const items = this.getInputData();

		let item: INodeExecutionData;
		let combineOperation: string;

		const isDateObject = (value: NodeParameterValue) =>
			Object.prototype.toString.call(value) === '[object Date]';
		const isDateInvalid = (value: NodeParameterValue) => value?.toString() === 'Invalid Date';

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
			isEmpty: (value1: NodeParameterValue) =>
				[undefined, null, '', NaN].includes(value1 as string) ||
				(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
					? Object.entries(value1 as string).length === 0
					: false) ||
				(isDateObject(value1) && isDateInvalid(value1)),
			isNotEmpty: (value1: NodeParameterValue) =>
				!(
					[undefined, null, '', NaN].includes(value1 as string) ||
					(typeof value1 === 'object' && value1 !== null && !isDateObject(value1)
						? Object.entries(value1 as string).length === 0
						: false) ||
					(isDateObject(value1) && isDateInvalid(value1))
				),
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
			if (moment.isMoment(value)) {
				returnValue = value.unix();
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

		// The different dataTypes to check the values in
		const dataTypes = ['boolean', 'dateTime', 'number', 'string'];

		// Itterate over all items to check which ones should be output as via output "true" and
		// which ones via output "false"
		let dataType: string;
		let compareOperationResult: boolean;
		let value1: NodeParameterValue, value2: NodeParameterValue;
		itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];

			let compareData: INodeParameters;

			combineOperation = this.getNodeParameter('combineOperation', itemIndex) as string;

			// Check all the values of the different dataTypes
			for (dataType of dataTypes) {
				// Check all the values of the current dataType
				for (compareData of this.getNodeParameter(
					`conditions.${dataType}`,
					itemIndex,
					[],
				) as INodeParameters[]) {
					// Check if the values passes

					value1 = compareData.value1 as NodeParameterValue;
					value2 = compareData.value2 as NodeParameterValue;

					if (dataType === 'dateTime') {
						value1 = convertDateTime(value1);
						value2 = convertDateTime(value2);
					}

					compareOperationResult = compareOperationFunctions[compareData.operation as string](
						value1,
						value2,
					);

					if (compareOperationResult && combineOperation === 'any') {
						// If it passes and the operation is "any" we do not have to check any
						// other ones as it should pass anyway. So go on with the next item.
						returnDataTrue.push(item);
						continue itemLoop;
					} else if (!compareOperationResult && combineOperation === 'all') {
						// If it fails and the operation is "all" we do not have to check any
						// other ones as it should be not pass anyway. So go on with the next item.
						returnDataFalse.push(item);
						continue itemLoop;
					}
				}
			}

			if (combineOperation === 'all') {
				// If the operation is "all" it means the item did match all conditions
				// so it passes.
				returnDataTrue.push(item);
			} else {
				// If the operation is "any" it means the the item did not match any condition.
				returnDataFalse.push(item);
			}
		}

		return [returnDataTrue, returnDataFalse];
	}
}
