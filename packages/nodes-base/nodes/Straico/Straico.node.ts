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
import { straicoApiRequest, API_VERSIONS, validateFile } from './GenericFunctions';

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
						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							'/user',
						);
					}
				} else if (resource === 'model') {
					if (operation === 'getListV0') {
						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							'/models',
						);
					} else if (operation === 'getListV1') {
						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V1,
							'/models',
						);
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

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							'/prompt/completion',
							body,
						);
					} else if (operation === 'completeV1') {
						const models = (this.getNodeParameter('models', i) as string).split(',').map(m => m.trim());
						if (models.length > 4) {
							throw new NodeOperationError(this.getNode(), 'Maximum 4 models allowed');
						}
						const message = this.getNodeParameter('message', i) as string;
						const additionalFields = this.getNodeParameter('additionalFieldsV1', i) as IDataObject;

						const body: IDataObject = {
							models,
							message,
						};

						if (additionalFields.file_urls) {
							const fileUrls = (additionalFields.file_urls as string).split(',').map(url => url.trim());
							if (fileUrls.length > 4) {
								throw new NodeOperationError(this.getNode(), 'Maximum 4 files allowed');
							}
							body.file_urls = fileUrls;
						}
						if (additionalFields.images) {
							body.images = (additionalFields.images as string).split(',').map(url => url.trim());
						}
						if (additionalFields.youtube_urls) {
							const youtubeUrls = (additionalFields.youtube_urls as string).split(',').map(url => url.trim());
							if (youtubeUrls.length > 4) {
								throw new NodeOperationError(this.getNode(), 'Maximum 4 YouTube URLs allowed');
							}
							body.youtube_urls = youtubeUrls;
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

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V1,
							'/prompt/completion',
							body,
						);
					}
				} else if (resource === 'file') {
					if (operation === 'upload') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const fileName = this.getNodeParameter('fileName', i) as string;
						const item = items[i];
						if (!item.binary || !item.binary[binaryPropertyName]) {
							throw new NodeOperationError(this.getNode(), `No binary data property '${binaryPropertyName}' found on item!`);
						}
						const binaryData = item.binary[binaryPropertyName];
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						validateFile(buffer, fileName);

						const formData = {
							file: {
								value: buffer,
								options: {
									filename: fileName,
									contentType: binaryData.mimeType,
								},
							},
						};

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							'/file/upload',
							formData,
							{
								headers: {
									'Content-Type': 'multipart/form-data',
								},
							},
						);
					} else if (operation === 'delete') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						responseData = await straicoApiRequest.call(
							this,
							'DELETE',
							API_VERSIONS.V0,
							`/file/${fileId}`,
						);
					}
				} else if (resource === 'image') {
					if (operation === 'generate') {
						const model = this.getNodeParameter('model', i) as string;
						const description = this.getNodeParameter('description', i) as string;
						const size = this.getNodeParameter('size', i) as string;
						const variations = this.getNodeParameter('variations', i) as number;

						const body: IDataObject = {
							model,
							description,
							size,
							variations,
						};

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							'/image/generation',
							body,
						);
					}
				} else if (resource === 'agent') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const description = this.getNodeParameter('description', i) as string;
						const defaultLlm = this.getNodeParameter('default_llm', i) as string;
						const customPrompt = this.getNodeParameter('custom_prompt', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
							description,
							default_llm: defaultLlm,
							custom_prompt: customPrompt,
						};

						if (additionalFields.tags) {
							body.tags = (additionalFields.tags as string).split(',').map(tag => tag.trim());
						}
						if (additionalFields.visibility) {
							body.visibility = additionalFields.visibility;
						}

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							'/agent',
							body,
						);
					} else if (operation === 'delete') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = await straicoApiRequest.call(
							this,
							'DELETE',
							API_VERSIONS.V0,
							`/agent/${agentId}`,
						);
					} else if (operation === 'get') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							`/agent/${agentId}`,
						);
					} else if (operation === 'getAll') {
						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							'/agent',
						);
					} else if (operation === 'update') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const updateFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {};

						if (updateFields.name) body.name = updateFields.name;
						if (updateFields.description) body.description = updateFields.description;
						if (updateFields.default_llm) body.default_llm = updateFields.default_llm;
						if (updateFields.custom_prompt) body.custom_prompt = updateFields.custom_prompt;
						if (updateFields.tags) {
							body.tags = (updateFields.tags as string).split(',').map(tag => tag.trim());
						}
						if (updateFields.visibility) body.visibility = updateFields.visibility;

						responseData = await straicoApiRequest.call(
							this,
							'PUT',
							API_VERSIONS.V0,
							`/agent/${agentId}`,
							body,
						);
					} else if (operation === 'execute') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

						const body: IDataObject = {
							message,
						};

						if (queryParameters.search_type) {
							body.search_type = queryParameters.search_type;
						}
						if (queryParameters.k) {
							body.k = queryParameters.k;
						}
						if (queryParameters.fetch_k) {
							body.fetch_k = queryParameters.fetch_k;
						}
						if (queryParameters.lambda_mult) {
							body.lambda_mult = queryParameters.lambda_mult;
						}
						if (queryParameters.score_threshold) {
							body.score_threshold = queryParameters.score_threshold;
						}

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							`/agent/${agentId}/prompt`,
							body,
						);
					} else if (operation === 'addRag') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const ragId = this.getNodeParameter('ragId', i) as string;

						const body: IDataObject = {
							rag: ragId,
						};

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							`/agent/${agentId}/rag`,
							body,
						);
					}
				} else if (resource === 'rag') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const description = this.getNodeParameter('description', i) as string;
						const files = this.getNodeParameter('files', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const formData = new FormData();
						formData.append('name', name);
						formData.append('description', description);

						const fileList = files.split(',').map(f => f.trim());
						if (fileList.length > 4) {
							throw new NodeOperationError(this.getNode(), 'Maximum 4 files allowed');
						}

						fileList.forEach((file, index) => {
							formData.append('files', file);
						});

						if (additionalFields.chunking_method) {
							formData.append('chunking_method', additionalFields.chunking_method as string);

							if (['fixed_size', 'recursive', 'markdown', 'python'].includes(additionalFields.chunking_method as string)) {
								if (additionalFields.chunk_size) {
									formData.append('chunk_size', additionalFields.chunk_size as string);
								}
								if (additionalFields.chunk_overlap) {
									formData.append('chunk_overlap', additionalFields.chunk_overlap as string);
								}
							}

							if (additionalFields.chunking_method === 'fixed_size' && additionalFields.separator) {
								formData.append('separator', additionalFields.separator as string);
							}

							if (additionalFields.chunking_method === 'recursive' && additionalFields.separators) {
								formData.append('separators', additionalFields.separators as string);
							}

							if (additionalFields.chunking_method === 'semantic') {
								if (additionalFields.breakpoint_threshold_type) {
									formData.append('breakpoint_threshold_type', additionalFields.breakpoint_threshold_type as string);
								}
								if (additionalFields.buffer_size) {
									formData.append('buffer_size', additionalFields.buffer_size as string);
								}
							}
						}

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							'/rag',
							formData,
							{
								headers: {
									'Content-Type': 'multipart/form-data',
								},
							},
						);
					} else if (operation === 'delete') {
						const ragId = this.getNodeParameter('ragId', i) as string;

						responseData = await straicoApiRequest.call(
							this,
							'DELETE',
							API_VERSIONS.V0,
							`/rag/${ragId}`,
						);
					} else if (operation === 'get') {
						const ragId = this.getNodeParameter('ragId', i) as string;

						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							`/rag/${ragId}`,
						);
					} else if (operation === 'getAll') {
						responseData = await straicoApiRequest.call(
							this,
							'GET',
							API_VERSIONS.V0,
							'/rag/user',
						);
					} else if (operation === 'update') {
						const ragId = this.getNodeParameter('ragId', i) as string;
						const files = this.getNodeParameter('files', i) as string;

						const formData = new FormData();
						const fileList = files.split(',').map(f => f.trim());
						if (fileList.length > 4) {
							throw new NodeOperationError(this.getNode(), 'Maximum 4 files allowed');
						}

						fileList.forEach((file, index) => {
							formData.append('files', file);
						});

						responseData = await straicoApiRequest.call(
							this,
							'PUT',
							API_VERSIONS.V0,
							`/rag/${ragId}`,
							formData,
							{
								headers: {
									'Content-Type': 'multipart/form-data',
								},
							},
						);
					} else if (operation === 'query') {
						const ragId = this.getNodeParameter('ragId', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const model = this.getNodeParameter('model', i) as string;
						const queryParameters = this.getNodeParameter('queryParameters', i) as IDataObject;

						const body: IDataObject = {
							message,
							model,
						};

						if (queryParameters.search_type) {
							body.search_type = queryParameters.search_type;
						}
						if (queryParameters.k) {
							body.k = queryParameters.k;
						}
						if (queryParameters.fetch_k) {
							body.fetch_k = queryParameters.fetch_k;
						}
						if (queryParameters.lambda_mult) {
							body.lambda_mult = queryParameters.lambda_mult;
						}
						if (queryParameters.score_threshold) {
							body.score_threshold = queryParameters.score_threshold;
						}

						responseData = await straicoApiRequest.call(
							this,
							'POST',
							API_VERSIONS.V0,
							`/rag/${ragId}/prompt`,
							body,
						);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as INodeExecutionData[]);
				} else if (responseData !== undefined) {
					returnData.push({ json: responseData as IDataObject });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
