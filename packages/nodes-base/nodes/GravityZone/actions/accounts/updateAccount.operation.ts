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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-125285-updateaccount.html" target="_blank" rel="noopener noreferrer">Update Account</a>',
		name: 'updateAccountDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the account to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Authentication Method',
				name: 'authenticationMethod',
				type: 'options',
				default: 0,
				options: [
					{
						name: 'GravityZone Credentials',
						value: 0,
					},
					{
						name: 'Identity Provider',
						value: 1,
					},
					{
						name: 'GravityZone Identity Provider',
						value: 2,
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The new email address for the account',
				placeholder: 'user@example.com',
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				default: '',
				description: 'The full name of the user',
			},
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
				description: 'The new password for the account',
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
		],
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['updateAccount'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const accountId = this.getNodeParameter('accountId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {});

	const params: IDataObject = { accountId };

	if (updateFields.email) params.email = updateFields.email;
	if (updateFields.authenticationMethod !== undefined)
		params.authenticationMethod = updateFields.authenticationMethod;
	if (updateFields.password) params.password = updateFields.password;
	if (updateFields.role !== undefined) params.role = updateFields.role;
	if (updateFields.fullName ?? updateFields.timezone ?? updateFields.language) {
		const profile: IDataObject = {};

		if (updateFields.fullName) profile.fullName = updateFields.fullName;
		if (updateFields.timezone) profile.timezone = updateFields.timezone;
		if (updateFields.language) profile.language = updateFields.language;

		params.profile = profile;
	}
	if (updateFields.phoneNumberJson !== undefined) {
		const phoneNumber = processJsonInput(
			updateFields.phoneNumberJson,
			'Phone Number',
		) as IDataObject;
		if (Object.keys(phoneNumber).length > 0) params.phoneNumber = phoneNumber;
	}
	if (updateFields.rightsJson !== undefined) {
		const rights = processJsonInput(updateFields.rightsJson, 'Rights') as IDataObject;
		if (Object.keys(rights).length > 0) params.rights = rights;
	}
	if (updateFields.targetIds) {
		const targetIdsStr = updateFields.targetIds as string;
		params.targetIds = targetIdsStr
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
	}

	const responseData = await gravityZoneApiRequest.call(this, 'accounts', 'updateAccount', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
