import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class Mailcheck implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Mailcheck',
			name: 'mailcheck',
			icon: 'file:mailcheck.svg',
			group: ['transform'],
			version: 1,
			description: 'Verifies email address',
			defaults: {
					name: 'Mailcheck',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'mailcheckApi',
					required: true,
				},
			],
			properties: [
					// Node properties which the user gets displayed and
					// can change on the node.
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						required: true,
						default: '',
						description: 'Email address',
					},
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const items = this.getInputData();
			const credentials = this.getCredentials('mailcheckApi') as IDataObject;

			const returnData = [];

			for (let i = 0; i < items.length; i++) {
				const email = this.getNodeParameter('email', i) as string;

				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${credentials.apiKey}`,
					},
					method: 'POST',
					body: { email },
					uri: 'https://api.mailcheck.co/v1/singleEmail:check',
					json: true,
				};

				const responseData = await this.helpers.request(options);

				const trustRate = responseData.trustRate;
				const status = getEmailStatus(trustRate);

				returnData.push({ trustRate, status });
			}

			return [this.helpers.returnJsonArray(returnData)];
	}
}

enum EmailStatus {
	Valid = 'Valid',
	Risky = 'Risky',
	Invalid = 'Invalid',
}

function getEmailStatus(trustRate: number): EmailStatus {
	if (trustRate < 0 || trustRate > 100) {
		throw new Error('Wrong email trust rate.');
	}

	if (trustRate < 50) {
		return EmailStatus.Invalid;
	}

	if (trustRate < 80) {
		return EmailStatus.Risky;
	}

	return EmailStatus.Valid;
}
