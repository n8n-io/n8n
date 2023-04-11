import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Permissions',
		name: 'permissionsUi',
		placeholder: 'Add Permission',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: false,
		},
		options: [
			{
				displayName: 'Permission',
				name: 'permissionsValues',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'Commenter',
								value: 'commenter',
							},
							{
								name: 'File Organizer',
								value: 'fileOrganizer',
							},
							{
								name: 'Organizer',
								value: 'organizer',
							},
							{
								name: 'Owner',
								value: 'owner',
							},
							{
								name: 'Reader',
								value: 'reader',
							},
							{
								name: 'Writer',
								value: 'writer',
							},
						],
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'User',
								value: 'user',
							},
							{
								name: 'Group',
								value: 'group',
							},
							{
								name: 'Domain',
								value: 'domain',
							},
							{
								name: 'Anyone',
								value: 'anyone',
							},
						],
						default: '',
						description:
							'Information about the different types can be found <a href="https://developers.google.com/drive/api/v3/ref-roles">here</a>',
					},
					{
						displayName: 'Email Address',
						name: 'emailAddress',
						type: 'string',
						displayOptions: {
							show: {
								type: ['user', 'group'],
							},
						},
						default: '',
						description: 'The email address of the user or group to which this permission refers',
					},
					{
						displayName: 'Domain',
						name: 'domain',
						type: 'string',
						displayOptions: {
							show: {
								type: ['domain'],
							},
						},
						default: '',
						description: 'The domain to which this permission refers',
					},
					{
						displayName: 'Allow File Discovery',
						name: 'allowFileDiscovery',
						type: 'boolean',
						displayOptions: {
							show: {
								type: ['domain', 'anyone'],
							},
						},
						default: false,
						description: 'Whether the permission allows the file to be discovered through search',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['share'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
