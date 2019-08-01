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
		changesIncomingData: {
			value: '={{$parameter["mode"] === "merge"}}',
			keys: 'json',
		},
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
						name: 'Merge',
						value: 'merge',
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
						description: 'Waits till data of both inputs is available and will then output a single empty item.',
					},
				],
				default: 'append',
				description: 'How data should be merged. If it should simply<br />be appended or merged depending on a property.',
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
							'merge'
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
							'merge'
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
		// const itemsInput2 = this.getInputData(1);

		const returnData: INodeExecutionData[] = [];

		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode === 'append') {
			// Simply appends the data
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		} else if (mode === 'merge') {
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
				if (!entry.json || !entry.json.hasOwnProperty(propertyName2)) {
					// Entry does not have the property so skip it
					continue;
				}

				copyData[entry.json[propertyName2] as string] = entry;
			}

			// Copy data on entries
			let referenceValue: GenericValue;
			let key: string;
			for (entry of dataInput1) {

				if (!entry.json || !entry.json.hasOwnProperty(propertyName1)) {
					// Entry does not have the property so skip it
					continue;
				}

				referenceValue = entry.json[propertyName1];

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
					for (key of Object.keys(copyData[referenceValue as string].json)) {
						// TODO: Currently only copies json data and no binary one
						entry.json[key] = copyData[referenceValue as string].json[key];
					}
				}
			}

			return [dataInput1];
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
