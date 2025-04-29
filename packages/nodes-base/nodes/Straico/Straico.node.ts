import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { userOperations, userFields } from './UserDescription';
import { modelOperations, modelFields } from './ModelDescription';
import { promptOperations, promptFields } from './PromptDescription';
import { fileOperations, fileFields } from './FileDescription';
import { imageOperations, imageFields } from './ImageDescription';
import { agentOperations, agentFields } from './AgentDescription';
import { ragOperations, ragFields } from './RagDescription';

export class Straico implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Straico',
		name: 'straico',
		icon: 'file:straico.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Straico API',
		defaults: {
			name: 'Straico',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'straicoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Model', value: 'model' },
					{ name: 'Prompt', value: 'prompt' },
					{ name: 'File', value: 'file' },
					{ name: 'Image', value: 'image' },
					{ name: 'Agent', value: 'agent' },
					{ name: 'RAG', value: 'rag' },
				],
				default: 'user',
			},
			...userOperations,
			...userFields,
			...modelOperations,
			...modelFields,
			...promptOperations,
			...promptFields,
			...fileOperations,
			...fileFields,
			...imageOperations,
			...imageFields,
			...agentOperations,
			...agentFields,
			...ragOperations,
			...ragFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				if (resource === 'user') {
					if (operation === 'getInfo') {
						// Get user information
						responseData = await this.helpers.request({
							method: 'GET',
							url: 'https://api.straico.com/v0/user',
							json: true,
						});
					}
				} else if (resource === 'model') {
					if (operation === 'getListV0') {
						// Get models list v0
						responseData = await this.helpers.request({
							method: 'GET',
							url: 'https://api.straico.com/v0/models',
							json: true,
						});
					} else if (operation === 'getListV1') {
						// Get models list v1
						responseData = await this.helpers.request({
							method: 'GET',
							url: 'https://api.straico.com/v1/models',
							json: true,
						});
					}
				} else if (resource === 'prompt') {
					if (operation === 'completeV0') {
						const model = this.getNodeParameter('model', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							model,
							message,
						};

						if (additionalFields.temperature !== undefined) {
							body.temperature = additionalFields.temperature;
						}
						if (additionalFields.max_tokens !== undefined) {
							body.max_tokens = additionalFields.max_tokens;
						}

						responseData = await this.helpers.request({
							method: 'POST',
							url: 'https://api.straico.com/v0/prompt/completion',
							json: true,
							body,
						});
					} else if (operation === 'completeV1') {
						const models = (this.getNodeParameter('models', i) as string).split(',').map(m => m.trim());
						const message = this.getNodeParameter('message', i) as string;
						const additionalFields = this.getNodeParameter('additionalFieldsV1', i) as IDataObject;

						const body: IDataObject = {
							models,
							message,
						};

						if (additionalFields.file_urls) {
							body.file_urls = (additionalFields.file_urls as string).split(',').map(url => url.trim());
						}
						if (additionalFields.images) {
							body.images = (additionalFields.images as string).split(',').map(url => url.trim());
						}
						if (additionalFields.youtube_urls) {
							body.youtube_urls = (additionalFields.youtube_urls as string).split(',').map(url => url.trim());
						}
						if (additionalFields.display_transcripts !== undefined) {
							body.display_transcripts = additionalFields.display_transcripts;
						}
						if (additionalFields.temperature !== undefined) {
							body.temperature = additionalFields.temperature;
						}
						if (additionalFields.max_tokens !== undefined) {
							body.max_tokens = additionalFields.max_tokens;
						}

						responseData = await this.helpers.request({
							method: 'POST',
							url: 'https://api.straico.com/v1/prompt/completion',
							json: true,
							body,
						});
					}
				} else if (resource === 'file') {
					responseData = { message: 'File resource not implemented yet. Please contact support if you need this functionality.' };
				} else if (resource === 'image') {
					responseData = { message: 'Image resource not implemented yet. Please contact support if you need this functionality.' };
				} else if (resource === 'agent') {
					responseData = { message: 'Agent resource not implemented yet. Please contact support if you need this functionality.' };
				} else if (resource === 'rag') {
					responseData = { message: 'RAG resource not implemented yet. Please contact support if you need this functionality.' };
				}

				if (responseData !== undefined) {
					returnData.push({
						json: responseData,
						pairedItem: {
							item: i,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
