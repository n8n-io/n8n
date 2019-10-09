import { get } from 'lodash';

import { IExecuteFunctions } from 'n8n-core';
import {
	GenericValue,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class Merge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Merge',
		name: 'merge',
		icon: 'fa:code-branch',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"]}}',
		description: 'Merges data of multiple streams once data of both is available',
		defaults: {
			name: 'Merge',
			color: '#00bbcc',
		},
		inputs: ['main', 'main'],
		outputs: ['main'],
		inputNames: ['Input 1', 'Input 2'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Combines data of both inputs. The output will contain items of input 1 and input 2.',
					},
					{
						name: 'Merge By Index',
						value: 'mergeByIndex',
						description: 'Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on the index of the items. So first item of input 1 will be merged with first item of input 2 and so on.',
					},
					{
						name: 'Merge By Key',
						value: 'mergeByKey',
						description: 'Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on a defined key.',
					},
					{
						name: 'Pass-through',
						value: 'passThrough',
						description: 'Passes through data of one input. The output will conain only items of the defined input.',
					},
					{
						name: 'Wait',
						value: 'wait',
						description: 'Waits till data of both inputs is available and will then output a single empty item. If supposed to wait for multiple nodes they have to get attached to input 2. Node will not output any data.',
					},
				],
				default: 'append',
				description: 'How data of branches should be merged.',
			},
			{
				displayName: 'Join',
				name: 'join',
				type: 'options',
				displayOptions: {
					show: {
						mode: [
							'mergeByIndex'
						],
					},
				},
				options: [
					{
						name: 'Inner Join',
						value: 'inner',
						description: 'Merges as many items as both inputs contain. (Example: Input1 = 5 items, Input2 = 3 items | Output will contain 3 items)',
					},
					{
						name: 'Left Join',
						value: 'left',
						description: 'Merges as many items as first input contains. (Example: Input1 = 3 items, Input2 = 5 items | Output will contain 3 items)',
					},
					{
						name: 'Outer Join',
						value: 'outer',
						description: 'Merges as many items as input contains with most items. (Example: Input1 = 3 items, Input2 = 5 items | Output will contain 5 items)',
					},
				],
				default: 'left',
				description: 'How many items the output will contain<br />if inputs contain different amount of items.',
			},
			{
				displayName: 'Property Input 1',
				name: 'propertyName1',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						mode: [
							'mergeByKey'
						],
					},
				},
				description: 'Name of property which decides which items to merge of input 1.',
			},
			{
				displayName: 'Property Input 2',
				name: 'propertyName2',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						mode: [
							'mergeByKey'
						],
					},
				},
				description: 'Name of property which decides which items to merge of input 2.',
			},
			{
				displayName: 'Output Data',
				name: 'output',
				type: 'options',
				displayOptions: {
					show: {
						mode: [
							'passThrough'
						],
					},
				},
				options: [
					{
						name: 'Input 1',
						value: 'input1',
					},
					{
						name: 'Input 2',
						value: 'input2',
					},
				],
				default: 'input1',
				description: 'Defines of which input the data should be used as output of node.',
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode === 'append') {
			// Simply appends the data
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		} else if (mode === 'mergeByIndex') {
			// Merges data by index

			const join = this.getNodeParameter('join', 0) as string;

			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (dataInput1 === undefined || dataInput1.length === 0) {
				if (['inner', 'left'].includes(join)) {
					// When "inner" or "left" join return empty if first
					// input does not contain any items
					return [returnData];
				}

				// For "outer" return data of second input
				return [dataInput2];
			}

			if (dataInput2 === undefined || dataInput2.length === 0) {
				if (['left', 'outer'].includes(join)) {
					// When "left" or "outer" join return data of first input
					return [dataInput1];
				}

				// For "inner" return empty
				return [returnData];
			}

			// Default "left"
			let numEntries = dataInput1.length;
			if (join === 'inner') {
				numEntries = Math.min(dataInput1.length, dataInput2.length);
			} else if (join === 'outer') {
				numEntries = Math.max(dataInput1.length, dataInput2.length);
			}

			let newItem: INodeExecutionData;
			for (let i = 0; i < numEntries; i++) {
				if (i >= dataInput1.length) {
					returnData.push(dataInput2[i]);
					continue;
				}
				if (i >= dataInput2.length) {
					returnData.push(dataInput1[i]);
					continue;
				}

				newItem = {
					json: {},
				};

				if (dataInput1[i].binary !== undefined) {
					newItem.binary = {};
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, dataInput1[i].binary);
				}

				// Create also a shallow copy of the json data
				Object.assign(newItem.json, dataInput1[i].json);

				// Copy json data
				for (const key of Object.keys(dataInput2[i].json)) {
					newItem.json[key] = dataInput2[i].json[key];
				}

				// Copy binary data
				if (dataInput2[i].binary !== undefined) {
					if (newItem.binary === undefined) {
						newItem.binary = {};
					}

					for (const key of Object.keys(dataInput2[i].binary!)) {
						newItem.binary[key] = dataInput2[i].binary![key];
					}
				}

				returnData.push(newItem);
			}
		} else if (mode === 'mergeByKey') {
			// Merges data by key
			const dataInput1 = this.getInputData(0);
			if (!dataInput1) {
				// If it has no input data from first input return nothing
				return [returnData];
			}

			const propertyName1 = this.getNodeParameter('propertyName1', 0) as string;
			const propertyName2 = this.getNodeParameter('propertyName2', 0) as string;

			const dataInput2 = this.getInputData(1);
			if (!dataInput2 || !propertyName1 || !propertyName2) {
				// If the second input does not have any data or the property names are not defined
				// simply return the data from the first input
				return [dataInput1];
			}

			// Get the data to copy
			const copyData: {
				[key: string]: INodeExecutionData;
			} = {};
			let entry: INodeExecutionData;
			for (entry of dataInput2) {
				const key = get(entry.json, propertyName2);
				if (!entry.json || !key) {
					// Entry does not have the property so skip it
					continue;
				}

				copyData[key as string] = entry;
			}

			// Copy data on entries
			let referenceValue: GenericValue;
			let key: string;
			for (entry of dataInput1) {
				referenceValue = get(entry.json, propertyName1);

				if (!referenceValue) {
					// Entry does not have the property so skip it
					continue;
				}


				if (!['string', 'number'].includes(typeof referenceValue)) {
					continue;
				}

				if (typeof referenceValue === 'number') {
					referenceValue = referenceValue.toString();
				}

				if (copyData.hasOwnProperty(referenceValue as string)) {
					if (['null', 'undefined'].includes(typeof referenceValue)) {
						continue;
					}

					// Copy the entry as the data gets changed
					entry = JSON.parse(JSON.stringify(entry));

					for (key of Object.keys(copyData[referenceValue as string].json)) {
						// TODO: Currently only copies json data and no binary one
						entry.json[key] = copyData[referenceValue as string].json[key];
					}
				}
				returnData.push(entry);
			}

			return [returnData];
		} else if (mode === 'passThrough') {
			const output = this.getNodeParameter('output', 0) as string;

			if (output === 'input1') {
				returnData.push.apply(returnData, this.getInputData(0));
			} else  {
				returnData.push.apply(returnData, this.getInputData(1));
			}
		} else if (mode === 'wait') {
			returnData.push({ json: {} });
		}

		return [returnData];
	}
}
