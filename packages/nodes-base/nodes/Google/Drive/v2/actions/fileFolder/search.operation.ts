import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { driveRLC, folderRLC } from '../common.descriptions';
import { googleApiRequest } from '../../transport';
import { prepareQueryString } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Search Method',
		name: 'searchMethod',
		type: 'options',
		options: [
			{
				name: 'Search File/Folder Name',
				value: 'name',
			},
			{
				name: 'Advanced Search',
				value: 'query',
			},
		],
		default: 'name',
		description: 'Whether to search for the file/folder name or use a query string',
	},
	{
		displayName: 'Search Query',
		name: 'queryString',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				searchMethod: ['name'],
			},
		},
		placeholder: 'e.g. My File / My Folder',
		description:
			'The name of the file or folder to search for. Returns also files and folders whose names partially match this search term.',
	},
	{
		displayName: 'Query String',
		name: 'queryString',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				searchMethod: ['query'],
			},
		},
		placeholder: "e.g. not name contains 'hello'",
		description:
			'Use the Google query strings syntax to search for a specific set of files or folders. <a href="https://developers.google.com/drive/api/v3/search-files" target="_blank">Learn more</a>.',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		placeholder: 'e.g. 50',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description:
			'Maximum number of files and folders to return. Too many results may slow down the query.',
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'fixedCollection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				description: 'Filters to use to narrow down your search',
				values: [
					driveRLC,
					folderRLC,
					{
						displayName: 'What to Search',
						name: 'whatToSearch',
						type: 'options',
						default: 'all',
						description:
							'Narrows the search within the selected folder. By default, the root folder is used.',
						options: [
							{
								name: 'Files and Folders',
								value: 'all',
							},
							{
								name: 'Files',
								value: 'files',
							},
							{
								name: 'Folders',
								value: 'folders',
							},
						],
					},
					{
						displayName: 'File Types',
						name: 'fileTypes',
						type: 'multiOptions',
						default: ['application/vnd.google-apps.file'],
						description: 'Return only items corresponding to the selected types',
						options: [
							{
								name: '3rd Party Shortcut',
								value: 'application/vnd.google-apps.drive-sdk',
							},
							{
								name: 'Audio',
								value: 'application/vnd.google-apps.audio',
							},
							{
								name: 'Google Apps Scripts',
								value: 'application/vnd.google-apps.script',
							},
							{
								name: 'Google Docs',
								value: 'application/vnd.google-apps.document',
							},
							{
								name: 'Google Drawing',
								value: 'application/vnd.google-apps.drawing',
							},
							{
								name: 'Google Drive File',
								value: 'application/vnd.google-apps.file',
							},
							{
								name: 'Google Drive Folder',
								value: 'application/vnd.google-apps.folder',
							},
							{
								name: 'Google Forms',
								value: 'application/vnd.google-apps.form',
							},
							{
								name: 'Google Fusion Tables',
								value: 'application/vnd.google-apps.fusiontable',
							},
							{
								name: 'Google My Maps',
								value: 'application/vnd.google-apps.map',
							},
							{
								name: 'Google Sheets',
								value: 'application/vnd.google-apps.spreadsheet',
							},
							{
								name: 'Google Sites',
								value: 'application/vnd.google-apps.site',
							},
							{
								name: 'Google Slides',
								value: 'application/vnd.google-apps.presentation',
							},
							{
								name: 'Photo',
								value: 'application/vnd.google-apps.photo',
							},
							{
								name: 'Unknown',
								value: 'application/vnd.google-apps.unknown',
							},
							{
								name: 'Video',
								value: 'application/vnd.google-apps.video',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Additional Mime Types',
				name: 'mimeTypes',
				type: 'string',
				default: '',
				description:
					'Also include files and folders with the those MIME type(s), to include multiple types separate them with a comma',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
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
				displayName: 'Include Trashed Items',
				name: 'includeTrashed',
				type: 'boolean',
				default: false,
				description: "Whether to return also items in the Drive's bin",
			},
			{
				displayName: 'Spaces',
				name: 'spaces',
				type: 'multiOptions',
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['fileFolder'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	options: IDataObject,
): Promise<INodeExecutionData[]> {
	const queryFields = prepareQueryString(options.fields as string[]);

	const pageSize = this.getNodeParameter('limit', i);

	const qs = {
		pageSize,
		orderBy: 'modifiedTime',
		fields: `nextPageToken, files(${queryFields})`,
		spaces: '',
		q: '',
	};

	const response = await googleApiRequest.call(this, 'GET', '/drive/v3/files', {}, qs);

	const files = response.files;

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(files as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
