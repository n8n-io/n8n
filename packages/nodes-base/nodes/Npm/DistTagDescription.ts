import type { INodeProperties } from 'n8n-workflow';

export const distTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getMany',
		displayOptions: {
			show: {
				resource: ['distTag'],
			},
		},

		options: [
			{
				name: 'Get All',
				value: 'getMany',
				action: 'Returns all the dist-tags for a package',
				description: 'Returns all the dist-tags for a package',
				routing: {
					request: {
						method: 'GET',
						url: '=/-/package/{{ encodeURIComponent($parameter.packageName) }}/dist-tags',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a the dist-tags for a package',
				description: 'Update a the dist-tags for a package',
				routing: {
					request: {
						method: 'PUT',
						url: '=/-/package/{{ encodeURIComponent($parameter.packageName) }}/dist-tags/{{ encodeURIComponent($parameter.distTagName) }}',
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								requestOptions.headers!['content-type'] = 'application/x-www-form-urlencoded';
								requestOptions.body = this.getNodeParameter('packageVersion');
								return requestOptions;
							},
						],
					},
				},
			},
		],
	},
];

export const distTagFields: INodeProperties[] = [
	{
		displayName: 'Package Name',
		name: 'packageName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['distTag'],
				operation: ['getMany', 'update'],
			},
		},
	},
	{
		displayName: 'Package Version',
		name: 'packageVersion',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['distTag'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Distribution Tag Name',
		name: 'distTagName',
		type: 'string',
		required: true,
		default: 'latest',
		displayOptions: {
			show: {
				resource: ['distTag'],
				operation: ['update'],
			},
		},
	},
];
