import {
	BINARY_ENCODING,
	IExecuteSingleFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const pdf = require('pdf-parse');

export class ReadPdf implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Read PDF',
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
				description: 'Name of the binary property from which to<br />read the PDF file.',
			},
		],
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		const binaryPropertyName = this.getNodeParameter('binaryPropertyName') as string;

		const item = this.getInputData();

		if (item.binary === undefined) {
			item.binary = {};
		}

		const binaryData = Buffer.from(item.binary[binaryPropertyName].data, BINARY_ENCODING);

		return {
			binary: item.binary,
			json: await pdf(binaryData),
		};
	}
}
