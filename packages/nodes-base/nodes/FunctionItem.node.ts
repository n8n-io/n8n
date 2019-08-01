import { IExecuteSingleFunctions } from 'n8n-core';
import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { NodeVM } = require('vm2');

export class FunctionItem implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Function Item',
		name: 'functionItem',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Run custom function code which gets executed once per item.',
		defaults: {
			name: 'FunctionItem',
			color: '#ddbb33',
		},
		inputs: ['main'],
		outputs: ['main'],
		changesIncomingData: {
			value: true,
			keys: 'json,binary',
		},
		properties: [
			{
				displayName: 'Function',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 10,
				},
				type: 'string',
				default: 'item.myVariable = 1;\nreturn item;',
				description: 'The JavaScript code to execute for each item.',
			},
		],
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		// Define the global objects for the custom function
		const sandbox = {
			getBinaryData: (): IBinaryKeyData | undefined => {
				return item.binary;
			},
			getNodeParameter: this.getNodeParameter,
			helpers: this.helpers,
			item: item.json,
			setBinaryData: (data: IBinaryKeyData) => {
				item.binary = data;
			},
		};

		const vm = new NodeVM({
			console: 'inherit',
			sandbox,
			require: {
				external: false,
				root: './',
			}
		});

		// Get the code to execute
		const functionCode = this.getNodeParameter('functionCode') as string;


		let jsonData: IDataObject;
		try {
			// Execute the function code
			jsonData = await vm.run(`module.exports = async function() {${functionCode}}()`);
		} catch (e) {
			return Promise.reject(e);
		}

		return {
			json: jsonData
		};
	}
}
