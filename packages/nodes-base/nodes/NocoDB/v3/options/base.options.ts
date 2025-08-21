import { INodeProperties } from 'n8n-workflow';

const _baseOptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many bases',
				action: 'Get many bases',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve one base',
				action: 'Get one base',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getWorkspaces',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'wi0qdp7n',
			},
		],
	},
	{
		displayName: 'Base Name or ID',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['workspaceId.value'],
		},
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBases',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'p979g1063032uw4',
			},
		],
	},
];

export const BaseOptions: INodeProperties[] = _baseOptions.map((k) => {
	return {
		...k,
		displayOptions: {
			...k.displayOptions,
			show: {
				...k.displayOptions?.show,
				resource: ['base'],
			},
		},
	};
});
