import type { INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

import { platformProperties } from './hosts';

export const API_CLIENT_CREDENTIAL = 'qualysApiClientApi';
export const BASIC_AUTH_CREDENTIAL = 'qualysApi';

/** The node's Authentication field picks one of these. */
export const qualysCredentials: INodeCredentialDescription[] = [
	{
		name: API_CLIENT_CREDENTIAL,
		required: true,
		displayOptions: { show: { authentication: ['apiClient'] } },
	},
	{
		name: BASIC_AUTH_CREDENTIAL,
		required: true,
		displayOptions: { show: { authentication: ['basicAuth'] } },
	},
];

export const authenticationProperties: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'API Client',
				value: 'apiClient',
				description: 'Client ID and secret. CyberSecurity Asset Management does not accept it yet.',
			},
			{
				name: 'Username and Password',
				value: 'basicAuth',
				description: 'Works with every Qualys API',
			},
		],
		default: 'apiClient',
	},
	// The username and password credential has no host field.
	...platformProperties({ authentication: ['basicAuth'] }),
];
