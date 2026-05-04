import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-539366-generateemailverificationcode.html" target="_blank" rel="noopener noreferrer">Generate Email Verification Code</a>',
		name: 'generateEmailVerificationCodeDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@example.com',
		required: true,
		default: '',
		description: 'The email address where the verification code will be sent',
	},
	{
		displayName: 'Purpose',
		name: 'purpose',
		type: 'options',
		required: true,
		default: 1,
		options: [
			{
				name: 'Confirm MDR Contact Information',
				value: 1,
			},
		],
		description: 'The purpose of the verification code',
	},
];

const displayOptions = {
	show: { category: ['general'], action: ['generateEmailVerificationCode'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const email = this.getNodeParameter('email', i) as string;
	const purpose = this.getNodeParameter('purpose', i) as number;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'general',
		'generateEmailVerificationCode',
		{ email, purpose },
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
