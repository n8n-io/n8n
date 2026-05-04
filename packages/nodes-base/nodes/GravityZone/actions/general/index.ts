import type { INodeProperties } from 'n8n-workflow';

import * as generateEmailVerificationCode from './generateEmailVerificationCode.operation';
import * as getApiKeyDetails from './getApiKeyDetails.operation';

export { generateEmailVerificationCode, getApiKeyDetails };

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['general'] } },
		options: [
			{
				name: 'Generate Email Verification Code',
				value: 'generateEmailVerificationCode',
				action: 'Send a verification code to an email address',
			},
			{
				name: 'Get API Key Details',
				value: 'getApiKeyDetails',
				action: 'Get details about the current API key',
			},
		],
		default: 'getApiKeyDetails',
	},
	...generateEmailVerificationCode.description,
	...getApiKeyDetails.description,
];
