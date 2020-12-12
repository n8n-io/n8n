import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';


export class If implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IF',
		name: 'if',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'Splits a stream depending on defined compare operations.',
		defaults: {
			name: 'IF',
			color: '#408000',
		},
		inputs: ['main'],
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
				},
				description: 'The type of values to compare.',
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
								description: 'The value to compare with the second one.',
							},
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
								description: 'Operation to decide where the the data should be mapped to.',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'boolean',
								default: false,
								description: 'The value to compare with the first one.',
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
								description: 'The value to compare with the second one.',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
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
									{
										name: 'Is Empty',
										value: 'isEmpty',
									},
								],
								default: 'smaller',
								description: 'Operation to decide where the the data should be mapped to.',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'number',
								displayOptions: {
									hide: {
										operation: [
											'isEmpty',
										],
									},
								},
								default: 0,
								description: 'The value to compare with the first one.',
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
								description: 'The value to compare with the second one.',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Contains',
										value: 'contains',
									},
									{
										name: 'Equal',
										value: 'equal',
									},
									{
										name: 'Not Contains',
										value: 'notContains',
									},
									{
										name: 'Not Equal',
										value: 'notEqual',
									},
									{
										name: 'Regex',
										value: 'regex',
									},
									{
										name: 'Is Empty',
										value: 'isEmpty',
									},
								],
								default: 'equal',
								description: 'Operation to decide where the the data should be mapped to.',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'string',
								displayOptions: {
									hide: {
										operation: [
											'isEmpty',
											'regex',
										],
									},
								},
								default: '',
								description: 'The value to compare with the first one.',
							},
							{
								displayName: 'Regex',
								name: 'value2',
								type: 'string',
								displayOptions: {
									show: {
										operation: [
											'regex',
										],
									},
								},
								default: '',
								placeholder: '/text/i',
								description: 'The regex which has to match.',
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
						description: 'Only if all conditions are meet it goes into "true" branch.',
						value: 'all',
					},
					{
						name: 'ANY',
						description: 'If any of the conditions is meet it goes into "true" branch.',
						value: 'any',
					},
				],
				default: 'all',
				description: 'If multiple rules got set this settings decides if it is true as soon as ANY condition matches or only if ALL get meet.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnDataTrue: INodeExecutionData[] = [];
		const returnDataFalse: INodeExecutionData[] = [];

		const items = this.getInputData();

		let item: INodeExecutionData;
		let combineOperation: string;

		// The compare operations
		const compareOperationFunctions: {
			[key: string]: (value1: NodeParameterValue, value2: NodeParameterValue) => boolean;
		} = {
			contains: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || '').toString().includes((value2 || '').toString()),
			notContains: (value1: NodeParameterValue, value2: NodeParameterValue) => !(value1 || '').toString().includes((value2 || '').toString()),
			equal: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 === value2,
			notEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 !== value2,
			larger: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) > (value2 || 0),
			largerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) >= (value2 || 0),
			smaller: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) < (value2 || 0),
			smallerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => (value1 || 0) <= (value2 || 0),
			isEmpty: (value1: NodeParameterValue) => [undefined, null, ''].includes(value1 as string),
			regex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
				const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimy]*)$'));

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
		};

		// The different dataTypes to check the values in
		const dataTypes = [
			'boolean',
			'number',
			'string',
		];

		// Itterate over all items to check which ones should be output as via output "true" and
		// which ones via output "false"
		let dataType: string;
		let compareOperationResult: boolean;
		itemLoop:
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];

			let compareData: INodeParameters;

			combineOperation = this.getNodeParameter('combineOperation', itemIndex) as string;

			// Check all the values of the different dataTypes
			for (dataType of dataTypes) {
				// Check all the values of the current dataType
				for (compareData of this.getNodeParameter(`conditions.${dataType}`, itemIndex, []) as INodeParameters[]) {
					// Check if the values passes
					compareOperationResult = compareOperationFunctions[compareData.operation as string](compareData.value1 as NodeParameterValue, compareData.value2 as NodeParameterValue);

					if (compareOperationResult === true && combineOperation === 'any') {
						// If it passes and the operation is "any" we do not have to check any
						// other ones as it should pass anyway. So go on with the next item.
						returnDataTrue.push(item);
						continue itemLoop;
					} else if (compareOperationResult === false && combineOperation === 'all') {
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
