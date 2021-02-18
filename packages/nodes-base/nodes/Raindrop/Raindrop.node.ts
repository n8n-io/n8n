import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	isEmpty,
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

			// async getCustomFields(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'preferences');
			// },

			// async getItems(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'item');
			// },

			// async getVendors(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'vendor');
			// },
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
					};

					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (!isEmpty(additionalFields)) {
						Object.assign(body, additionalFields);
					}

					const endpoint = `/collection`;
					responseData = await raindropApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//        collection: delete
					// ----------------------------------

					const endpoint = `/collection`;
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

					const body = {
						id: collectionId,
					};

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (!isEmpty(updateFields)) {
						Object.assign(body, updateFields);
					}

					if (updateFields.cover) {
						const endpoint = `/collection/${collectionId}/cover`;
						// TODO
						// 'Content-Type': 'multipart/form-data'
						//  formData: body
						responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
					} else {
						const endpoint = '/collection';
						responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);
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

				} else if (operation === 'delete') {

					// ----------------------------------
					//         raindrop: delete
					// ----------------------------------

					const endpoint = `/raindrop`;
					responseData = await raindropApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//         raindrop: get
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i);
					const endpoint = `/raindrop/${raindropId}`;
					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         raindrop: getAll
					// ----------------------------------

					const collectionId = this.getNodeParameter('collectionId', i);
					const endpoint = `/raindrops/${collectionId}`;
					responseData = await raindropApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//         raindrop: update
					// ----------------------------------

					const raindropId = this.getNodeParameter('raindropId', i);

					const body = {
						id: raindropId,
					};

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (!isEmpty(updateFields)) {
						Object.assign(body, updateFields);
					}

					const endpoint = '/raindrop';
					responseData = await raindropApiRequest.call(this, 'PUT', endpoint, {}, body);

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
