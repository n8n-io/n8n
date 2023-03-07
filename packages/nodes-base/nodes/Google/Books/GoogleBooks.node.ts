import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

export class GoogleBooks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Books',
		name: 'googleBooks',
		icon: 'file:googlebooks.svg',
		group: ['input', 'output'],
		version: [1, 2],
		description: 'Read data from Google Books',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Google Books',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleBooksOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Bookshelf',
						value: 'bookshelf',
					},
					{
						name: 'Bookshelf Volume',
						value: 'bookshelfVolume',
					},
					{
						name: 'Volume',
						value: 'volume',
					},
				],
				default: 'bookshelf',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a specific bookshelf resource for the specified user',
						action: 'Get a bookshelf',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many public bookshelf resource for the specified user',
						action: 'Get many bookshelves',
					},
				],
				displayOptions: {
					show: {
						resource: ['bookshelf'],
					},
				},
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a volume to a bookshelf',
						action: 'Add a bookshelf volume',
					},
					{
						name: 'Clear',
						value: 'clear',
						description: 'Clears all volumes from a bookshelf',
						action: 'Clear a bookshelf volume',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many volumes in a specific bookshelf for the specified user',
						action: 'Get many bookshelf volumes',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Moves a volume within a bookshelf',
						action: 'Move a bookshelf volume',
					},
					{
						name: 'Remove',
						value: 'remove',
						description: 'Removes a volume from a bookshelf',
						action: 'Remove a bookshelf volume',
					},
				],
				displayOptions: {
					show: {
						resource: ['bookshelfVolume'],
					},
				},
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a volume resource based on ID',
						action: 'Get a volume',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many volumes filtered by query',
						action: 'Get many volumes',
					},
				],
				displayOptions: {
					show: {
						resource: ['volume'],
					},
				},
				default: 'get',
			},
			{
				displayName: 'My Library',
				name: 'myLibrary',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'getAll'],
						resource: ['bookshelf', 'bookshelfVolume'],
					},
				},
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				description: 'Full-text search query string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['volume'],
					},
				},
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				description: 'ID of user',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'getAll'],
						resource: ['bookshelf', 'bookshelfVolume'],
					},
					hide: {
						myLibrary: [true],
					},
				},
			},
			{
				displayName: 'Bookshelf ID',
				name: 'shelfId',
				type: 'string',
				description: 'ID of the bookshelf',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'add', 'clear', 'move', 'remove'],
						resource: ['bookshelf', 'bookshelfVolume'],
					},
				},
			},
			{
				displayName: 'Bookshelf ID',
				name: 'shelfId',
				type: 'string',
				description: 'ID of the bookshelf',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['bookshelfVolume'],
					},
				},
			},
			{
				displayName: 'Volume ID',
				name: 'volumeId',
				type: 'string',
				description: 'ID of the volume',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['add', 'move', 'remove', 'get'],
						resource: ['bookshelfVolume', 'volume'],
					},
				},
			},
			{
				displayName: 'Volume Position',
				name: 'volumePosition',
				type: 'string',
				description:
					'Position on shelf to move the item (0 puts the item before the current first item, 1 puts it between the first and the second and so on)',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['bookshelfVolume'],
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 40,
				},
				default: 40,
				description: 'Max number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const qs: IDataObject = {};
		let responseData;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'volume') {
					if (operation === 'get') {
						const volumeId = this.getNodeParameter('volumeId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `v1/volumes/${volumeId}`, {});
					} else if (operation === 'getAll') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`v1/volumes?q=${searchQuery}`,
								{},
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`v1/volumes?q=${searchQuery}`,
								{},
								qs,
							);
							responseData = responseData.items || [];
						}
					}
				}

				if (resource === 'bookshelf') {
					if (operation === 'get') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						const myLibrary = this.getNodeParameter('myLibrary', i) as boolean;
						let endpoint;
						if (!myLibrary) {
							const userId = this.getNodeParameter('userId', i) as string;
							endpoint = `v1/users/${userId}/bookshelves/${shelfId}`;
						} else {
							endpoint = `v1/mylibrary/bookshelves/${shelfId}`;
						}

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {});
					} else if (operation === 'getAll') {
						const myLibrary = this.getNodeParameter('myLibrary', i) as boolean;
						const returnAll = this.getNodeParameter('returnAll', i);
						let endpoint;
						if (!myLibrary) {
							const userId = this.getNodeParameter('userId', i) as string;
							endpoint = `v1/users/${userId}/bookshelves`;
						} else {
							endpoint = 'v1/mylibrary/bookshelves';
						}
						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								endpoint,
								{},
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items || [];
						}
					}
				}

				if (resource === 'bookshelfVolume') {
					if (operation === 'add') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						const volumeId = this.getNodeParameter('volumeId', i) as string;
						const body: IDataObject = {
							volumeId,
						};
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`v1/mylibrary/bookshelves/${shelfId}/addVolume`,
							body,
						);
					}

					if (operation === 'clear') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`v1/mylibrary/bookshelves/${shelfId}/clearVolumes`,
						);
					}

					if (operation === 'getAll') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const myLibrary = this.getNodeParameter('myLibrary', i) as boolean;
						let endpoint;
						if (!myLibrary) {
							const userId = this.getNodeParameter('userId', i) as string;
							endpoint = `v1/users/${userId}/bookshelves/${shelfId}/volumes`;
						} else {
							endpoint = `v1/mylibrary/bookshelves/${shelfId}/volumes`;
						}
						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								endpoint,
								{},
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items || [];
						}
					}

					if (operation === 'move') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						const volumeId = this.getNodeParameter('volumeId', i) as string;
						const volumePosition = this.getNodeParameter('volumePosition', i) as number;
						const body: IDataObject = {
							volumeId,
							volumePosition,
						};
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`v1/mylibrary/bookshelves/${shelfId}/moveVolume`,
							body,
						);
					}

					if (operation === 'remove') {
						const shelfId = this.getNodeParameter('shelfId', i) as string;
						const volumeId = this.getNodeParameter('volumeId', i) as string;
						const body: IDataObject = {
							volumeId,
						};
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`v1/mylibrary/bookshelves/${shelfId}/removeVolume`,
							body,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
