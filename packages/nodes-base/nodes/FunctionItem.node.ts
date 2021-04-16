import { IExecuteFunctions } from 'n8n-core';
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
		properties: [
			{
				displayName: 'JavaScript Code',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					editor: 'code',
					rows: 10,
				},
				type: 'string',
				default: 'item.myVariable = 1;\nreturn item;',
				description: 'The JavaScript code to execute for each item.',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length as unknown as number;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {

			item = items[itemIndex];

			// Copy the items as they may get changed in the functions
			item = JSON.parse(JSON.stringify(item));

			// Define the global objects for the custom function
			const sandbox = {
				getBinaryData: (): IBinaryKeyData | undefined => {
					return item.binary;
				},
				getNodeParameter: this.getNodeParameter,
				getWorkflowStaticData: this.getWorkflowStaticData,
				helpers: this.helpers,
				item: item.json,
				setBinaryData: (data: IBinaryKeyData) => {
					item.binary = data;
				},
			};

			// Make it possible to access data via $node, $parameter, ...
			const dataProxy = this.getWorkflowDataProxy(itemIndex);
			Object.assign(sandbox, dataProxy);

			const options = {
				console: 'inherit',
				sandbox,
				require: {
					external: false as boolean | { modules: string[] },
					builtin: [] as string[],
				},
			};

			if (process.env.NODE_FUNCTION_ALLOW_BUILTIN) {
				options.require.builtin = process.env.NODE_FUNCTION_ALLOW_BUILTIN.split(',');
			}

			if (process.env.NODE_FUNCTION_ALLOW_EXTERNAL) {
				options.require.external = { modules: process.env.NODE_FUNCTION_ALLOW_EXTERNAL.split(',') };
			}

			const vm = new NodeVM(options);

			// Get the code to execute
			const functionCode = this.getNodeParameter('functionCode', itemIndex) as string;


			let jsonData: IDataObject;
			try {
				// Execute the function code
				jsonData = await vm.run(`module.exports = async function() {${functionCode}}()`, __dirname);
			} catch (e) {
				return Promise.reject(e);
			}

			// Do very basic validation of the data
			if (jsonData === undefined) {
				throw new Error('No data got returned. Always an object has to be returned!');
			}

			const returnItem: INodeExecutionData = {
				json: jsonData,
			};

			if (item.binary) {
				returnItem.binary = item.binary;
			}

			returnData.push(returnItem);
		}
		return this.prepareOutputData(returnData);
	}
}
