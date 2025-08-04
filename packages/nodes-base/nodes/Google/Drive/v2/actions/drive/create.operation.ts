import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. New Shared Drive',
		description: 'The name of the shared drive to create',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Capabilities',
				name: 'capabilities',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Can Add Children',
						name: 'canAddChildren',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can add children to folders in this shared drive',
					},
					{
						displayName: 'Can Change Copy Requires Writer Permission Restriction',
						name: 'canChangeCopyRequiresWriterPermissionRestriction',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can change the copyRequiresWriterPermission restriction of this shared drive',
					},
					{
						displayName: 'Can Change Domain Users Only Restriction',
						name: 'canChangeDomainUsersOnlyRestriction',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can change the domainUsersOnly restriction of this shared drive',
					},
					{
						displayName: 'Can Change Drive Background',
						name: 'canChangeDriveBackground',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can change the background of this shared drive',
					},
					{
						displayName: 'Can Change Drive Members Only Restriction',
						name: 'canChangeDriveMembersOnlyRestriction',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can change the driveMembersOnly restriction of this shared drive',
					},
					{
						displayName: 'Can Comment',
						name: 'canComment',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can comment on files in this shared drive',
					},
					{
						displayName: 'Can Copy',
						name: 'canCopy',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can copy files in this shared drive',
					},
					{
						displayName: 'Can Delete Children',
						name: 'canDeleteChildren',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can delete children from folders in this shared drive',
					},
					{
						displayName: 'Can Delete Drive',
						name: 'canDeleteDrive',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can delete this shared drive. Attempting to delete the shared drive may still fail if there are untrashed items inside the shared drive.',
					},
					{
						displayName: 'Can Download',
						name: 'canDownload',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can download files in this shared drive',
					},
					{
						displayName: 'Can Edit',
						name: 'canEdit',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can edit files in this shared drive',
					},
					{
						displayName: 'Can List Children',
						name: 'canListChildren',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can list the children of folders in this shared drive',
					},
					{
						displayName: 'Can Manage Members',
						name: 'canManageMembers',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can add members to this shared drive or remove them or change their role',
					},
					{
						displayName: 'Can Read Revisions',
						name: 'canReadRevisions',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can read the revisions resource of files in this shared drive',
					},
					{
						displayName: 'Can Rename',
						name: 'canRename',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can rename files or folders in this shared drive',
					},
					{
						displayName: 'Can Rename Drive',
						name: 'canRenameDrive',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can rename this shared drive',
					},
					{
						displayName: 'Can Share',
						name: 'canShare',
						type: 'boolean',
						default: false,
						description: 'Whether the current user can share files or folders in this shared drive',
					},
					{
						displayName: 'Can Trash Children',
						name: 'canTrashChildren',
						type: 'boolean',
						default: false,
						description:
							'Whether the current user can trash children from folders in this shared drive',
					},
				],
			},
			{
				displayName: 'Color RGB',
				name: 'colorRgb',
				type: 'color',
				default: '',
				description: 'The color of this shared drive as an RGB hex string',
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'Whether the shared drive is hidden from default view',
			},
			{
				displayName: 'Restrictions',
				name: 'restrictions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Admin Managed Restrictions',
						name: 'adminManagedRestrictions',
						type: 'boolean',
						default: false,
						description:
							'Whether the options to copy, print, or download files inside this shared drive, should be disabled for readers and commenters. When this restriction is set to true, it will override the similarly named field to true for any file inside this shared drive.',
					},
					{
						displayName: 'Copy Requires Writer Permission',
						name: 'copyRequiresWriterPermission',
						type: 'boolean',
						default: false,
						description:
							'Whether the options to copy, print, or download files inside this shared drive, should be disabled for readers and commenters. When this restriction is set to true, it will override the similarly named field to true for any file inside this shared drive.',
					},
					{
						displayName: 'Domain Users Only',
						name: 'domainUsersOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether access to this shared drive and items inside this shared drive is restricted to users of the domain to which this shared drive belongs. This restriction may be overridden by other sharing policies controlled outside of this shared drive.',
					},
					{
						displayName: 'Drive Members Only',
						name: 'driveMembersOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether access to items inside this shared drive is restricted to its members',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['drive'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', i);

	const name = this.getNodeParameter('name', i) as string;

	const body: IDataObject = {
		name,
	};

	Object.assign(body, options);

	const response = await googleApiRequest.call(this, 'POST', '/drive/v3/drives', body, {
		requestId: uuid(),
	});

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	returnData.push(...executionData);

	return returnData;
}
