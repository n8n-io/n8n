import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { NodeVM } = require('vm2');

export class Function implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Function',
		name: 'function',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Run custom function code which gets executed once per item.',
		defaults: {
			name: 'Function',
			color: '#FF9922',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Function',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					editor: 'code',
					rows: 10,
				},
				type: 'string',
				default: 'items[0].json.myVariable = 1;\nreturn items;',
				description: 'The JavaScript code to execute.',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// const item = this.getInputData();
		let items = this.getInputData();

		// Copy the items as they may get changed in the functions
		items = JSON.parse(JSON.stringify(items));

		// Define the global objects for the custom function
		const sandbox = {
			getNodeParameter: this.getNodeParameter,
			getWorkflowStaticData: this.getWorkflowStaticData,
			helpers: this.helpers,
			items,
			// To be able to access data of other items
			$item: (index: number) => this.getWorkflowDataProxy(index),
		};

		// Make it possible to access data via $node, $parameter, ...
		// By default use data from first item
		Object.assign(sandbox, sandbox.$item(0));

		const vm = new NodeVM({
			console: 'inherit',
			sandbox,
			require: {
				external: false,
				root: './',
			}
		});

		// Get the code to execute
		const functionCode = this.getNodeParameter('functionCode', 0) as string;

		try {
			// Execute the function code
			items = await vm.run(`module.exports = async function() {${functionCode}}()`);
		} catch (e) {
			return Promise.reject(e);
		}

		return this.prepareOutputData(items);
	}
}
