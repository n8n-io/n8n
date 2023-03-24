/* eslint-disable @typescript-eslint/no-loop-func */
import type { NodeVMOptions, VMRequire } from 'vm2';
import { NodeVM } from 'vm2';
import type {
	IExecuteFunctions,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';

export class FunctionItem implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Function Item',
		name: 'functionItem',
		hidden: true,
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Run custom function code which gets executed once per item',
		defaults: {
			name: 'Function Item',
			color: '#ddbb33',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'A newer version of this node type is available, called the ‘Code’ node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'JavaScript Code',
				name: 'functionCode',
				typeOptions: {
					alwaysOpenEditWindow: true,
					codeAutocomplete: 'functionItem',
					editor: 'code',
					rows: 10,
				},
				type: 'string',
				default: `// Code here will run once per input item.
// More info and help: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.functionitem/
// Tip: You can use luxon for dates and $jmespath for querying JSON structures

// Add a new field called 'myNewField' to the JSON of the item
item.myNewField = 1;

// You can write logs to the browser console
console.log('Done!');

return item;`,
				description: 'The JavaScript code to execute for each item',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		const cleanupData = (inputData: IDataObject): IDataObject => {
			Object.keys(inputData).map((key) => {
				if (inputData[key] !== null && typeof inputData[key] === 'object') {
					if (inputData[key]!.constructor.name === 'Object') {
						// Is regular node.js object so check its data
						inputData[key] = cleanupData(inputData[key] as IDataObject);
					} else {
						// Is some special object like a Date so stringify
						inputData[key] = deepCopy(inputData[key]);
					}
				}
			});
			return inputData;
		};

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			const mode = this.getMode();

			try {
				item = items[itemIndex];
				item.index = itemIndex;

				// Copy the items as they may get changed in the functions
				item = deepCopy(item);

				// Define the global objects for the custom function
				const sandbox = {
					/** @deprecated for removal - replaced by getBinaryDataAsync() */
					getBinaryData: (): IBinaryKeyData | undefined => {
						if (mode === 'manual') {
							this.sendMessageToUI(
								'getBinaryData(...) is deprecated and will be removed in a future version. Please consider switching to getBinaryDataAsync(...) instead.',
							);
						}
						return item.binary;
					},
					/** @deprecated for removal - replaced by setBinaryDataAsync() */
					setBinaryData: async (data: IBinaryKeyData) => {
						if (mode === 'manual') {
							this.sendMessageToUI(
								'setBinaryData(...) is deprecated and will be removed in a future version. Please consider switching to setBinaryDataAsync(...) instead.',
							);
						}
						item.binary = data;
					},
					getNodeParameter: this.getNodeParameter,
					getWorkflowStaticData: this.getWorkflowStaticData,
					helpers: this.helpers,
					item: item.json,
					getBinaryDataAsync: async (): Promise<IBinaryKeyData | undefined> => {
						// Fetch Binary Data, if available. Cannot check item with `if (item?.index)`, as index may be 0.
						if (item?.binary && item?.index !== undefined && item?.index !== null) {
							for (const binaryPropertyName of Object.keys(item.binary)) {
								item.binary[binaryPropertyName].data = (
									await this.helpers.getBinaryDataBuffer(item.index, binaryPropertyName)
								)?.toString('base64');
							}
						}
						// Retrun Data
						return item.binary;
					},
					setBinaryDataAsync: async (data: IBinaryKeyData) => {
						// Ensure data is present
						if (!data) {
							throw new NodeOperationError(
								this.getNode(),
								'No data was provided to setBinaryDataAsync (data: IBinaryKeyData).',
							);
						}

						// Set Binary Data
						for (const binaryPropertyName of Object.keys(data)) {
							const binaryItem = data[binaryPropertyName];
							data[binaryPropertyName] = await this.helpers.setBinaryDataBuffer(
								binaryItem,
								Buffer.from(binaryItem.data, 'base64'),
							);
						}

						// Set Item Reference
						item.binary = data;
					},
				};

				// Make it possible to access data via $node, $parameter, ...
				const dataProxy = this.getWorkflowDataProxy(itemIndex);
				Object.assign(sandbox, dataProxy);

				const options: NodeVMOptions = {
					console: mode === 'manual' ? 'redirect' : 'inherit',
					sandbox,
					require: {
						external: false,
						builtin: [],
					},
				};

				const vmRequire = options.require as VMRequire;
				if (process.env.NODE_FUNCTION_ALLOW_BUILTIN) {
					vmRequire.builtin = process.env.NODE_FUNCTION_ALLOW_BUILTIN.split(',');
				}

				if (process.env.NODE_FUNCTION_ALLOW_EXTERNAL) {
					vmRequire.external = {
						modules: process.env.NODE_FUNCTION_ALLOW_EXTERNAL.split(','),
						transitive: false,
					};
				}

				const vm = new NodeVM(options as unknown as NodeVMOptions);

				if (mode === 'manual') {
					vm.on('console.log', this.sendMessageToUI);
				}

				// Get the code to execute
				const functionCode = this.getNodeParameter('functionCode', itemIndex) as string;

				let jsonData: IDataObject;
				try {
					// Execute the function code
					jsonData = await vm.run(
						`module.exports = async function() {${functionCode}\n}()`,
						__dirname,
					);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					} else {
						// Try to find the line number which contains the error and attach to error message
						const stackLines = error.stack.split('\n');
						if (stackLines.length > 0) {
							stackLines.shift();
							const lineParts = stackLines
								.find((line: string) => line.includes('FunctionItem'))
								.split(':');
							if (lineParts.length > 2) {
								const lineNumber = lineParts.splice(-2, 1);
								if (!isNaN(lineNumber as number)) {
									error.message = `${error.message} [Line ${lineNumber} | Item Index: ${itemIndex}]`;
									return Promise.reject(error);
								}
							}
						}

						error.message = `${error.message} [Item Index: ${itemIndex}]`;

						return Promise.reject(error);
					}
				}

				// Do very basic validation of the data
				if (jsonData === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'No data got returned. Always an object has to be returned!',
					);
				}

				const returnItem: INodeExecutionData = {
					json: cleanupData(jsonData),
					pairedItem: {
						item: itemIndex,
					},
				};

				if (item.binary) {
					returnItem.binary = item.binary;
				}

				returnData.push(returnItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
