import {
	BINARY_ENCODING,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { getDocument as readPDF, version as pdfJsVersion } from 'pdfjs-dist';

type Document = Awaited<ReturnType<Awaited<typeof readPDF>>['promise']>;
type Page = Awaited<ReturnType<Awaited<Document['getPage']>>>;
type TextContent = Awaited<ReturnType<Page['getTextContent']>>;

const parseText = (textContent: TextContent) => {
	let lastY = undefined;
	const text = [];
	for (const item of textContent.items) {
		if ('str' in item) {
			if (lastY == item.transform[5] || !lastY) {
				text.push(item.str);
			} else {
				text.push(`\n${item.str}`);
			}
			lastY = item.transform[5];
		}
	}
	return text.join('');
};

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
				const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

				const params: { password?: string; url?: URL; data?: ArrayBuffer } = {};

				if (this.getNodeParameter('encrypted', itemIndex) === true) {
					params.password = this.getNodeParameter('password', itemIndex) as string;
				}

				if (binaryData.id) {
					const binaryPath = this.helpers.getBinaryPath(binaryData.id);
					params.url = new URL(`file://${binaryPath}`);
				} else {
					params.data = Buffer.from(binaryData.data, BINARY_ENCODING).buffer;
				}

				const document = await readPDF(params).promise;
				const { info, metadata } = await document
					.getMetadata()
					.catch(() => ({ info: null, metadata: null }));

				const pages = [];
				for (let i = 1; i <= document.numPages; i++) {
					const page = await document.getPage(i);
					const text = await page.getTextContent().then(parseText);
					pages.push(text);
				}

				returnData.push({
					json: {
						numpages: document.numPages,
						numrender: document.numPages,
						info,
						metadata,
						text: pages.join('\n\n'),
						version: pdfJsVersion,
					},
				});
			} catch (error) {
				console.log(error);
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
