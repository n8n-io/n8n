import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';


import axios from 'axios';
const FormData = require('form-data');

export class Koncile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Koncile',
		name: 'koncile',
    icon: 'file:koncile.svg',
		group: ['transform'],
		version: 1,
		description: 'Send files to Koncile.ai',
		defaults: {
			name: 'Koncile',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'koncileApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property that contains the file',
			},
			{
				displayName: 'Folder Name or ID',
				name: 'folder_id',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getFolders',
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Template Name or ID',
				name: 'template_id',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
					loadOptionsDependsOn: ['folder_id'],
				},
				default: '',
				required: true,
			},
		],
	};

	methods = {
	loadOptions: {
		async getFolders(this: ILoadOptionsFunctions) {
			const credentials = await this.getCredentials('koncileApi');
			const apiKey = credentials.api_key;

    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.koncile.ai/v1/fetch_all_folders/',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });


			return response.folders.map((folder: any) => ({
				name: folder.name,
				value: folder.id,
			}));
		},

		async getTemplates(this: ILoadOptionsFunctions) {
			const credentials = await this.getCredentials('koncileApi');
			const apiKey = credentials.api_key;
			const folderId = this.getCurrentNodeParameter('folder_id') as number;

      const response = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://api.koncile.ai/v1/fetch_all_folders/',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });


			const folder = response.folders.find((f: any) => f.id === folderId);
			if (!folder?.templates?.length) {
				return [];
			}

			return folder.templates.map((template: any) => ({
				name: template.name,
				value: template.id,
			}));
		},
	},
};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('koncileApi');
		const apiKey = credentials.api_key;

		for (let i = 0; i < items.length; i++) {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const template_id = this.getNodeParameter('template_id', i) as number;
			const folder_id = this.getNodeParameter('folder_id', i) as number;

			const item = items[i];
			const binaryData = item.binary?.[binaryPropertyName];

			if (!binaryData) {
				throw new NodeApiError(this.getNode(), {
					message: `No binary data property '${binaryPropertyName}' found on input`,
				});
			}

			const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			const form = new FormData();
			form.append('files', fileBuffer, {
				filename: binaryData.fileName || 'upload.pdf',
				contentType: binaryData.mimeType || 'application/pdf',
			});

			try {
				const response = await axios.post(
					'https://api.koncile.ai/v1/upload_file/',
					form,
					{
						headers: {
							...form.getHeaders(),
							Authorization: `Bearer ${apiKey}`,
						},
						params: {
							template_id,
							folder_id,
						},
						maxContentLength: Infinity,
						maxBodyLength: Infinity,
					}
				);
        console.log('📦 Réponse de Koncile Upload API :\n', JSON.stringify(response.data, null, 2));
				returnData.push({
					json: {
						...response.data,
						uploaded_file_name: binaryData.fileName,
					},
				});
			} catch (error: any) {
				throw new NodeApiError(this.getNode(), error);
			}
		}

		return [returnData];
	}
}
