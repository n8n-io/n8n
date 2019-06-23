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
		icon: 'fa:clone',
		group: ['transform'],
		version: 1,
		description: 'Merges data from multiple streams',
		defaults: {
			name: 'Merge',
			color: '#00cc22',
		},
		inputs: ['main', 'main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append'
					},
					{
						name: 'Merge',
						value: 'merge'
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
				displayOptions: {
					show: {
						mode: [
							'merge'
						],
					},
				},
				description: 'Name of property which decides which items to merge of input 2.',
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
		}

		return [returnData];
	}
}
