import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class OAuth implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OAuth',
		name: 'oauth',
		icon: 'fa:code-branch',
		group: ['input'],
		version: 1,
		description: 'Gets, sends data to Oauth API Endpoint and receives generic information.',
		defaults: {
			name: 'OAuth',
			color: '#0033AA',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oAuth2Api',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Returns the OAuth token data.',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},

		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('oAuth2Api');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		if (credentials.oauthTokenData === undefined) {
			throw new Error('OAuth credentials not connected');
		}

		const operation = this.getNodeParameter('operation', 0) as string;
		if (operation === 'get') {
			// credentials.oauthTokenData has the refreshToken and accessToken available
			// it would be nice to have credentials.getOAuthToken() which returns the accessToken
			// and also handles an error case where if the token is to be refreshed, it does so
			// without knowledge of the node.

			return [this.helpers.returnJsonArray(JSON.parse(credentials.oauthTokenData as string))];
		} else {
			throw new Error('Unknown operation');
		}
	}
}
