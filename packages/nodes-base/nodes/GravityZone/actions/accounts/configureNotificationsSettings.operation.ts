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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-125286-configurenotificationssettings.html" target="_blank" rel="noopener noreferrer">Configure Notifications Settings</a>',
		name: 'configureNotificationsSettingsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				default: '',
				description:
					'The ID of the account to configure notification settings for. If not provided, settings are applied to the account that generated the API key.',
			},
			{
				displayName: 'Delete After',
				name: 'deleteAfter',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 365,
				},
				default: 30,
				description:
					'The number of days after which the generated notifications will be automatically deleted',
			},
			{
				displayName: 'Email Addresses',
				name: 'emailAddresses',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of additional email addresses to be used when sending notifications (e.g. "user1@example.com, user2@example.com")',
			},
			{
				displayName: 'Include Device FQDN',
				name: 'includeDeviceFQDN',
				type: 'boolean',
				default: false,
				description:
					'Whether the Fully Qualified Domain Name (FQDN) will be included in the notification sent by email, when available',
			},
			{
				displayName: 'Include Device Name',
				name: 'includeDeviceName',
				type: 'boolean',
				default: false,
				description:
					'Whether the device name will be included in the notification sent by email, when available',
			},
			{
				displayName: 'Notifications Settings (JSON)',
				name: 'notificationsSettingsJson',
				type: 'json',
				default: '[]',
				description: 'An array of notification setting objects',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Send Only Plain Text Email',
				name: 'sendOnlyPlainTextEmail',
				type: 'boolean',
				default: false,
				description:
					'Whether notification emails should be sent in plain text only or use HTML format',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['configureNotificationsSettings'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.accountId) params.accountId = options.accountId;
	if (options.deleteAfter !== undefined) params.deleteAfter = options.deleteAfter;
	if (options.includeDeviceName !== undefined) params.includeDeviceName = options.includeDeviceName;
	if (options.includeDeviceFQDN !== undefined) params.includeDeviceFQDN = options.includeDeviceFQDN;
	if (options.sendOnlyPlainTextEmail !== undefined)
		params.sendOnlyPlainTextEmail = options.sendOnlyPlainTextEmail;

	if (options.emailAddresses) {
		const emailAddressesStr = options.emailAddresses as string;
		params.emailAddresses = emailAddressesStr
			.split(',')
			.map((addr) => addr.trim())
			.filter(Boolean);
	}

	if (options.notificationsSettingsJson !== undefined) {
		const notificationsSettings = processJsonInput(
			options.notificationsSettingsJson,
			'Notifications Settings',
		) as IDataObject[];
		if (notificationsSettings.length > 0) {
			params.notificationsSettings = notificationsSettings;
		}
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'accounts',
		'configureNotificationsSettings',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
