import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140260-createrestorequarantineexchangeitemtask.html" target="_blank" rel="noopener noreferrer">Create Restore Quarantine Exchange Item Task</a>',
		name: 'createRestoreQuarantineExchangeItemTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Quarantine Items IDs',
		name: 'quarantineItemsIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of exchange quarantine item IDs to restore (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		description:
			'The username of an Exchange user. The username must include the domain name (e.g. "user@domain.com").',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description: 'The password of an Exchange user',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description:
					'The email address of the Exchange user. This parameter is necessary when the email address is different from the username.',
			},
			{
				displayName: 'EWS URL',
				name: 'ewsUrl',
				type: 'string',
				default: '',
				description:
					'The Exchange Web Services URL. The EWS URL is necessary when the Exchange Autodiscovery does not work.',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createRestoreQuarantineExchangeItemTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const username = this.getNodeParameter('username', i) as string;
	const password = this.getNodeParameter('password', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const quarantineItemsIdsRaw = this.getNodeParameter('quarantineItemsIds', i) as string;
	const quarantineItemsIds = quarantineItemsIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { quarantineItemsIds, username, password };

	if (options.email !== undefined && (options.email as string) !== '') params.email = options.email;
	if (options.ewsUrl !== undefined && (options.ewsUrl as string) !== '')
		params.ewsUrl = options.ewsUrl;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'quarantine/exchange',
		'createRestoreQuarantineExchangeItemTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
