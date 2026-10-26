import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	PreSendAction,
} from 'n8n-workflow';

const prepareAddUserToProjectBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userId = this.getNodeParameter('userId') as string;
	const role = this.getNodeParameter('role') as string;

	requestOptions.body = {
		relations: [{ userId, role }],
	};

	return requestOptions;
};

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'addUser',
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Add User',
				value: 'addUser',
				action: 'Add a user to a project',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ toPathSegment($parameter.projectId) }}/users',
					},
					send: {
						preSend: [prepareAddUserToProjectBody],
					},
					output: {
						// The API returns an empty body on success
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
			},
		],
	},
];

const addUserOperation: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['addUser'],
			},
		},
		description: 'ID of the project to add the user to',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['addUser'],
			},
		},
		description: 'ID of the user to add to the project',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'options',
		default: 'project:viewer',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['addUser'],
			},
		},
		options: [
			{
				name: 'Admin',
				value: 'project:admin',
			},
			{
				name: 'Editor',
				value: 'project:editor',
			},
			{
				name: 'Viewer',
				value: 'project:viewer',
			},
		],
		description:
			'Role to assign to the user in the project. To use a custom project role, set this field to an expression that returns the role slug.',
	},
];

export const projectFields: INodeProperties[] = [...addUserOperation];
