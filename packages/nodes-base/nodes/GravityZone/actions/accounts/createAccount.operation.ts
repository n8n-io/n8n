import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-125284-createaccount.html" target="_blank" rel="noopener noreferrer">Create Account</a>',
		name: 'createAccountDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		description: 'The corresponding email address for the new account',
		placeholder: 'user@example.com',
	},
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		description: 'The full name of the user',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'The language displayed in the GravityZone console (e.g. "en_US")',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Password for the account. If omitted, a password will be generated and sent by email to the user.',
			},
			{
				displayName: 'Phone Number (JSON)',
				name: 'phoneNumberJson',
				type: 'json',
				default: '{}',
				description: 'A phone number object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Rights (JSON)',
				name: 'rightsJson',
				type: 'json',
				default: '{}',
				description: 'A corresponding rights object. Only used when the role is set to custom.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Company Administrator',
						value: 1,
					},
					{
						name: 'Network Administrator',
						value: 2,
					},
					{
						name: 'Reporter',
						value: 3,
					},
					{
						name: 'Custom',
						value: 5,
					},
				],
				description: 'The role for the account',
			},
			{
				displayName: 'Target IDs',
				name: 'targetIds',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of target IDs representing the targets to be managed by the user account (e.g. "1234567890, 1234567891, 1234567892")',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: 'The timezone of the user (e.g. "Europe/Bucharest")',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Number of items per page',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['createAccount'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const email = this.getNodeParameter('email', i) as string;
	const fullName = this.getNodeParameter('fullName', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {});

	const profile: IDataObject = { fullName };

	if (additionalFields.timezone) profile.timezone = additionalFields.timezone;
	if (additionalFields.language) profile.language = additionalFields.language;

	const params: IDataObject = { email, profile };

	if (additionalFields.password) params.password = additionalFields.password;
	if (additionalFields.role !== undefined) params.role = additionalFields.role;
	if (additionalFields.phoneNumberJson !== undefined) {
		const phoneNumber = processJsonInput(
			additionalFields.phoneNumberJson,
			'Phone Number',
		) as IDataObject;
		if (Object.keys(phoneNumber).length > 0) params.phoneNumber = phoneNumber;
	}
	if (additionalFields.rightsJson !== undefined) {
		const rights = processJsonInput(additionalFields.rightsJson, 'Rights') as IDataObject;
		if (Object.keys(rights).length > 0) params.rights = rights;
	}
	if (additionalFields.targetIds) {
		const targetIdsStr = additionalFields.targetIds as string;
		params.targetIds = targetIdsStr
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
	}
	if (additionalFields.page !== undefined) params.page = additionalFields.page;
	if (additionalFields.perPage !== undefined) params.perPage = additionalFields.perPage;

	const responseData = await gravityZoneApiRequest.call(this, 'accounts', 'createAccount', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
