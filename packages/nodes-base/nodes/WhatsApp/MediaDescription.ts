import type { INodeProperties } from 'n8n-workflow';

import { setupUpload } from './MediaFunctions';

export const mediaFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Upload',
				value: 'mediaUpload',
				action: 'Upload media',
			},
			{
				name: 'Download',
				value: 'mediaUrlGet',
				action: 'Download media',
			},
			{
				name: 'Delete',
				value: 'mediaDelete',
				action: 'Delete media',
			},
		],
		default: 'mediaUpload',
		displayOptions: {
			show: {
				resource: ['media'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
		description: 'The operation to perform on the media',
	},
];

export const mediaTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         operation: mediaUpload
	// ----------------------------------
	{
		displayName: 'Sender Phone Number (or ID)',
		name: 'phoneNumberId',
		type: 'options',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						url: '={{$credentials.businessAccountId}}/phone_numbers',
						method: 'GET',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.display_phone_number}} - {{$responseItem.verified_name}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		default: '',
		placeholder: '',
		routing: {
			request: {
				method: 'POST',
				url: '={{$value}}/media',
			},
		},
		displayOptions: {
			show: {
				operation: ['mediaUpload'],
				resource: ['media'],
			},
		},
		required: true,
		description: "The ID of the business account's phone number to store the media",
	},
	{
		displayName: 'Property Name',
		name: 'mediaPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['mediaUpload'],
				resource: ['media'],
			},
		},
		required: true,
		description: 'Name of the binary property which contains the data for the file to be uploaded',
		routing: {
			send: {
				preSend: [setupUpload],
			},
		},
	},
	// ----------------------------------
	//         type: mediaUrlGet
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaGetId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['mediaUrlGet'],
				resource: ['media'],
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '=/{{$value}}',
			},
		},
		required: true,
		description: 'The ID of the media',
	},
	// ----------------------------------
	//         type: mediaUrlGet
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaDeleteId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['mediaDelete'],
				resource: ['media'],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/{{$value}}',
			},
		},
		required: true,
		description: 'The ID of the media',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['mediaUpload'],
			},
		},
		options: [
			{
				displayName: 'Filename',
				name: 'mediaFileName',
				type: 'string',
				default: '',
				description: 'The name to use for the file',
			},
		],
	},
];
