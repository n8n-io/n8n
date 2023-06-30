import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import pdf from 'pdf-parse';

export class ReadPDF implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property from which to read the PDF file',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			try {
				item = items[itemIndex];
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

				if (item.binary === undefined) {
					item.binary = {};
				}

				const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
					itemIndex,
					binaryPropertyName,
				);
				returnData.push({
					binary: item.binary,

					json: (await pdf(binaryDataBuffer)) as unknown as IDataObject,
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
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
