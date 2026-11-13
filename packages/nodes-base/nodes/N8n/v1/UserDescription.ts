import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

async function handleGetUserErrors(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode >= 200 && response.statusCode < 300) {
		return data;
	}

	if (response.statusCode === 404) {
		const userId = this.getNodeParameter('userId') as string;
		throw new NodeOperationError(this.getNode(), `User not found: ${userId}`, {
			description: 'Check that the user ID or email exists on this n8n instance',
		});
	}

	throw new NodeApiError(this.getNode(), response.body as JsonObject, {
		message: response.statusMessage,
		httpCode: response.statusCode.toString(),
	});
}

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Get a user by ID or email. Only the instance owner can use this operation.',
				routing: {
					request: {
						method: 'GET',
						url: '=/users/{{ toPathSegment($parameter.userId) }}',
						qs: {
							includeRole: '={{ $parameter.includeRole }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleGetUserErrors],
					},
				},
			},
		],
	},
];

const getUserOperation: INodeProperties[] = [
	{
		displayName: 'User ID or Email',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		description: 'ID or email of the user to get',
	},
	{
		displayName: 'Include Role',
		name: 'includeRole',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		description: "Whether to include the user's global role in the output",
	},
];

export const userFields: INodeProperties[] = [...getUserOperation];
