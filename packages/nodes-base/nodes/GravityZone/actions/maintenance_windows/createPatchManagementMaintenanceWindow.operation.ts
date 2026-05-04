import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type IDataObject,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140027-createpatchmanagementmaintenancewindow.html" target="_blank" rel="noopener noreferrer">Create Patch Management Maintenance Window</a>',
		name: 'createPatchManagementMaintenanceWindowDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the maintenance window',
	},
	{
		displayName: 'Allow Change by Other Users',
		name: 'allowChangeByOtherUsers',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether users other than the owner can modify this maintenance window',
	},
	{
		displayName: 'Settings (JSON)',
		name: 'settings',
		type: 'json',
		required: true,
		default: '{}',
		description: 'A settings object',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
];

const displayOptions = {
	show: {
		category: ['maintenance_windows'],
		action: ['createPatchManagementMaintenanceWindow'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', i) as string;
	const allowChangeByOtherUsers = this.getNodeParameter('allowChangeByOtherUsers', i) as boolean;
	const settings = processJsonInput(
		this.getNodeParameter('settings', i),
		'Settings',
	) as IDataObject;

	const params: IDataObject = {
		name,
		allowChangeByOtherUsers,
		settings,
	};

	const responseData = await gravityZoneApiRequest.call(
		this,
		'maintenanceWindows',
		'createPatchManagementMaintenanceWindow',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
