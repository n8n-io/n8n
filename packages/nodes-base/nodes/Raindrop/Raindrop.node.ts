import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	isEmpty,
	omit,
} from 'lodash';

import {
	raindropApiRequest,
} from './GenericFunctions';

import {
	collectionFields,
	collectionOperations,
	raindropFields,
	raindropOperations,
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
			color: '#1988e0',
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
				options: [
					{
						name: 'Collection',
						value: 'collection',
					},
					{
						name: 'Raindrop',
						value: 'raindrop',
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
				description: 'Resource to consume',
			},
			...collectionOperations,
			...collectionFields,
			...raindropOperations,
			...raindropFields,
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
				return responseData.items.map((item: { title: string, _id: string }) => ({
					name: item.title,
					value: item._id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'collection') {

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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (!isEmpty(additionalFields)) {
						Object.assign(body, additionalFields);
					}

					if (additionalFields.cover) {
						body.cover = [body.cover];
					}

					responseData = await raindropApiRequest.call(this, 'POST', `/collection`, {}, body);
					responseData = responseData.item;

				} else if (operation === 'delete') {

					// ----------------------------------
					//        collection: delete
					// ----------------------------------

					const collectionId = this.getNodeParameter('collectionId', i);
					const endpoint = `/collection/${collectionId}`;
					responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

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

					const endpoint = this.getNodeParameter('type', i) === 'parent'
					 ? '/collections'
					 : '/collections/childrens';

					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.items;

				} else if (operation === 'update') {

					// ----------------------------------
					//        collection: update
					// ----------------------------------

					const collectionId = this.getNodeParameter('collectionId', i);

					const body = {} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					Object.assign(body, omit(updateFields, 'binaryPropertyName'));

					const endpoint = `/collection/${collectionId}`;
					responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
					responseData = responseData.item;

					// cover-specific endpoint

					if (updateFields.cover) {

						if (!items[i].binary) {
							throw new Error('No binary data exists on item!');
						}

						if (!updateFields.binaryPropertyName) {
							throw new Error('Please enter a binary property to upload a cover image.');
						}

						const binaryPropertyName = updateFields.binaryPropertyName as string;

						const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;

						const formData = {
							cover: {
								value: Buffer.from(binaryData.data, BINARY_ENCODING),
								options: {
									filename: binaryData.fileName,
									contentType: binaryData.mimeType,
								},
							},
						};

						const endpoint = `/collection/${collectionId}/cover`;
						responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, {}, { 'Content-Type': 'multipart/form-data', formData });
						responseData = responseData.item;
					}

				}

			} else if (resource === 'raindrop') {

				// *********************************************************************
				//                              raindrop
				// *********************************************************************

				// https://developer.raindrop.io/v1/raindrops

				if (operation === 'create') {

					// ----------------------------------
					//         raindrop: create
					// ----------------------------------

					const body = {
						link: this.getNodeParameter('link', i),
					};

					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (!isEmpty(additionalFields)) {
						Object.assign(body, additionalFields);
					}

					const endpoint = `/raindrop`;
					responseData = await raindropApiRequest.call(this, 'POST', endpoint, {}, body);
					responseData = responseData.item;

				} else if (operation === 'delete') {

					// ----------------------------------
					//         raindrop: delete
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i);
					const endpoint = `/raindrop/${raindropId}`;
					responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//         raindrop: get
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i);
					const endpoint = `/raindrop/${raindropId}`;
					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.item;

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         raindrop: getAll
					// ----------------------------------

					const collectionId = this.getNodeParameter('collectionId', i);
					const endpoint = `/raindrops/${collectionId}`;
					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.items;

				} else if (operation === 'update') {

					// ----------------------------------
					//         raindrop: update
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i);

					const body = {} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					Object.assign(body, omit(updateFields, 'binaryPropertyName'));

					const endpoint = `/raindrop/${raindropId}`;
					responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
					responseData = responseData.item;

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

					if (!self) {
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

					let endpoint = `/tags`;

					const filter = this.getNodeParameter('filters', i) as IDataObject;

					if (filter.collectionId) {
						endpoint += `/${filter.collectionId}`;
					}

					responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'getAll') {

					// ----------------------------------
					//           tag: getAll
					// ----------------------------------

					let endpoint = `/tags`;

					const filter = this.getNodeParameter('filters', i) as IDataObject;

					if (filter.collectionId) {
						endpoint += `/${filter.collectionId}`;
					}

					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'suggest') {

					// ----------------------------------
					//          tag: suggest
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i) as IDataObject;
					const endpoint = `tags/suggest/${raindropId}`;
					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//          tag: update
					// ----------------------------------

					let endpoint = '/tags';

					const body = {
						replace: this.getNodeParameter('newTagName', i),
					};

					const filter = this.getNodeParameter('filters', i) as IDataObject;

					if (filter.collectionId) {
						endpoint += `/${filter.collectionId}`;
					}

					responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
