
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
} from './GenericFunctions';

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
		version: 1,
		description: 'Read data from Google Books',
		defaults: {
			name: 'Google Books',
			color: '#0aa55c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'googleBooksOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
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
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Bookshelf',
						value: 'bookshelf',
						description: 'This resource allows you to view bookshelf metadata as well as to modify the contents of a bookshelf',
					},
					{
						name: 'My Library',
						value: 'library',
						description: 'This resource allows you to view and modify the contents of an authenticated users own bookshelf',
					},
					{
						name: 'Volume',
						value: 'volume',
						description: 'This resource is used to perform a search or listing the contents of a bookshelf and to retrieve volumes from another users public bookshelves',
					},
				],
				default: 'bookshelf',
				description: 'The resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get',
						value: 'getShelf',
						description: 'Retrieve a specific bookshelf resource for the specified user',
					},
					{
						name: 'List',
						value: 'listShelves',
						description: 'Retrieve a list of public bookshelf resource for the specified user',
					},
					{
						name: 'Get volumes',
						value: 'getVolumes',
						description: 'Retrieve volumes in a specific bookshelf for the specified user',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'bookshelf',
						],
					},
				},
				default: 'getShelf',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Add Volume',
						value: 'addVolume',
						description: 'Adds a volume to a bookshelf',
					},
					{
						name: 'Clear Volumes',
						value: 'clearVolumes',
						description: 'Clear all volumes from a bookshelf',
					},
					{
						name: 'Get',
						value: 'getMyShelf',
						description: 'Retrieve metadata for a specific bookshelf belonging to the authenticated user',
					},
					{
						name: 'List',
						value: 'listMyShelves',
						description: 'Retrieve a list of bookshelves belonging to the authenticated user',
					},
					{
						name: 'Move Volume',
						value: 'moveVolume',
						description: 'Move a volume within a bookshelf',
					},
					{
						name: 'Remove Volume',
						value: 'removeVolume',
						description: 'Remove a volume from a bookshelf',
					},
					{
						name: 'List Volumes',
						value: 'listVolumes',
						description: 'Get volume information for volumes on a bookshelf',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'library',
						],
					},
				},
				default: 'addVolume',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get',
						value: 'getVolume',
						description: 'Retrieve a Volume resource based on ID',
					},
					{
						name: 'List',
						value: 'bookSearch',
						description: 'Perform a book search',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'volume',
						],
					},
				},
				default: 'getVolume',
				description: 'The operation to perform',
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
						operation: [
							'bookSearch',
						],
						resource: [
							'volume',
						],
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
						operation: [
							'getShelf',
							'listShelves',
							'getVolumes',
						],
						resource: [
							'bookshelf',
						],
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
						operation: [
							'getShelf',
							'getVolumes',
							'addVolume',
							'clearVolumes',
							'getMyShelf',
							'moveVolume',
							'removeVolume',
							'listVolumes',
						],
						resource: [
							'bookshelf',
							'library',
						],
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
						operation: [
							'getVolume',
							'addVolume',
							'moveVolume',
							'removeVolume',
						],
						resource: [
							'bookshelf',
							'library',
							'volume',
						],
					},
				},
			},
			{
				displayName: 'Volume Position',
				name: 'volumePosition',
				type: 'string',
				description: 'Position on shelf to move the item (0 puts the item before the current first item, 1 puts it between the first and the second and so on) ',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'moveVolume',
						],
						resource: [
							'library',
						],
					},
				},
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];

		for (let i=0; i < length; i++) {
			if (resource === 'volume') {
				if (operation === 'getVolume') {
					const volumeId = this.getNodeParameter('volumeId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/volumes/${volumeId}`, {});
					responseData.push(response);
		 		} else if (operation === 'bookSearch') {
					const searchQuery = this.getNodeParameter('searchQuery', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/volumes?q=${searchQuery}`, {});
					responseData.push(response);
				 }
			} else if (resource === 'bookshelf') {
				if (operation === 'getShelf') {
					const userId = this.getNodeParameter('userId', i) as string;
					const shelfId = this.getNodeParameter('shelfId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/users/${userId}/bookshelves/${shelfId}`, {});
					responseData.push(response);
				} else if (operation === 'listShelves') {
					const userId = this.getNodeParameter('userId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/users/${userId}/bookshelves`, {});
					responseData.push(response);	
				} else if (operation === 'getVolumes') {
					const userId = this.getNodeParameter('userId', i) as string;
					const shelfId = this.getNodeParameter('shelfId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/users/${userId}/bookshelves/${shelfId}/volumes`, {});
					responseData.push(response);	
				}
			} else if (resource === 'library') {
				if (operation === 'addVolume') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;
					const volumeId = this.getNodeParameter('volumeId', i) as string;

					const response = await googleApiRequest.call(this, 'POST', `v1/mylibrary/bookshelves/${shelfId}/addVolume`, {volumeId});
					responseData.push(response);	
				} else if (operation === 'clearVolumes') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;

					const response = await googleApiRequest.call(this, 'POST', `v1/mylibrary/bookshelves/${shelfId}/clearVolumes`, {});
					responseData.push(response);
				} else if (operation === 'getMyShelf') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/mylibrary/bookshelves/${shelfId}`, {});
					responseData.push(response);
				} else if (operation === 'listMyShelves') {
					const response = await googleApiRequest.call(this, 'GET', `v1/mylibrary/bookshelves`, {});
					responseData.push(response);
				} else if (operation === 'moveVolume') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;
					const volumeId = this.getNodeParameter('volumeId', i) as string;
					const volumePosition = this.getNodeParameter('volumePosition', i) as string;

					const response = await googleApiRequest.call(this, 'POST', `v1/mylibrary/bookshelves/${shelfId}/moveVolume`, {shelfId, volumeId, volumePosition});
					responseData.push(response);
				} else if (operation === 'removeVolume') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;
					const volumeId = this.getNodeParameter('volumeId', i) as string;

					const response = await googleApiRequest.call(this, 'POST', `v1/mylibrary/bookshelves/${shelfId}/removeVolume`, {shelfId, volumeId});
					responseData.push(response);	
				} else if (operation === 'listVolumes') {
					const shelfId = this.getNodeParameter('shelfId', i) as string;

					const response = await googleApiRequest.call(this, 'GET', `v1/mylibrary/bookshelves/${shelfId}/volumes`, {});
					responseData.push(response);
				}
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
