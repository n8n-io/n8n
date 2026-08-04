import {
	NodeOperationError,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { extractDataFromPDF } from '@utils/binary';

export class ReadPDF implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: 'Read PDF',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'readPDF',
		icon: 'fa:file-pdf',
		group: ['input'],
		version: 1,
		description: 'Reads a PDF and extracts its content',
		defaults: {
			name: 'Read PDF',
			color: '#003355',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property from which to read the PDF file',
			},
			{
				displayName: 'Encrypted',
				name: 'encrypted',
				type: 'boolean',
				default: false,
				required: true,
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password to decrypt the PDF file with',
				displayOptions: {
					show: {
						encrypted: [true],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

				let password;
				if (this.getNodeParameter('encrypted', itemIndex) === true) {
					password = this.getNodeParameter('password', itemIndex) as string;
				}

				const json = await extractDataFromPDF.call(
					this,
					binaryPropertyName,
					password,
					undefined,
					undefined,
					itemIndex,
				);

				returnData.push({
					binary: items[itemIndex].binary,
					json,
				});
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
				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}
		return [returnData];
	}
}
