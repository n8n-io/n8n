import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

const { NodeVM } = require('vm2');

export class Function implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Function',
		name: 'function',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Run custom function code which gets executed once and allows you to add, remove, change and replace items',
		defaults: {
			name: 'Function',
			color: '#FF9922',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'JavaScript Code',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					codeAutocomplete: 'function',
					editor: 'code',
					rows: 10,
				},
				type: 'string',
				default: `// Code here will run only once, no matter how many input items there are.
// More info and help: https://docs.n8n.io/nodes/n8n-nodes-base.function
// Tip: You can use luxon for dates and $jmespath for querying JSON structures

// Loop over inputs and add a new field called 'myNewField' to the JSON of each one
for (item of items) {
  item.json.myNewField = 1;
}

// You can write logs to the browser console
console.log('Done!');

return items;`,
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

		const cleanupData = (inputData: IDataObject): IDataObject => {
			Object.keys(inputData).map(key => {
				if (inputData[key] !== null && typeof inputData[key] === 'object') {
					if (inputData[key]!.constructor.name === 'Object') {
						// Is regular node.js object so check its data
						inputData[key] = cleanupData(inputData[key] as IDataObject);
					} else {
						// Is some special object like a Date so stringify
						inputData[key] = JSON.parse(JSON.stringify(inputData[key]));
					}
				}
			});
			return inputData;
		};

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

		const mode = this.getMode();

		const options = {
			console: (mode === 'manual') ? 'redirect' : 'inherit',
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

		if (mode === 'manual') {
			vm.on('console.log', this.sendMessageToUI);
		}

		// Get the code to execute
		const functionCode = this.getNodeParameter('functionCode', 0) as string;

		try {
			// Execute the function code
			items = (await vm.run(`module.exports = async function() {${functionCode}\n}()`, __dirname));
			items = this.helpers.normalizeItems(items);

			// Do very basic validation of the data
			if (items === undefined) {
				throw new NodeOperationError(this.getNode(), 'No data got returned. Always return an Array of items!');
			}
			if (!Array.isArray(items)) {
				throw new NodeOperationError(this.getNode(), 'Always an Array of items has to be returned!');
			}
			for (const item of items) {
				if (item.json === undefined) {
					throw new NodeOperationError(this.getNode(), 'All returned items have to contain a property named "json"!');
				}
				if (typeof item.json !== 'object') {
					throw new NodeOperationError(this.getNode(), 'The json-property has to be an object!');
				}

				item.json = cleanupData(item.json);

				if (item.binary !== undefined) {
					if (Array.isArray(item.binary) || typeof item.binary !== 'object') {
						throw new NodeOperationError(this.getNode(), 'The binary-property has to be an object!');
					}
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				items=[{json:{ error: error.message }}];
			} else {
				// Try to find the line number which contains the error and attach to error message
				const stackLines = error.stack.split('\n');
				if (stackLines.length > 0) {
					stackLines.shift();
					const lineParts = stackLines.find((line: string) => line.includes('Function')).split(':');
					if (lineParts.length > 2) {
						const lineNumber = lineParts.splice(-2, 1);
						if (!isNaN(lineNumber)) {
							error.message = `${error.message} [Line ${lineNumber}]`;
						}
					}
				}

				return Promise.reject(error);
			}
		}

		return this.prepareOutputData(items);
	}
}
