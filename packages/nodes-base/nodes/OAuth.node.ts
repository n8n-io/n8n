import { OptionsWithUri } from 'request';

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
					{
						name: 'Request',
						value: 'request',
						description: 'Make an OAuth signed requ.',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Request Method',
				name: 'requestMethod',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'request',
						],
					},
				},
				options: [
					{
						name: 'DELETE',
						value: 'DELETE'
					},
					{
						name: 'GET',
						value: 'GET'
					},
					{
						name: 'HEAD',
						value: 'HEAD'
					},
					{
						name: 'PATCH',
						value: 'PATCH'
					},
					{
						name: 'POST',
						value: 'POST'
					},
					{
						name: 'PUT',
						value: 'PUT'
					},
				],
				default: 'GET',
				description: 'The request method to use.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'request',
						],
					},
				},
				default: '',
				placeholder: 'http://example.com/index.html',
				description: 'The URL to make the request to.',
				required: true,
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
		} else if (operation === 'request') {
			const url = this.getNodeParameter('url', 0) as string;
			const requestMethod = this.getNodeParameter('requestMethod', 0) as string;

			// Authorization Code Grant
			const requestOptions: OptionsWithUri = {
				headers: {
					'User-Agent': 'some-user',
				},
				method: requestMethod,
				uri: url,
				json: true,
			};

			const responseData = await this.helpers.requestOAuth.call(this, 'oAuth2Api', requestOptions);
			return [this.helpers.returnJsonArray(responseData)];
		} else {
			throw new Error('Unknown operation');
		}
	}
}
