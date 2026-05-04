import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1002922-createresponseaction.html" target="_blank" rel="noopener noreferrer">Create Response Action</a>',
		name: 'createResponseActionDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Action Type',
		name: 'actionType',
		type: 'options',
		required: true,
		default: 1,
		options: [
			{ name: 'Reset Credentials (Office 365 / Entra ID)', value: 1 },
			{ name: 'Reset Credentials (Active Directory)', value: 2 },
			{ name: 'Disable User (Office 365 / Entra ID)', value: 3 },
			{ name: 'Disable User (Active Directory)', value: 4 },
			{ name: 'Mark as Compromised (Office 365 / Entra ID)', value: 5 },
			{ name: 'Delete Email (Office 365)', value: 6 },
			{ name: 'Disable User (Google)', value: 8 },
			{ name: 'Reset Credentials (Google)', value: 9 },
			{ name: 'Delete File (OneDrive / SharePoint)', value: 10 },
			{ name: 'Delete Similar Emails (Office 365)', value: 11 },
			{ name: 'Disable User (AWS)', value: 12 },
		],
		description: 'The type of action to be taken and the environment it will be applied to',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Incident ID',
				name: 'incidentId',
				type: 'string',
				default: '',
				description:
					'The ID of the incident to which the user nodes belong. Either the incident ID or the integration identifiers must be included.',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description:
					'The username involved in the event. Required for most action types. Must be a valid email for types "Reset Credentials (Office 365 / Entra ID)", "Disable User (Office 365 / Entra ID)", "Mark as Compromised (Office 365 / Entra ID)", "Delete Email (Office 365)", "Disable User (Google)", "Reset Credentials (Google)", and "domain\\username" format for types "Reset Credentials (Active Directory)" and "Disable User (Active Directory)".',
			},
			{
				displayName: 'Email ID',
				name: 'emailId',
				type: 'string',
				default: '',
				description:
					'The email ID associated with the user node. Mandatory for type "Delete Email (Office 365)". For type "Delete Similar Emails (Office 365)", provide the ID of the reference email.',
			},
			{
				displayName: 'Integration Identifiers (JSON)',
				name: 'integrationIdentifiers',
				type: 'json',
				default: '{}',
				description:
					'An integration identifiers object. Either the incident ID or integration identifiers must be included.',
				typeOptions: { alwaysOpenEditWindow: true },
			},
			{
				displayName: 'Targets (JSON)',
				name: 'targets',
				type: 'json',
				default: '{}',
				description:
					'A targets object. For type "Delete Similar Emails (Office 365)", indicates which similar emails should be deleted. Mandatory when using integration identifiers.',
				typeOptions: { alwaysOpenEditWindow: true },
			},
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				default: '',
				description:
					'The URL of the file to be deleted. Mandatory for type "Delete File (OneDrive / SharePoint)".',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['incidents'], action: ['createResponseAction'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const actionType = this.getNodeParameter('actionType', i) as number;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { actionType };

	if (options.incidentId !== undefined && options.incidentId !== '')
		params.incidentId = options.incidentId;
	if (options.username !== undefined && options.username !== '') params.username = options.username;
	if (options.emailId !== undefined && options.emailId !== '') params.emailId = options.emailId;
	if (options.fileUrl !== undefined && options.fileUrl !== '') params.fileUrl = options.fileUrl;
	if (options.integrationIdentifiers !== undefined) {
		const integrationIdentifiers = processJsonInput(
			options.integrationIdentifiers,
			'Integration Identifiers',
		) as IDataObject;
		if (Object.keys(integrationIdentifiers).length > 0)
			params.integrationIdentifiers = integrationIdentifiers;
	}
	if (options.targets !== undefined) {
		const targets = processJsonInput(options.targets, 'Targets') as IDataObject;
		if (Object.keys(targets).length > 0) params.targets = targets;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'createResponseAction',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
