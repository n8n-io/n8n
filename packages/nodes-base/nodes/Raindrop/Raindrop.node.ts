import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { isEmpty, omit } from 'lodash';

import { raindropApiRequest } from './GenericFunctions';

import {
	bookmarkFields,
	bookmarkOperations,
	collectionFields,
	collectionOperations,
	tagFields,
	tagOperations,
	userFields,
	userOperations,
} from './descriptions';

export class Raindrop implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Raindrop',
		name: 'raindrop',
		icon: 'file:raindrop.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Raindrop API',
		defaults: {
			name: 'Raindrop',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'raindropOAuth2Api',
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
					{
						name: 'Bookmark',
						value: 'bookmark',
					},
					{
						name: 'Collection',
						value: 'collection',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'collection',
			},
			...bookmarkOperations,
			...bookmarkFields,
			...collectionOperations,
			...collectionFields,
			...tagOperations,
			...tagFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			async getCollections(this: ILoadOptionsFunctions) {
				const responseData = await raindropApiRequest.call(this, 'GET', '/collections', {}, {});
				return responseData.items.map((item: { title: string; _id: string }) => ({
					name: item.title,
					value: item._id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'bookmark') {
					// *********************************************************************
					//                              bookmark
					// *********************************************************************

					// https://developer.raindrop.io/v1/raindrops

					if (operation === 'create') {
						// ----------------------------------
						//         bookmark: create
						// ----------------------------------

						const body: IDataObject = {
							link: this.getNodeParameter('link', i),
							collection: {
								$id: this.getNodeParameter('collectionId', i),
							},
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						if (additionalFields.pleaseParse === true) {
							body.pleaseParse = {};
							delete additionalFields.pleaseParse;
						}

						if (additionalFields.tags) {
							body.tags = (additionalFields.tags as string).split(',').map((tag) => tag.trim());
						}

						const endpoint = '/raindrop';
						responseData = await raindropApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData.item;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         bookmark: delete
						// ----------------------------------

						const bookmarkId = this.getNodeParameter('bookmarkId', i);
						const endpoint = `/raindrop/${bookmarkId}`;
						responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//         bookmark: get
						// ----------------------------------

						const bookmarkId = this.getNodeParameter('bookmarkId', i);
						const endpoint = `/raindrop/${bookmarkId}`;
						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.item;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         bookmark: getAll
						// ----------------------------------
						const returnAll = this.getNodeParameter('returnAll', i);

						const collectionId = this.getNodeParameter('collectionId', i);
						const endpoint = `/raindrops/${collectionId}`;
						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.items;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.slice(0, limit);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//         bookmark: update
						// ----------------------------------

						const bookmarkId = this.getNodeParameter('bookmarkId', i);

						const body = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						Object.assign(body, updateFields);

						if (updateFields.collectionId) {
							body.collection = {
								$id: updateFields.collectionId,
							};
							delete updateFields.collectionId;
						}
						if (updateFields.pleaseParse === true) {
							body.pleaseParse = {};
							delete updateFields.pleaseParse;
						}
						if (updateFields.tags) {
							body.tags = (updateFields.tags as string).split(',').map((tag) => tag.trim());
						}

						const endpoint = `/raindrop/${bookmarkId}`;
						responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
						responseData = responseData.item;
					}
				} else if (resource === 'collection') {
					// *********************************************************************
					//                             collection
					// *********************************************************************

					// https://developer.raindrop.io/v1/collections/methods

					if (operation === 'create') {
						// ----------------------------------
						//       collection: create
						// ----------------------------------

						const body = {
							title: this.getNodeParameter('title', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						if (additionalFields.cover) {
							body.cover = [body.cover];
						}

						if (additionalFields.parentId) {
							body['parent.$id'] = parseInt(additionalFields.parentId as string, 10);
							delete additionalFields.parentId;
						}

						responseData = await raindropApiRequest.call(this, 'POST', '/collection', {}, body);
						responseData = responseData.item;
					} else if (operation === 'delete') {
						// ----------------------------------
						//        collection: delete
						// ----------------------------------

						const collectionId = this.getNodeParameter('collectionId', i);
						const endpoint = `/collection/${collectionId}`;
						responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//        collection: get
						// ----------------------------------

						const collectionId = this.getNodeParameter('collectionId', i);
						const endpoint = `/collection/${collectionId}`;
						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.item;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        collection: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', 0);

						const endpoint =
							this.getNodeParameter('type', i) === 'parent'
								? '/collections'
								: '/collections/childrens';

						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.items;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.slice(0, limit);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//        collection: update
						// ----------------------------------

						const collectionId = this.getNodeParameter('collectionId', i);

						const body = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						if (updateFields.parentId) {
							body['parent.$id'] = parseInt(updateFields.parentId as string, 10);
							delete updateFields.parentId;
						}

						Object.assign(body, omit(updateFields, 'binaryPropertyName'));

						const endpoint = `/collection/${collectionId}`;
						responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
						responseData = responseData.item;

						// cover-specific endpoint

						if (updateFields.cover) {
							if (!items[i].binary) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							if (!updateFields.cover) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter a binary property to upload a cover image.',
									{ itemIndex: i },
								);
							}

							const binaryPropertyName = updateFields.cover as string;

							const binaryData = items[i].binary![binaryPropertyName];
							const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

							const formData = {
								cover: {
									value: dataBuffer,
									options: {
										filename: binaryData.fileName,
										contentType: binaryData.mimeType,
									},
								},
							};

							const requestEndpoint = `/collection/${collectionId}/cover`;
							responseData = await raindropApiRequest.call(
								this,
								'PUT',
								requestEndpoint,
								{},
								{},
								{ 'Content-Type': 'multipart/form-data', formData },
							);
							responseData = responseData.item;
						}
					}
				} else if (resource === 'user') {
					// *********************************************************************
					//                                user
					// *********************************************************************

					// https://developer.raindrop.io/v1/user

					if (operation === 'get') {
						// ----------------------------------
						//           user: get
						// ----------------------------------

						const self = this.getNodeParameter('self', i);
						let endpoint = '/user';

						if (self === false) {
							const userId = this.getNodeParameter('userId', i);
							endpoint += `/${userId}`;
						}

						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.user;
					}
				} else if (resource === 'tag') {
					// *********************************************************************
					//                              tag
					// *********************************************************************

					// https://developer.raindrop.io/v1/tags

					if (operation === 'delete') {
						// ----------------------------------
						//           tag: delete
						// ----------------------------------

						let endpoint = '/tags';

						const body: IDataObject = {
							tags: (this.getNodeParameter('tags', i) as string).split(','),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.collectionId) {
							endpoint += `/${additionalFields.collectionId}`;
						}

						responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, body);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//           tag: getAll
						// ----------------------------------

						let endpoint = '/tags';

						const returnAll = this.getNodeParameter('returnAll', i);

						const filter = this.getNodeParameter('filters', i);

						if (filter.collectionId) {
							endpoint += `/${filter.collectionId}`;
						}

						responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData.items;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
