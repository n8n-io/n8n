import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

import { v4 as uuid } from 'uuid';

export class GoogleDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive',
		name: 'googleDrive',
		icon: 'file:googleDrive.svg',
		group: ['input'],
		version: [1, 2],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Google Drive',
		defaults: {
			name: 'Google Drive',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleDriveOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Drive',
						value: 'drive',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
				],
				default: 'file',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file',
						action: 'Copy a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file',
						action: 'Delete a file',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
						action: 'Download a file',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List files and folders',
						action: 'List a file',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Share a file',
						action: 'Share a file',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a file',
						action: 'Update a file',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
				],
				default: 'upload',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['folder'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
						action: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
						action: 'Delete a folder',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Share a folder',
						action: 'Share a folder',
					},
				],
				default: 'create',
			},

			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file:copy
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file'],
					},
				},
				description: 'The ID of the file to copy',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['file', 'folder'],
					},
				},
				description: 'The ID of the file/folder to delete',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				description: 'The ID of the file to download',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				description: 'Name of the binary property to which to write the data of the read file',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				options: [
					{
						displayName: 'Google File Conversion',
						name: 'googleFileConversion',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						placeholder: 'Add Conversion',
						options: [
							{
								displayName: 'Conversion',
								name: 'conversion',
								values: [
									{
										displayName: 'Google Docs',
										name: 'docsToFormat',
										type: 'options',
										options: [
											{
												name: 'To HTML',
												value: 'text/html',
											},
											{
												name: 'To MS Word',
												value:
													'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
											},
											{
												name: 'To OpenOffice Doc',
												value: 'application/vnd.oasis.opendocument.text',
											},
											{
												name: 'To PDF',
												value: 'application/pdf',
											},
											{
												name: 'To Rich Text',
												value: 'application/rtf',
											},
										],
										default:
											'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
										description: 'Format used to export when downloading Google Docs files',
									},
									{
										displayName: 'Google Drawings',
										name: 'drawingsToFormat',
										type: 'options',
										options: [
											{
												name: 'To JPEG',
												value: 'image/jpeg',
											},
											{
												name: 'To PNG',
												value: 'image/png',
											},
											{
												name: 'To SVG',
												value: 'image/svg+xml',
											},
											{
												name: 'To PDF',
												value: 'application/pdf',
											},
										],
										default: 'image/jpeg',
										description: 'Format used to export when downloading Google Drawings files',
									},
									{
										displayName: 'Google Slides',
										name: 'slidesToFormat',
										type: 'options',
										options: [
											{
												name: 'To MS PowerPoint',
												value:
													'application/vnd.openxmlformats-officedocument.presentationml.presentation',
											},
											{
												name: 'To PDF',
												value: 'application/pdf',
											},
											{
												name: 'To OpenOffice Presentation',
												value: 'application/vnd.oasis.opendocument.presentation',
											},
											{
												name: 'To Plain Text',
												value: 'text/plain',
											},
										],
										default:
											'application/vnd.openxmlformats-officedocument.presentationml.presentation',
										description: 'Format used to export when downloading Google Slides files',
									},
									{
										displayName: 'Google Sheets',
										name: 'sheetsToFormat',
										type: 'options',
										options: [
											{
												name: 'To MS Excel',
												value: 'application/x-vnd.oasis.opendocument.spreadsheet',
											},
											{
												name: 'To PDF',
												value: 'application/pdf',
											},
											{
												name: 'To CSV',
												value: 'text/csv',
											},
										],
										default: 'application/x-vnd.oasis.opendocument.spreadsheet',
										description: 'Format used to export when downloading Google Spreadsheets files',
									},
								],
							},
						],
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'File name. Ex: data.pdf.',
					},
				],
			},

			// ----------------------------------
			//         file:list
			// ----------------------------------
			{
				displayName: 'Use Query String',
				name: 'useQueryString',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['file'],
					},
				},
				description: 'Whether a query string should be used to filter results',
			},
			{
				displayName: 'Query String',
				name: 'queryString',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['list'],
						useQueryString: [true],
						resource: ['file'],
					},
				},
				placeholder: "name contains 'invoice'",
				description: 'Query to use to return only specific files',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['file'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'queryFilters',
				placeholder: 'Add Filter',
				description: 'Filters to use to return only specific files',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: ['list'],
						useQueryString: [false],
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'name',
						displayName: 'Name',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: 'Contains',
										value: 'contains',
									},
									{
										name: 'Is',
										value: 'is',
									},
									{
										name: 'Is Not',
										value: 'isNot',
									},
								],
								default: 'contains',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value for operation',
							},
						],
					},
					{
						name: 'mimeType',
						displayName: 'Mime Type',
						values: [
							{
								displayName: 'Mime Type',
								name: 'mimeType',
								type: 'options',
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
										name: 'Custom Mime Type',
										value: 'custom',
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
								default: 'application/vnd.google-apps.file',
								description: 'The Mime-Type of the files to return',
							},
							{
								displayName: 'Custom Mime Type',
								name: 'customMimeType',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										mimeType: ['custom'],
									},
								},
							},
						],
					},
				],
			},

			// ----------------------------------
			//         file:share
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['share'],
						resource: ['file', 'folder'],
					},
				},
				description: 'The ID of the file or shared drive',
			},
			{
				displayName: 'Permissions',
				name: 'permissionsUi',
				placeholder: 'Add Permission',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
					},
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
								description:
									'The email address of the user or group to which this permission refers',
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
								description:
									'Whether the permission allows the file to be discovered through search',
							},
						],
					},
				],
			},

			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				description: 'Whether the data to upload should be taken from binary field',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
						binaryData: [false],
					},
				},
				placeholder: '',
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
						binaryData: [true],
					},
				},
				placeholder: '',
				description:
					'Name of the binary property which contains the data for the file to be uploaded',
			},

			// ----------------------------------
			//         file:update
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['file'],
					},
				},
				description: 'The ID of the file to update',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['file'],
					},
				},
				options: [
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'The name of the file',
					},
					{
						displayName: 'Keep Revision Forever',
						name: 'keepRevisionForever',
						type: 'boolean',
						default: false,
						description:
							"Whether to set the 'keepForever' field in the new head revision. This is only applicable to files with binary content in Google Drive. Only 200 revisions for the file can be kept forever. If the limit is reached, try deleting pinned revisions.",
					},
					{
						displayName: 'Move to Trash',
						name: 'trashed',
						type: 'boolean',
						default: false,
						description: 'Whether to move a file to the trash. Only the owner may trash a file.',
					},
					{
						displayName: 'OCR Language',
						name: 'ocrLanguage',
						type: 'string',
						default: '',
						description: 'A language hint for OCR processing during image import (ISO 639-1 code)',
					},
					{
						displayName: 'Parent ID',
						name: 'parentId',
						type: 'string',
						default: '',
						description: 'The ID of the parent to set',
					},
					{
						displayName: 'Use Content As Indexable Text',
						name: 'useContentAsIndexableText',
						type: 'boolean',
						default: false,
						description: 'Whether to use the uploaded content as indexable text',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['file'],
					},
				},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'multiOptions',
						options: [
							{
								name: '[All]',
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
				],
			},
			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: 'invoice_1.pdf',
				description: 'The name the file should be saved as',
			},
			// ----------------------------------
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the response only contain the ID of the file. If this option gets activated, it will resolve the data automatically.',
			},
			{
				displayName: 'Parents',
				name: 'parents',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				description: 'The IDs of the parent folders which contain the file',
			},

			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['folder'],
					},
				},
				placeholder: 'invoices',
				description: 'The name of folder to create',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						'/operation': ['copy', 'list', 'share', 'create'],
						'/resource': ['file', 'folder'],
					},
				},
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
						description:
							'Whether the requesting application supports both My Drives and shared drives',
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
			},
			// ----------------------------------
			//         drive
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['drive'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a drive',
						action: 'Create a drive',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a drive',
						action: 'Delete a drive',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a drive',
						action: 'Get a drive',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List all drives',
						action: 'List all drives',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a drive',
						action: 'Update a drive',
					},
				],
				default: 'create',
			},
			// ----------------------------------
			//         drive:create
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['drive'],
					},
				},
				description: 'The name of this shared drive',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['drive'],
					},
				},
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
								description:
									'Whether the current user can change the background of this shared drive',
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
								description: 'Whether the current user can rename this shared drive',
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
						displayName: 'Created Time',
						name: 'createdTime',
						type: 'dateTime',
						default: '',
						description: 'The time at which the shared drive was created (RFC 3339 date-time)',
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
			// ----------------------------------
			//         drive:delete
			// ----------------------------------
			{
				displayName: 'Drive ID',
				name: 'driveId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['drive'],
					},
				},
				description: 'The ID of the shared drive',
			},
			// ----------------------------------
			//         drive:get
			// ----------------------------------
			{
				displayName: 'Drive ID',
				name: 'driveId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['drive'],
					},
				},
				description: 'The ID of the shared drive',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['drive'],
					},
				},
				options: [
					{
						displayName: 'Use Domain Admin Access',
						name: 'useDomainAdminAccess',
						type: 'boolean',
						default: false,
						description:
							'Whether to issue the request as a domain administrator; if set to true, then the requester will be granted access if they are an administrator of the domain to which the shared drive belongs. (Default: false).',
					},
				],
			},
			// ----------------------------------
			//         drive:list
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['drive'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['drive'],
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['drive'],
					},
				},
				options: [
					{
						displayName: 'Query',
						name: 'q',
						type: 'string',
						default: '',
						description:
							'Query string for searching shared drives. See the <a href="https://developers.google.com/drive/api/v3/search-shareddrives">"Search for shared drives"</a> guide for supported syntax.',
					},
					{
						displayName: 'Use Domain Admin Access',
						name: 'useDomainAdminAccess',
						type: 'boolean',
						default: false,
						description:
							'Whether to issue the request as a domain administrator; if set to true, then the requester will be granted access if they are an administrator of the domain to which the shared drive belongs. (Default: false).',
					},
				],
			},
			// ----------------------------------
			//         drive:update
			// ----------------------------------
			{
				displayName: 'Drive ID',
				name: 'driveId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['drive'],
					},
				},
				description: 'The ID of the shared drive',
			},
			{
				displayName: 'Update Fields',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['drive'],
					},
				},
				options: [
					{
						displayName: 'Color RGB',
						name: 'colorRgb',
						type: 'color',
						default: '',
						description: 'The color of this shared drive as an RGB hex string',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of this shared drive',
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				options: [
					{
						displayName: 'APP Properties',
						name: 'appPropertiesUi',
						placeholder: 'Add Property',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						description:
							'A collection of arbitrary key-value pairs which are private to the requesting app',
						options: [
							{
								name: 'appPropertyValues',
								displayName: 'APP Property',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the key to add',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the key',
									},
								],
							},
						],
					},
					{
						displayName: 'Properties',
						name: 'propertiesUi',
						placeholder: 'Add Property',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						description: 'A collection of arbitrary key-value pairs which are visible to all apps',
						options: [
							{
								name: 'propertyValues',
								displayName: 'Property',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the key to add',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the key',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				let queryFields = 'id, name';
				if (options && options.fields) {
					const fields = options.fields as string[];
					if (fields.includes('*')) {
						queryFields = '*';
					} else {
						queryFields = fields.join(', ');
					}
				}

				if (resource === 'drive') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, options);

						const response = await googleApiRequest.call(this, 'POST', `/drive/v3/drives`, body, { requestId: uuid() });

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i) as string;

						await googleApiRequest.call(this, 'DELETE', `/drive/v3/drives/${driveId}`);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i) as string;

						const qs: IDataObject = {};

						Object.assign(qs, options);

						const response = await googleApiRequest.call(this, 'GET', `/drive/v3/drives/${driveId}`, {}, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const qs: IDataObject = {};

						let response: IDataObject[] = [];

						Object.assign(qs, options);

						if (returnAll === true) {
							response = await googleApiRequestAllItems.call(
								this,
								'drives',
								'GET',
								`/drive/v3/drives`,
								{},
								qs,
							);
						} else {
							qs.pageSize = this.getNodeParameter('limit', i) as number;
							const data = await googleApiRequest.call(this, 'GET', `/drive/v3/drives`, {}, qs);
							response = data.drives as IDataObject[];
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i) as string;

						const body: IDataObject = {};

						Object.assign(body, options);

						const response = await googleApiRequest.call(this, 'PATCH', `/drive/v3/drives/${driveId}`, body);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				}
				if (resource === 'file') {
					if (operation === 'copy') {
						// ----------------------------------
						//         copy
						// ----------------------------------

						const fileId = this.getNodeParameter('fileId', i) as string;

						const body: IDataObject = {
							fields: queryFields,
						};

						const optionProperties = ['name', 'parents'];
						for (const propertyName of optionProperties) {
							if (options[propertyName] !== undefined) {
								body[propertyName] = options[propertyName];
							}
						}

						const qs = {
							supportsAllDrives: true,
						};

						const response = await googleApiRequest.call(this, 'POST', `/drive/v3/files/${fileId}/copy`, body, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else if (operation === 'download') {
						// ----------------------------------
						//         download
						// ----------------------------------

						const fileId = this.getNodeParameter('fileId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						const requestOptions = {
							resolveWithFullResponse: true,
							encoding: null,
							json: false,
						};

						const file = await googleApiRequest.call(
							this,
							'GET',
							`/drive/v3/files/${fileId}`,
							{},
							{ fields: 'mimeType', supportsTeamDrives: true },
						);
						let response;

						if (file.mimeType.includes('vnd.google-apps')) {
							const parameterKey = 'options.googleFileConversion.conversion';
							const type = file.mimeType.split('.')[2];
							let mime;
							if (type === 'document') {
								mime = this.getNodeParameter(
									`${parameterKey}.docsToFormat`,
									i,
									'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
								) as string;
							} else if (type === 'presentation') {
								mime = this.getNodeParameter(
									`${parameterKey}.slidesToFormat`,
									i,
									'application/vnd.openxmlformats-officedocument.presentationml.presentation',
								) as string;
							} else if (type === 'spreadsheet') {
								mime = this.getNodeParameter(
									`${parameterKey}.sheetsToFormat`,
									i,
									'application/x-vnd.oasis.opendocument.spreadsheet',
								) as string;
							} else {
								mime = this.getNodeParameter(
									`${parameterKey}.drawingsToFormat`,
									i,
									'image/jpeg',
								) as string;
							}
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${fileId}/export`,
								{},
								{ mimeType: mime },
								undefined,
								requestOptions,
							);
						} else {
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${fileId}`,
								{},
								{ alt: 'media' },
								undefined,
								requestOptions,
							);
						}

						let mimeType: string | undefined;
						let fileName: string | undefined = undefined;
						if (response.headers['content-type']) {
							mimeType = response.headers['content-type'];
						}

						if (options.fileName) {
							fileName = options.fileName as string;
						}

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							// @ts-ignore
							Object.assign(newItem.binary, items[i].binary);
						}

						items[i] = newItem;

						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const data = Buffer.from(response.body as string);

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
					} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						let querySpaces = '';
						if (options.spaces) {
							const spaces = options.spaces as string[];
							if (spaces.includes('*')) {
								querySpaces = 'appDataFolder, drive, photos';
							} else {
								querySpaces = spaces.join(', ');
							}
						}

						let queryCorpora = '';
						if (options.corpora) {
							queryCorpora = options.corpora as string;
						}

						let driveId: string | undefined;
						driveId = options.driveId as string;
						if (driveId === '') {
							driveId = undefined;
						}

						let queryString = '';
						const useQueryString = this.getNodeParameter('useQueryString', i) as boolean;
						if (useQueryString === true) {
							// Use the user defined query string
							queryString = this.getNodeParameter('queryString', i) as string;
						} else {
							// Build query string out of parameters set by user
							const queryFilters = this.getNodeParameter('queryFilters', i) as IDataObject;

							const queryFilterFields: string[] = [];
							if (queryFilters.name) {
								(queryFilters.name as IDataObject[]).forEach((nameFilter) => {
									let operation = nameFilter.operation;
									if (operation === 'is') {
										operation = '=';
									} else if (operation === 'isNot') {
										operation = '!=';
									}
									queryFilterFields.push(`name ${operation} '${nameFilter.value}'`);
								});

								queryString += queryFilterFields.join(' or ');
							}

							queryFilterFields.length = 0;
							if (queryFilters.mimeType) {
								(queryFilters.mimeType as IDataObject[]).forEach((mimeTypeFilter) => {
									let mimeType = mimeTypeFilter.mimeType;
									if (mimeTypeFilter.mimeType === 'custom') {
										mimeType = mimeTypeFilter.customMimeType;
									}
									queryFilterFields.push(`mimeType = '${mimeType}'`);
								});

								if (queryFilterFields.length) {
									if (queryString !== '') {
										queryString += ' and ';
									}

									queryString += queryFilterFields.join(' or ');
								}
							}
						}

						const pageSize = this.getNodeParameter('limit', i) as number;

						const qs = {
							pageSize,
							orderBy: 'modifiedTime',
							fields: `nextPageToken, files(${queryFields})`,
							spaces: querySpaces,
							q: queryString,
							includeItemsFromAllDrives: queryCorpora !== '' || driveId !== '',
							supportsAllDrives: queryCorpora !== '' || driveId !== '',
						};

						const response = await googleApiRequest.call(this, 'GET', `/drive/v3/files`, {}, qs);

						const files = response!.files;

						const version = this.getNode().typeVersion;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(files),
							{ itemData: { item: i } },
						);

						if (version === 1) {
							return [executionData];
						}

						returnData.push(...executionData);
					} else if (operation === 'upload') {
						// ----------------------------------
						//         upload
						// ----------------------------------
						const resolveData = this.getNodeParameter('resolveData', 0) as boolean;

						let mimeType = 'text/plain';
						let body;
						let originalFilename: string | undefined;
						if (this.getNodeParameter('binaryData', i) === true) {
							// Is binary file to upload
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${propertyNameUpload}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							if (item.binary[propertyNameUpload].mimeType) {
								mimeType = item.binary[propertyNameUpload].mimeType;
							}

							if (item.binary[propertyNameUpload].fileName) {
								originalFilename = item.binary[propertyNameUpload].fileName;
							}

							body = await this.helpers.getBinaryDataBuffer(i, propertyNameUpload);
						} else {
							// Is text file
							body = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
						}

						const name = this.getNodeParameter('name', i) as string;
						const parents = this.getNodeParameter('parents', i) as string[];

						let qs: IDataObject = {
							fields: queryFields,
							uploadType: 'media',
						};

						const requestOptions = {
							headers: {
								'Content-Type': mimeType,
								'Content-Length': body.byteLength,
							},
							encoding: null,
							json: false,
						};

						let response = await googleApiRequest.call(
							this,
							'POST',
							`/upload/drive/v3/files`,
							body,
							qs,
							undefined,
							requestOptions,
						);

						body = {
							mimeType,
							name,
							originalFilename,
						};

						const properties = this.getNodeParameter(
							'options.propertiesUi.propertyValues',
							i,
							[],
						) as IDataObject[];

						if (properties.length) {
							Object.assign(body, {
								properties: properties.reduce(
									(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
									{},
								),
							});
						}

						const appProperties = this.getNodeParameter(
							'options.appPropertiesUi.appPropertyValues',
							i,
							[],
						) as IDataObject[];

						if (properties.length) {
							Object.assign(body, {
								appProperties: appProperties.reduce(
									(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
									{},
								),
							});
						}

						qs = {
							addParents: parents.join(','),
							// When set to true shared drives can be used.
							supportsAllDrives: true,
						};

						response = await googleApiRequest.call(
							this,
							'PATCH',
							`/drive/v3/files/${JSON.parse(response).id}`,
							body,
							qs,
						);

						if (resolveData === true) {
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${response.id}`,
								{},
								{ fields: '*' },
							);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'update') {
						// ----------------------------------
						//         file:update
						// ----------------------------------

						const id = this.getNodeParameter('fileId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

						const qs: IDataObject = {
							supportsAllDrives: true,
						};

						Object.assign(qs, options);

						qs.fields = queryFields;

						const body: IDataObject = {};

						if (updateFields.fileName) {
							body.name = updateFields.fileName;
						}

						if (updateFields.hasOwnProperty('trashed')) {
							body.trashed = updateFields.trashed;
						}

						if (updateFields.parentId && updateFields.parentId !== '') {
							qs.addParents = updateFields.parentId;
						}

						const responseData = await googleApiRequest.call(
							this,
							'PATCH',
							`/drive/v3/files/${id}`,
							body,
							qs,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'folder') {
					if (operation === 'create') {
						// ----------------------------------
						//         folder:create
						// ----------------------------------

						const name = this.getNodeParameter('name', i) as string;

						const body = {
							name,
							mimeType: 'application/vnd.google-apps.folder',
							parents: options.parents || [],
						};

						const qs = {
							fields: queryFields,
							supportsAllDrives: true,
						};

						const response = await googleApiRequest.call(this, 'POST', '/drive/v3/files', body, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (['file', 'folder'].includes(resource)) {
					if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						const fileId = this.getNodeParameter('fileId', i) as string;

						await googleApiRequest.call(
							this,
							'DELETE',
							`/drive/v3/files/${fileId}`,
							{},
							{ supportsTeamDrives: true },
						);

						// If we are still here it did succeed
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({
								fileId,
								success: true,
							}),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'share') {
						const fileId = this.getNodeParameter('fileId', i) as string;

						const permissions = this.getNodeParameter('permissionsUi', i) as IDataObject;

						const options = this.getNodeParameter('options', i) as IDataObject;

						const body: IDataObject = {};

						const qs: IDataObject = {
							supportsTeamDrives: true,
						};

						if (permissions.permissionsValues) {
							Object.assign(body, permissions.permissionsValues);
						}

						Object.assign(qs, options);

						const response = await googleApiRequest.call(
							this,
							'POST',
							`/drive/v3/files/${fileId}/permissions`,
							body,
							qs,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ json: {error: error.message} });
					}
					continue;
				}
				throw error;
			}
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return this.prepareOutputData(returnData);
		}
	}
}
