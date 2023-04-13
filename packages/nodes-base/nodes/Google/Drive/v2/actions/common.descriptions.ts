import type { INodeProperties } from 'n8n-workflow';
import { RlcDefaults } from '../helpers/interfaces';

export const fileRLC: INodeProperties = {
	displayName: 'File',
	name: 'fileId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'File',
			name: 'list',
			type: 'list',
			placeholder: 'Select a file...',
			typeOptions: {
				searchListMethod: 'fileSearch',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder:
				'https://drive.google.com/file/d/1anGBg0b5re2VtF2bKu201_a-Vnz5BHq9Y4r-yBDAj5A/edit',
			extractValue: {
				type: 'regex',
				regex:
					'https:\\/\\/(?:drive|docs)\\.google\\.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex:
							'https:\\/\\/(?:drive|docs)\\.google.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
						errorMessage: 'Not a valid Google Drive File URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: '1anGBg0b5re2VtF2bKu201_a-Vnz5BHq9Y4r-yBDAj5A',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid Google Drive File ID',
					},
				},
			],
			url: '=https://drive.google.com/file/d/{{$value}}/view',
		},
	],
	description: 'The ID of the file',
};

export const folderRLC: INodeProperties = {
	displayName: 'Folder',
	name: 'folderId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Folder',
			name: 'list',
			type: 'list',
			placeholder: 'Select a folder...',
			typeOptions: {
				searchListMethod: 'folderSearch',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder: 'https://drive.google.com/drive/folders/1Tx9WHbA3wBpPB4C_HcoZDH9WZFWYxAMU',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex:
							'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
						errorMessage: 'Not a valid Google Drive Folder URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: '1anGBg0b5re2VtF2bKu201_a-Vnz5BHq9Y4r-yBDAj5A',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid Google Drive Folder ID',
					},
				},
			],
			url: '=https://drive.google.com/drive/folders/{{$value}}',
		},
	],
	description: 'The ID of the folder',
};

export const driveRLC: INodeProperties = {
	displayName: 'Drive',
	name: 'driveId',
	type: 'resourceLocator',
	default: { mode: 'list', value: RlcDefaults.Drive },
	required: true,
	hint: 'The Google Drive drive to operate on',
	modes: [
		{
			displayName: 'Drive',
			name: 'list',
			type: 'list',
			placeholder: 'Drive',
			typeOptions: {
				searchListMethod: 'driveSearch',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder: 'https://drive.google.com/drive/folders/0AaaaaAAAAAAAaa',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex:
							'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
						errorMessage: 'Not a valid Google Drive Drive URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			hint: 'The ID of the shared drive',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid Google Drive Drive ID',
					},
				},
			],
			url: '=https://drive.google.com/drive/folders/{{$value}}',
		},
	],
	description: 'The ID of the drive',
};

export const returnAllOrLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];

export const fileAndFolderOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Email Message',
			name: 'emailMessage',
			type: 'string',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: '',
			description: 'A plain text custom message to include in the notification email',
		},
		{
			displayName: 'Enforce Single Parent',
			name: 'enforceSingleParent',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			description:
				'Whether to opt in to API behavior that aims for all items to have exactly one parent. This parameter only takes effect if the item is not in a shared drive.',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'multiOptions',
			displayOptions: {
				show: {
					'/operation': ['list', 'copy'],
				},
			},
			options: [
				{
					name: '*',
					value: '*',
					description: 'All fields',
				},
				{
					name: 'explicitlyTrashed',
					value: 'explicitlyTrashed',
				},
				{
					name: 'exportLinks',
					value: 'exportLinks',
				},
				{
					name: 'hasThumbnail',
					value: 'hasThumbnail',
				},
				{
					name: 'iconLink',
					value: 'iconLink',
				},
				{
					name: 'ID',
					value: 'id',
				},
				{
					name: 'Kind',
					value: 'kind',
				},
				{
					name: 'mimeType',
					value: 'mimeType',
				},
				{
					name: 'Name',
					value: 'name',
				},
				{
					name: 'Permissions',
					value: 'permissions',
				},
				{
					name: 'Shared',
					value: 'shared',
				},
				{
					name: 'Spaces',
					value: 'spaces',
				},
				{
					name: 'Starred',
					value: 'starred',
				},
				{
					name: 'thumbnailLink',
					value: 'thumbnailLink',
				},
				{
					name: 'Trashed',
					value: 'trashed',
				},
				{
					name: 'Version',
					value: 'version',
				},
				{
					name: 'webViewLink',
					value: 'webViewLink',
				},
			],
			default: [],
			description: 'The fields to return',
		},
		{
			displayName: 'Move To New Owners Root',
			name: 'moveToNewOwnersRoot',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description:
				"<p>This parameter only takes effect if the item is not in a shared drive and the request is attempting to transfer the ownership of the item.</p><p>When set to true, the item is moved to the new owner's My Drive root folder and all prior parents removed.</p>",
		},
		{
			displayName: 'Send Notification Email',
			name: 'sendNotificationEmail',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			description: 'Whether to send a notification email when sharing to users or groups',
		},
		{
			displayName: 'Supports All Drives',
			name: 'supportsAllDrives',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			description: 'Whether the requesting application supports both My Drives and shared drives',
		},
		{
			displayName: 'Transfer Ownership',
			name: 'transferOwnership',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			description:
				'Whether to transfer ownership to the specified user and downgrade the current owner to a writer',
		},
		{
			displayName: 'Use Domain Admin Access',
			name: 'useDomainAdminAccess',
			type: 'boolean',
			displayOptions: {
				show: {
					'/operation': ['share'],
					'/resource': ['file', 'folder'],
				},
			},
			default: false,
			description:
				'Whether to perform the operation as domain administrator, i.e. if you are an administrator of the domain to which the shared drive belongs, you will be granted access automatically.',
		},

		{
			displayName: 'File Name',
			name: 'name',
			type: 'string',
			displayOptions: {
				show: {
					'/operation': ['copy'],
					'/resource': ['file'],
				},
			},
			default: '',
			placeholder: 'invoice_1.pdf',
			description: 'The name the file should be saved as',
		},
		{
			displayName: 'Parents',
			name: 'parents',
			type: 'string',
			displayOptions: {
				show: {
					'/operation': ['copy', 'create'],
					'/resource': ['file', 'folder'],
				},
			},
			typeOptions: {
				multipleValues: true,
			},
			default: [],
			description: 'The IDs of the parent folders the file/folder should be saved in',
		},
		{
			displayName: 'Spaces',
			name: 'spaces',
			type: 'multiOptions',
			displayOptions: {
				show: {
					'/operation': ['list'],
					'/resource': ['file'],
				},
			},
			options: [
				{
					name: '[All]',
					value: '*',
					description: 'All spaces',
				},
				{
					name: 'appDataFolder',
					value: 'appDataFolder',
				},
				{
					name: 'Drive',
					value: 'drive',
				},
				{
					name: 'Photos',
					value: 'photos',
				},
			],
			default: [],
			description: 'The spaces to operate on',
		},
		{
			displayName: 'Corpora',
			name: 'corpora',
			type: 'options',
			displayOptions: {
				show: {
					'/operation': ['list'],
					'/resource': ['file'],
				},
			},
			options: [
				{
					name: 'User',
					value: 'user',
					description: 'All files in "My Drive" and "Shared with me"',
				},
				{
					name: 'Domain',
					value: 'domain',
					description: "All files shared to the user's domain that are searchable",
				},
				{
					name: 'Drive',
					value: 'drive',
					description: 'All files contained in a single shared drive',
				},
				{
					name: 'allDrives',
					value: 'allDrives',
					description: 'All drives',
				},
			],
			default: '',
			description: 'The corpora to operate on',
		},
		{
			displayName: 'Drive ID',
			name: 'driveId',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					'/operation': ['list'],
					'/resource': ['file'],
					corpora: ['drive'],
				},
			},
			description:
				'ID of the shared drive to search. The driveId parameter must be specified if and only if corpora is set to drive.',
		},
	],
};
