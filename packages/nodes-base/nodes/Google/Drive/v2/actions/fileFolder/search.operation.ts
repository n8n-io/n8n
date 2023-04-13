import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { driveRLC, folderRLC } from '../common.descriptions';
import { googleApiRequest } from '../../transport';
import { prepareQueryString } from '../../helpers/utils';
import type { SearchFilter } from '../../helpers/interfaces';
import { RlcDefaults } from '../../helpers/interfaces';

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
						displayName: 'Drive File Types',
						name: 'fileTypes',
						type: 'multiOptions',
						default: [],
						description:
							'Return only items corresponding to the selected types. Those mime types are specific to Google Drive, to filter by file extension use the "Additional Mime Types" option.',
						// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
						options: [
							{
								name: 'All',
								value: '*',
								description: 'Return all file types',
							},
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
						displayOptions: {
							hide: {
								whatToSearch: ['all'],
							},
						},
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
					'Also include files with the those MIME type(s), to include multiple types separate them with a comma. Common <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types" target="_blank">mime types</a>.',
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
				type: 'options',
				options: [
					{
						name: 'App Data Folder',
						value: 'appDataFolder',
						description: "Search for files or folders in the application's hidden app data folder",
					},
					{
						name: 'Drive',
						value: 'drive',
						description: "The user's 'My Drive' folder",
					},
				],
				default: 'drive',
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
	const searchMethod = this.getNodeParameter('searchMethod', i) as string;

	const query = [];

	const queryString = this.getNodeParameter('queryString', i) as string;

	if (searchMethod === 'name') {
		query.push(`name contains '${queryString}'`);
	} else {
		query.push(queryString);
	}

	const filter = this.getNodeParameter('filter.values', i, {}) as SearchFilter;

	let driveId = '';
	const returnedTypes: string[] = [];

	if (Object.keys(filter)) {
		if (filter.folderId.value !== RlcDefaults.Folder) {
			query.push(`'${filter.folderId.value}' in parents`);
		}

		if (filter.driveId.value !== RlcDefaults.Drive) {
			driveId = filter.driveId.value;
		}

		if (filter.whatToSearch === 'folders') {
			query.push("mimeType = 'application/vnd.google-apps.folder'");
		} else {
			if (filter.whatToSearch === 'files') {
				query.push("mimeType != 'application/vnd.google-apps.folder'");
			}

			if (filter?.fileTypes?.length && !filter.fileTypes.includes('*')) {
				filter.fileTypes.forEach((fileType: string) => {
					returnedTypes.push(`mimeType = '${fileType}'`);
				});
			}
		}
	}

	const additionalMimeType = this.getNodeParameter('options.mimeTypes', i, '') as string;
	if (additionalMimeType) {
		const mimes = additionalMimeType.split(',').map((type) => type.trim());
		mimes.forEach((mime) => {
			returnedTypes.push(`mimeType = '${mime}'`);
		});
	}

	if (returnedTypes.length) {
		query.push(`(${returnedTypes.join(' or ')})`);
	}

	const includeTrashed = this.getNodeParameter('options.includeTrashed', i, false) as boolean;
	query.push(includeTrashed ? '' : 'trashed = false');

	const queryFields = prepareQueryString(options.fields as string[]);

	const pageSize = this.getNodeParameter('maxResults', i);

	const querySpaces: string = this.getNodeParameter('options.spaces', i, '') as string;

	const queryCorpora = this.getNodeParameter('options.corpora', i, '') as string;

	const qs: IDataObject = {
		pageSize,
		// orderBy: 'modifiedTime',
		fields: `nextPageToken, files(${queryFields})`,
		spaces: querySpaces,
		q: query.filter((q) => q).join(' and '),
		includeItemsFromAllDrives: queryCorpora !== '' || driveId !== '',
		supportsAllDrives: queryCorpora !== '' || driveId !== '',
	};

	if (driveId) {
		qs.driveId = driveId;
	}

	const response = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, qs);

	const files = response.files;

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(files as IDataObject[]),
		{ itemData: { item: i } },
	);

	return executionData;
}
