import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	docspaceBufferApiRequest,
	docspaceFormDataApiRequest,
	docspaceJsonApiRequest,
	docspaceResolveAsyncApiResponse,
} from './GenericFunctions';

type INodeExecutionOptions = Parameters<
	IExecuteFunctions['helpers']['constructExecutionMetaData']
>[1];

const roomInvitationAccessLevels: INodeListSearchItems[] = [
	{
		name: 'Viewer',
		value: 2,
		description: 'File viewing',
	},
	{
		name: 'Reviewer',
		value: 5,
		description: 'Operations with existing files: viewing, reviewing, commenting',
	},
	{
		name: 'Commenter',
		value: 6,
		description: 'Operations with existing files: viewing, commenting',
	},
	{
		name: 'Form Filler',
		value: 7,
		description:
			'Form fillers can fill out forms and view only their completed/started forms within the Complete and In Process folders',
	},
	{
		name: 'Room Manager (Paid)',
		value: 9,
		description:
			'Room managers can manage the assigned rooms, invite new users and assign roles below their level',
	},
	{
		name: 'Editor',
		value: 10,
		description:
			'Operations with existing files: viewing, editing, form filling, reviewing, commenting',
	},
	{
		name: 'Content Creator',
		value: 11,
		description:
			"Content creators can create and edit files in the room, but can't manage users, or access settings",
	},
];

const formFillingRoomInvitationAccessLevels = [
	roomInvitationAccessLevels[3],
	roomInvitationAccessLevels[4],
	roomInvitationAccessLevels[6],
];

const collaborationRoomInvitationAccessLevels = [
	roomInvitationAccessLevels[0],
	roomInvitationAccessLevels[4],
	roomInvitationAccessLevels[5],
	roomInvitationAccessLevels[6],
];

const customRoomInvitationAccessLevels = [
	roomInvitationAccessLevels[0],
	roomInvitationAccessLevels[1],
	roomInvitationAccessLevels[2],
	roomInvitationAccessLevels[4],
	roomInvitationAccessLevels[5],
	roomInvitationAccessLevels[6],
];

const publicRoomInvitationAccessLevels = [
	roomInvitationAccessLevels[4],
	roomInvitationAccessLevels[6],
];

const virtualDataRoomInvitationAccessLevels = [
	roomInvitationAccessLevels[0],
	roomInvitationAccessLevels[3],
	roomInvitationAccessLevels[4],
	roomInvitationAccessLevels[5],
	roomInvitationAccessLevels[6],
];

export class OnlyofficeDocspace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ONLYOFFICE DocSpace',
		name: 'onlyofficeDocspace',
		icon: 'file:onlyofficeDocspace.svg',
		iconColor: 'orange',
		group: ['input'],
		description: 'Consume ONLYOFFICE DocSpace API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		usableAsTool: true,
		version: [1],
		defaults: {
			name: 'ONLYOFFICE DocSpace',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],

		properties: [
			/* -------------------------------------------------------------------------- */
			/*                               authentication                               */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				default: 'apiKey',
				description: 'The authentication method to use',
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'Personal Access Token',
						value: 'personalAccessToken',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                                  resources                                 */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'file',
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'Room',
						value: 'room',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               file:operations                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'createFile',
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Copy File',
						value: 'copyFile',
						action: 'Copy a file',
					},
					{
						name: 'Create File',
						value: 'createFile',
						action: 'Create a file',
					},
					{
						name: 'Delete File',
						value: 'deleteFile',
						action: 'Delete a file',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						action: 'Download a file',
					},
					{
						name: 'Get File Info',
						value: 'getFileInfo',
						action: 'Get the info of a file',
					},
					{
						name: 'Get File Link',
						value: 'getFileLink',
						action: 'Get the link of a file',
					},
					{
						name: 'Move File',
						value: 'moveFile',
						action: 'Move a file',
					},
					{
						name: 'Update File',
						value: 'updateFile',
						action: 'Update a file',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						action: 'Upload a file',
					},
				],
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              folder:operations                             */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'createFolder',
				displayOptions: {
					show: {
						resource: ['folder'],
					},
				},
				options: [
					{
						name: 'Copy Folder',
						value: 'copyFolder',
						action: 'Copy a folder',
					},
					{
						name: 'Create Folder',
						value: 'createFolder',
						action: 'Create a folder',
					},
					{
						name: 'Delete Folder',
						value: 'deleteFolder',
						action: 'Delete a folder',
					},
					{
						name: 'Get Folder Contents',
						value: 'getFolderContents',
						action: 'Get the contents of a folder',
					},
					{
						name: 'Get Folder Info',
						value: 'getFolderInfo',
						action: 'Get the info of a folder',
					},
					{
						name: 'Get Folder History',
						value: 'getFolderHistory',
						action: 'Get the history of a folder',
					},
					{
						name: 'Get Folder Link',
						value: 'getFolderLink',
						action: 'Get the link of a folder',
					},
					{
						name: 'Move Folder',
						value: 'moveFolder',
						action: 'Move a folder',
					},
					{
						name: 'Update Folder',
						value: 'updateFolder',
						action: 'Update a folder',
					},
				],
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:operations                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'createRoom',
				displayOptions: {
					show: {
						resource: ['room'],
					},
				},
				options: [
					{
						name: 'Archive Room',
						value: 'archiveRoom',
						action: 'Archive a room',
					},
					{
						name: 'Create Room',
						value: 'createRoom',
						action: 'Create a room',
					},
					{
						name: 'Get Room Info',
						value: 'getRoomInfo',
						action: 'Get the info of a room',
					},
					{
						name: 'Get Room Link',
						value: 'getRoomLink',
						action: 'Get the link of a room',
					},
					{
						name: 'Invite User',
						value: 'inviteUser',
						action: 'Invite a user to a room',
					},
					{
						name: 'Remove User',
						value: 'removeUser',
						action: 'Remove a user from a room',
					},
					{
						name: 'Search Room',
						value: 'searchRoom',
						action: 'Search for a room',
					},
					{
						name: 'Search User',
						value: 'searchUser',
						action: 'Search for a user in a room',
					},
					{
						name: 'Update Room',
						value: 'updateRoom',
						action: 'Update a room',
					},
					{
						name: 'Update User',
						value: 'updateUser',
						action: 'Update a user in a room',
					},
				],
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:operations                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'getUser',
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Delete User',
						value: 'deleteUser',
						action: 'Delete a user',
					},
					{
						name: 'Disable User',
						value: 'disableUser',
						action: 'Disable a user',
					},
					{
						name: 'Enable User',
						value: 'enableUser',
						action: 'Enable a user',
					},
					{
						name: 'Get User',
						value: 'getUser',
						action: 'Get a user',
					},
					{
						name: 'Invite User',
						value: 'inviteUser',
						action: 'Invite a user',
					},
					{
						name: 'Search User',
						value: 'searchUser',
						action: 'Search for a user',
					},
					{
						name: 'Update User',
						value: 'updateUser',
						action: 'Update a user',
					},
				],
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                                file:copyFile                               */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to copy',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['copyFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'To My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to copy the file to the "My documents" section',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['copyFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Destination ID',
				name: 'destFolderId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to copy the file to',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['file'],
						operation: ['copyFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               file:createFile                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'In My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to create the file in the "My documents" section',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['createFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to create the file in',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['file'],
						operation: ['createFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'document',
				description: 'The type of the file to create',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['createFile'],
					},
				},
				options: [
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Spreadsheet',
						value: 'spreadsheet',
					},
					{
						name: 'Presentation',
						value: 'presentation',
					},
					{
						name: 'PDF Form',
						value: 'pdfForm',
					},
				],
				required: true,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: 'File from n8n',
				description: 'The title of the file to create',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['createFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               file:deleteFile                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to delete',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['deleteFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              file:downloadFile                             */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to download',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'As Text',
				name: 'asText',
				type: 'boolean',
				default: false,
				description: 'Whether to download the file as text',
				hint: 'Download the file as ".csv" or ".txt", depending on the original format',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The format to download the file in',
				hint: 'Leave empty to use the original format of the file',
				displayOptions: {
					show: {
						asText: [false],
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a format...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listConvertible',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				hint: 'The name of the output binary field to put the file in',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              file:getFileInfo                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to get info for',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['getFileInfo'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              file:getFileLink                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to get the link for',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['getFileLink'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                                file:moveFile                               */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to move',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['moveFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'To My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to move the file to the "My documents" section',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['moveFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Destination ID',
				name: 'destFolderId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to move the file to',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['file'],
						operation: ['moveFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               file:updateFile                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'The ID of the file to update',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['updateFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the file to set',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['updateFile'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                               file:uploadFile                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'To My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to upload the file to the "My documents" section',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to upload the file to',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'The file name with an extension to use for the uploaded file',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
						binaryData: [false],
					},
				},
				placeholder: 'File from n8n.txt',
				required: true,
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'The file name with an extension to use for the uploaded file',
				hint: 'Leave empty to use the file name from the binary data',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
						binaryData: [true],
					},
				},
			},
			{
				displayName: 'Binary File',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				description: 'Whether the data to upload should be taken from binary field',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload',
				displayOptions: {
					show: {
						binaryData: [false],
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				required: true,
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				hint: 'The name of the input binary field containing the file to be uploaded',
				displayOptions: {
					show: {
						binaryData: [true],
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              folder:copyFolder                             */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to copy',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['copyFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'To My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to copy the folder to the "My documents" section',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['copyFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'Destination ID',
				name: 'destFolderId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to copy the folder to',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['folder'],
						operation: ['copyFolder'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                             folder:createFolder                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'In My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to create the folder in the "My documents" section',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['createFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to create the folder in',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['folder'],
						operation: ['createFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: 'Folder from n8n',
				description: 'The title of the folder to create',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['createFolder'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                             folder:deleteFolder                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to delete',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['deleteFolder'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                          folder:getFolderContents                          */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Is My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to get the contents of the "My documents" section',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderContents'],
					},
				},
				required: true,
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to get the contents of',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['folder'],
						operation: ['getFolderContents'],
					},
				},
				required: true,
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The query to search for in the folder contents',
				hint: 'Leave empty to get all contents',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderContents'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                            folder:getFolderInfo                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Is My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to get the info of the "My documents" section',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderInfo'],
					},
				},
				required: true,
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to get info for',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['folder'],
						operation: ['getFolderInfo'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                            folder:getFolderHistory                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to get history for',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderHistory'],
					},
				},
				required: true,
			},
			{
				displayName: 'From Date',
				name: 'fromDate',
				type: 'string',
				default: '',
				description: 'The start date of the history request',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderHistory'],
					},
				},
			},
			{
				displayName: 'To Date',
				name: 'toDate',
				type: 'string',
				default: '',
				description: 'The end date of the history request',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderHistory'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                            folder:getFolderLink                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to get the link for',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['getFolderLink'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              folder:moveFolder                             */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to move',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['moveFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'To My Documents',
				name: 'isMyDocuments',
				type: 'boolean',
				default: false,
				description: 'Whether to move the folder to the "My documents" section',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['moveFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'Destination ID',
				name: 'destFolderId',
				type: 'number',
				default: 0,
				description: 'The ID of the room or folder to move the folder to',
				displayOptions: {
					show: {
						isMyDocuments: [false],
						resource: ['folder'],
						operation: ['moveFolder'],
					},
				},
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                             folder:updateFolder                            */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				default: 0,
				description: 'The ID of the folder to update',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['updateFolder'],
					},
				},
				required: true,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the folder to set',
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['updateFolder'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                              room:archiveRoom                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to archive',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['archiveRoom'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:createRoom                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: 'Room from n8n',
				description: 'The title of the room to create',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['createRoom'],
					},
				},
				required: true,
			},
			{
				displayName: 'Type',
				name: 'roomType',
				type: 'options',
				default: 6,
				description: 'The type of the room to create',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['createRoom'],
					},
				},
				options: [
					{
						name: 'Filling Forms Room',
						value: 1,
						description: 'Upload PDF forms into the room',
					},
					{
						name: 'Editing Room',
						value: 2,
						description: 'Collaborate on one or multiple documents with your team',
					},
					{
						name: 'Custom Room',
						value: 5,
						description: 'Apply your own settings to use this room for any custom purpose',
					},
					{
						name: 'Public Room',
						value: 6,
						description:
							'Share documents for viewing, editing, commenting, or reviewing without registration',
					},
					{
						name: 'Virtual Data Room',
						value: 8,
						description: 'Use VDR for advanced file security and transparency',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                              room:getRoomInfo                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to get info for',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['getRoomInfo'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                              room:getRoomLink                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to get the link for',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['getRoomLink'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:inviteUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to invite the user to',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
				required: true,
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to invite to the room',
				displayOptions: {
					hide: {
						userEmail: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listInvitableUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},
			{
				displayName: 'User Email',
				name: 'userEmail',
				type: 'string',
				default: '',
				description: 'The email of the user to invite to the room',
				hint: 'Inviting a user by email will create a guest user if the user does not exist',
				displayOptions: {
					hide: {
						userId: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				placeholder: 'name@email.com',
				required: true,
			},
			{
				displayName: 'User Access',
				name: 'userAccess',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The access level to grant to the user',
				hint: 'Available access levels depend on the room type',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select an access level...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listAccessLevels',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},
			{
				displayName: 'Notify',
				name: 'notify',
				type: 'boolean',
				default: true,
				description: 'Whether to notify the user',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				required: true,
			},
			{
				displayName: 'Culture',
				name: 'culture',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The language to use for the invitation',
				hint: 'Leave empty to use the default portal language',
				displayOptions: {
					show: {
						notify: [true],
						resource: ['room'],
						operation: ['inviteUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a culture...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listCultures',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:removeUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to remove the user from',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['removeUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
				required: true,
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to remove from the room',
				displayOptions: {
					hide: {
						userEmail: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['removeUser'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRemovableUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},
			{
				displayName: 'User Email',
				name: 'userEmail',
				type: 'string',
				default: '',
				description: 'The email of the user to remove from the room',
				displayOptions: {
					hide: {
						userId: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['removeUser'],
					},
				},
				placeholder: 'name@email.com',
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:searchRoom                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The query to search for rooms',
				hint: 'Leave empty to get all rooms',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['searchRoom'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:searchUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to search for users in',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['searchUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
				required: true,
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The query to search for users in the room',
				hint: 'Leave empty to get all users in the room',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['searchUser'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:updateRoom                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to update',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['updateRoom'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the room to set',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['updateRoom'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                               room:updateUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Room ID',
				name: 'roomId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the room to update the user in',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['updateUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a room...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRooms',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'The ID of the room must be a number',
								},
							},
						],
					},
				],
				required: true,
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to update in the room',
				displayOptions: {
					hide: {
						userEmail: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['updateUser'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listRoomUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},
			{
				displayName: 'User Email',
				name: 'userEmail',
				type: 'string',
				default: '',
				description: 'The email of the user to update in the room',
				displayOptions: {
					hide: {
						userId: [{ _cnd: { exists: true } }],
					},
					show: {
						resource: ['room'],
						operation: ['updateUser'],
					},
				},
				placeholder: 'name@email.com',
				required: true,
			},
			{
				displayName: 'User Access',
				name: 'userAccess',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The access level to grant to the user',
				hint: 'Available access levels depend on the room type',
				displayOptions: {
					show: {
						resource: ['room'],
						operation: ['updateUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select an access level...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listAccessLevels',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:deleteUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to delete',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['deleteUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listDisabledUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:disableUser                             */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to disable',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['disableUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listEnabledUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:enableUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to enable',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['enableUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listDisabledUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                                 user:getUser                               */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Is Me',
				name: 'isMe',
				type: 'boolean',
				default: false,
				description: 'Whether to get the current authenticated user',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getUser'],
					},
				},
				required: true,
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to get for',
				displayOptions: {
					hide: {
						userEmail: [{ _cnd: { exists: true } }],
					},
					show: {
						isMe: [false],
						resource: ['user'],
						operation: ['getUser'],
					},
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},
			{
				displayName: 'User Email',
				name: 'userEmail',
				type: 'string',
				default: '',
				description: 'The email of the user to get for',
				displayOptions: {
					hide: {
						userId: [{ _cnd: { exists: true } }],
					},
					show: {
						isMe: [false],
						resource: ['user'],
						operation: ['getUser'],
					},
				},
				placeholder: 'name@email.com',
				required: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:inviteUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 4,
				description: 'The type of the user to invite',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['inviteUser'],
					},
				},
				options: [
					{
						name: 'Room Admin',
						value: 1,
					},
					{
						name: 'DocSpace Admin',
						value: 3,
					},
					{
						name: 'User',
						value: 4,
					},
				],
				required: true,
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email of the user to invite',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['inviteUser'],
					},
				},
				placeholder: 'name@email.com',
				required: true,
			},
			{
				displayName: 'Culture',
				name: 'culture',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The languages to use for the invitation',
				hint: 'Leave empty to use the default portal language',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['inviteUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a culture...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listCultures',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:searchUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The query to search for users',
				hint: 'Leave empty to get all users',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['searchUser'],
					},
				},
			},

			/* -------------------------------------------------------------------------- */
			/*                               user:updateUser                              */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				description: 'The ID of the user to update',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['updateUser'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchable: true,
							searchListMethod: 'listUsers',
						},
					},
					{
						displayName: 'Manual',
						name: 'manual',
						type: 'string',
					},
				],
				required: true,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 2,
				description: 'The type to set for the user',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['updateUser'],
					},
				},
				options: [
					{
						name: 'Room Admin',
						value: 1,
					},
					{
						name: 'Guest',
						value: 2,
					},
					{
						name: 'DocSpace Admin',
						value: 3,
					},
					{
						name: 'User',
						value: 4,
					},
				],
			},
		],

		credentials: [
			{
				name: 'onlyofficeDocspaceApiKeyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'onlyofficeDocspaceBasicAuthApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'onlyofficeDocspaceOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'onlyofficeDocspacePersonalAccessTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['personalAccessToken'],
					},
				},
			},
		],
	};

	methods = {
		listSearch: {
			async listAccessLevels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L165
				const results: INodeListSearchItems[] = [];
				const levels: INodeListSearchItems[] = [];
				const roomId = this.getNodeParameter('roomId', '', { extractValue: true }) as string;
				if (roomId) {
					const response = await docspaceJsonApiRequest.call(
						this,
						0,
						'GET',
						`api/2.0/files/rooms/${roomId}`,
					);
					switch (response.body.response.roomType) {
						case 1:
							levels.push.apply(levels, formFillingRoomInvitationAccessLevels);
							break;
						case 2:
							levels.push.apply(levels, collaborationRoomInvitationAccessLevels);
							break;
						case 5:
							levels.push.apply(levels, customRoomInvitationAccessLevels);
							break;
						case 6:
							levels.push.apply(levels, publicRoomInvitationAccessLevels);
							break;
						case 8:
							levels.push.apply(levels, virtualDataRoomInvitationAccessLevels);
							break;
					}
				}
				if (levels.length === 0) {
					levels.push.apply(levels, roomInvitationAccessLevels);
				}
				if (filter) {
					for (const level of levels) {
						if (level.name.toLowerCase().includes(filter.toLowerCase())) {
							results.push(level);
						}
					}
				} else {
					results.push.apply(results, levels);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listConvertible(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/SettingsController.cs#L199
				const results: INodeListSearchItems[] = [];
				const fileId = this.getNodeParameter('fileId', 0) as number;
				if (!fileId) {
					throw new NodeOperationError(
						this.getNode(),
						'The ID of the file to get convertible formats for is required',
					);
				}
				const infoResponse = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					`api/2.0/files/file/${fileId}`,
				);
				const settingsResponse = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/files/settings',
				);
				for (const item of settingsResponse.body.response.extsConvertible[
					infoResponse.body.response.fileExst
				]) {
					if (!filter || (filter && item.toLowerCase().includes(filter.toLowerCase()))) {
						const options: INodeListSearchItems = {
							name: item,
							value: item,
						};
						results.push(options);
					}
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listCultures(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/web/ASC.Web.Api/Api/Settings/SettingsController.cs/#L476
				const results: INodeListSearchItems[] = [];
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/settings/cultures',
				);
				for (const item of response.body.response) {
					if (!filter || (filter && item.toLowerCase().includes(filter.toLowerCase()))) {
						const options: INodeListSearchItems = {
							name: item,
							value: item,
						};
						results.push(options);
					}
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listDisabledUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L649
				const query: {
					query: string;
				} = {
					query: '@',
				};
				if (filter) {
					query.query = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/people/status/2/search',
					query,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.displayName,
						value: item.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listEnabledUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L649
				const query: {
					query: string;
				} = {
					query: '@',
				};
				if (filter) {
					query.query = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/people/status/5/search',
					query,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.displayName,
						value: item.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listInvitableUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L2133
				const roomId = this.getNodeParameter('roomId', 0, { extractValue: true }) as number;
				if (!roomId) {
					throw new NodeOperationError(
						this.getNode(),
						'The ID of the room to get users for is required',
					);
				}
				const query: {
					excludeShared: boolean;
					filterValue?: string;
				} = {
					excludeShared: true,
				};
				if (filter) {
					query.filterValue = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					`api/2.0/people/room/${roomId}`,
					query,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.displayName,
						value: item.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listRemovableUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L2133
				const roomId = this.getNodeParameter('roomId', 0, { extractValue: true }) as number;
				if (!roomId) {
					throw new NodeOperationError(
						this.getNode(),
						'The ID of the room to get users for is required',
					);
				}
				const query: {
					includeShared: boolean;
					filterValue?: string;
				} = {
					includeShared: true,
				};
				if (filter) {
					query.filterValue = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					`api/2.0/people/room/${roomId}`,
					query,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.displayName,
						value: item.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listRooms(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L649
				const results: INodeListSearchItems[] = [];
				const filters: {
					filterValue?: string;
				} = {};
				if (filter) {
					filters.filterValue = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/files/rooms',
					filters,
				);
				for (const folder of response.body.response.folders) {
					const options: INodeListSearchItems = {
						name: folder.title,
						value: folder.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listRoomUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L349
				const roomId = this.getNodeParameter('roomId', 0, { extractValue: true }) as number;
				if (!roomId) {
					throw new NodeOperationError(
						this.getNode(),
						'The ID of the room to get users for is required',
					);
				}
				const filters: {
					filterValue?: string;
				} = {};
				if (filter) {
					filters.filterValue = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					`api/2.0/files/rooms/${roomId}/share`,
					filters,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.sharedTo.displayName,
						value: item.sharedTo.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},

			async listUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L811
				const query: {
					filterValue?: string;
				} = {};
				if (filter) {
					query.filterValue = filter;
				}
				const response = await docspaceJsonApiRequest.call(
					this,
					0,
					'GET',
					'api/2.0/people/filter',
					query,
				);
				const results: INodeListSearchItems[] = [];
				for (const item of response.body.response) {
					const options: INodeListSearchItems = {
						name: item.displayName,
						value: item.id,
					};
					results.push(options);
				}
				const result: INodeListSearchResult = {
					results,
				};
				return result;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();

		for (let i = 0; i < items.length; i++) {
			let resultDataObject: IDataObject | undefined;
			let resultBinaryData: IBinaryData | undefined;

			try {
				const resource = this.getNodeParameter('resource', i);
				const operation = this.getNodeParameter('operation', i);

				switch (resource) {
					case 'file': {
						switch (operation) {
							case 'copyFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/OperationController.cs/#L74
								const fileId = this.getNodeParameter('fileId', i) as number;
								let destFolderId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									destFolderId = infoResponse.body.response.current.id as number;
								} else {
									destFolderId = this.getNodeParameter('destFolderId', i) as number;
								}
								const copyBody: {
									fileIds: number[];
									destFolderId: number;
									conflictResolveType: string;
									deleteAfter: boolean;
								} = {
									fileIds: [fileId],
									destFolderId,
									conflictResolveType: 'Duplicate',
									deleteAfter: false,
								};
								const copyResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/files/fileops/copy',
									undefined,
									copyBody,
								);
								const resolved = await docspaceResolveAsyncApiResponse.call(
									this,
									i,
									copyResponse.body,
								);
								resultDataObject = resolved[0].files[0];
								break;
							}

							case 'createFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L198
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L551
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								let parentId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									parentId = infoResponse.body.response.current.id as number;
								} else {
									parentId = this.getNodeParameter('parentId', i) as number;
								}
								let extension: string | undefined;
								const type = this.getNodeParameter('type', i) as string;
								switch (type) {
									case 'document':
										extension = '.docx';
										break;
									case 'spreadsheet':
										extension = '.xlsx';
										break;
									case 'presentation':
										extension = '.pptx';
										break;
									case 'pdfForm':
										extension = '.pdf';
										break;
									default:
										throw new NodeOperationError(this.getNode(), `Unknown file type "${type}"`, {
											itemIndex: i,
										});
								}
								const title = this.getNodeParameter('title', i) as string;
								const body: {
									title: string;
								} = {
									title: `${title}${extension}`,
								};
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'POST',
									`api/2.0/files/${parentId}/file`,
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'deleteFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L239
								const fileId = this.getNodeParameter('fileId', i) as number;
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/file/${fileId}`,
								);
								const deleteBody: {
									deleteAfter: boolean;
									immediately: boolean;
								} = {
									deleteAfter: false,
									immediately: false,
								};
								const deleteResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'DELETE',
									`api/2.0/files/file/${fileId}`,
									undefined,
									deleteBody,
								);
								await docspaceResolveAsyncApiResponse.call(this, i, deleteResponse.body);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'downloadFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/OperationController.cs/#L51
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/SettingsController.cs#L199
								const fileId = this.getNodeParameter('fileId', i) as number;
								const asText = this.getNodeParameter('asText', i) as boolean;
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/file/${fileId}`,
								);
								resultDataObject = infoResponse.body.response;
								let extension: string | undefined;
								if (asText) {
									if (
										infoResponse.body.response.fileExst !== '.csv' &&
										infoResponse.body.response.fileExst !== '.txt'
									) {
										const settingsResponse = await docspaceJsonApiRequest.call(
											this,
											i,
											'GET',
											'api/2.0/files/settings',
										);
										for (const item of settingsResponse.body.response.extsConvertible[
											infoResponse.body.response.fileExst
										]) {
											if (item === '.csv' || item === '.txt') {
												extension = item;
												break;
											}
										}
										if (!extension) {
											throw new NodeOperationError(
												this.getNode(),
												'File could not be converted to text',
												{ itemIndex: i },
											);
										}
									}
								} else {
									const outputFormat = this.getNodeParameter('outputFormat', i, '', {
										extractValue: true,
									}) as string;
									if (outputFormat) {
										extension = outputFormat;
									}
								}
								const downloadBody: {
									fileConvertIds?: Array<{ key: number; value: string }>;
									fileIds?: number[];
								} = {};
								if (extension) {
									downloadBody.fileConvertIds = [{ key: fileId, value: extension }];
								} else {
									downloadBody.fileIds = [fileId];
								}
								const downloadResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/files/fileops/bulkdownload',
									undefined,
									downloadBody,
								);
								const resolved = await docspaceResolveAsyncApiResponse.call(
									this,
									i,
									downloadResponse.body,
								);
								const bufferResponse = await docspaceBufferApiRequest.call(
									this,
									i,
									'GET',
									resolved[0].url,
								);
								let filePath: string | undefined;
								if (extension) {
									const fileName = infoResponse.body.response.title.slice(
										0,
										-infoResponse.body.response.fileExst.length,
									);
									filePath = `${fileName}${extension}`;
								} else {
									filePath = infoResponse.body.response.title;
								}
								resultBinaryData = await this.helpers.prepareBinaryData(
									bufferResponse.body,
									filePath,
									bufferResponse.headers['Content-Type'],
								);
								break;
							}

							case 'getFileInfo': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								const fileId = this.getNodeParameter('fileId', i) as number;
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/file/${fileId}`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getFileLink': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L445
								const fileId = this.getNodeParameter('fileId', i) as number;
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/file/${fileId}/link`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'moveFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/OperationController.cs/#L173
								const fileId = this.getNodeParameter('fileId', i) as number;
								let destFolderId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									destFolderId = infoResponse.body.response.current.id as number;
								} else {
									destFolderId = this.getNodeParameter('destFolderId', i) as number;
								}
								const moveBody: {
									fileIds: number[];
									destFolderId: number;
									conflictResolveType: string;
									deleteAfter: boolean;
								} = {
									fileIds: [fileId],
									destFolderId,
									conflictResolveType: 'Duplicate',
									deleteAfter: false,
								};
								const moveResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/files/fileops/move',
									undefined,
									moveBody,
								);
								const resolved = await docspaceResolveAsyncApiResponse.call(
									this,
									i,
									moveResponse.body,
								);
								resultDataObject = resolved[0].files[0];
								break;
							}

							case 'updateFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L399
								const fileId = this.getNodeParameter('fileId', i) as number;
								const title = this.getNodeParameter('title', i) as string;
								const body: {
									title?: string;
								} = {};
								if (title) {
									body.title = title;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/file/${fileId}`,
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'uploadFile': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/UploadController.cs/#L76
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Startup.cs/#L76
								const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10mb
								let parentId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									parentId = infoResponse.body.response.current.id as number;
								} else {
									parentId = this.getNodeParameter('parentId', i) as number;
								}
								const sessionBody: {
									fileName: string;
									fileSize: number;
									createOn: string;
								} = {
									fileName: '',
									fileSize: 0,
									createOn: new Date().toISOString(),
								};
								let mimeType = '';
								let buffer: Uint8Array | undefined;
								const isBinaryData = this.getNodeParameter('binaryData', i);
								if (isBinaryData) {
									const fileName = this.getNodeParameter('fileName', i) as string;
									const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
									const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
									const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
										i,
										binaryPropertyName,
									);
									if (fileName) {
										sessionBody.fileName = fileName;
									} else if (binaryData.fileName) {
										sessionBody.fileName = binaryData.fileName;
									}
									mimeType = binaryData.mimeType;
									buffer = new Uint8Array(binaryDataBuffer);
								} else {
									const fileName = this.getNodeParameter('fileName', i) as string;
									const fileContent = this.getNodeParameter('fileContent', i) as string;
									sessionBody.fileName = fileName;
									mimeType = 'text/plain';
									buffer = new TextEncoder().encode(fileContent);
								}
								if (!sessionBody.fileName) {
									throw new NodeOperationError(this.getNode(), 'File name is not set', {
										itemIndex: i,
									});
								}
								sessionBody.fileSize = buffer.length;
								const sessionResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'POST',
									`api/2.0/files/${parentId}/upload/create_session`,
									undefined,
									sessionBody,
								);
								let uploadResponse;
								let done = false;
								const chunks = Math.ceil(buffer.length / MAX_CHUNK_SIZE);
								for (let index = 0; index < chunks; index += 1) {
									const start = index * MAX_CHUNK_SIZE;
									const end = (index + 1) * MAX_CHUNK_SIZE;
									const chunk = buffer.slice(start, end);
									const blob = new Blob([chunk], { type: mimeType });
									const formData = new FormData();
									formData.append('file', blob, sessionBody.fileName);
									uploadResponse = await docspaceFormDataApiRequest.call(
										this,
										index,
										`ChunkedUploader.ashx?uid=${sessionResponse.body.response.data.id}`,
										formData,
									);
									if (uploadResponse.statusCode === 201) {
										done = true;
									}
									if (done) {
										break;
									}
								}
								if (!done) {
									throw new NodeOperationError(this.getNode(), 'Upload session not completed', {
										itemIndex: i,
									});
								}
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/file/${uploadResponse.body.data.id}`,
								);
								resultDataObject = infoResponse.body.response;
								break;
							}

							default: {
								break;
							}
						}

						break;
					}

					case 'folder': {
						switch (operation) {
							case 'copyFolder': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/OperationController.cs/#L74
								const folderId = this.getNodeParameter('folderId', i) as number;
								let destFolderId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									destFolderId = infoResponse.body.response.current.id as number;
								} else {
									destFolderId = this.getNodeParameter('destFolderId', i) as number;
								}
								const copyBody: {
									folderIds: number[];
									destFolderId: number;
									deleteAfter: boolean;
								} = {
									folderIds: [folderId],
									destFolderId,
									deleteAfter: false,
								};
								const copyResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/files/fileops/copy',
									undefined,
									copyBody,
								);
								await docspaceResolveAsyncApiResponse.call(this, i, copyResponse.body);
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}`,
								);
								resultDataObject = infoResponse.body;
								break;
							}

							case 'createFolder': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L110
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								let parentId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									parentId = infoResponse.body.response.current.id as number;
								} else {
									parentId = this.getNodeParameter('parentId', i) as number;
								}
								const title = this.getNodeParameter('title', i) as string;
								const body: {
									title: string;
								} = {
									title,
								};
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'POST',
									`api/2.0/files/folder/${parentId}`,
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'deleteFolder': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L126
								const folderId = this.getNodeParameter('folderId', i) as number;
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}`,
								);
								const deleteBody: {
									deleteAfter: boolean;
									immediately: boolean;
								} = {
									deleteAfter: false,
									immediately: false,
								};
								const deleteResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'DELETE',
									`api/2.0/files/folder/${folderId}`,
									undefined,
									deleteBody,
								);
								await docspaceResolveAsyncApiResponse.call(this, i, deleteResponse.body);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'getFolderContents': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L161
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								let folderId: number | string | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									folderId = '@my';
								} else {
									folderId = this.getNodeParameter('folderId', i) as number;
								}
								const queryString = this.getNodeParameter('query', i) as string;
								const query: {
									filterValue?: string;
								} = {};
								if (queryString) {
									query.filterValue = queryString;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/${folderId}`,
									query,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getFolderInfo': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L180
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								let folderId: number | string | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									folderId = infoResponse.body.response.current.id as number;
								} else {
									folderId = this.getNodeParameter('folderId', i) as number;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getFolderHistory': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L64
								const folderId = this.getNodeParameter('folderId', i) as number;
								const fromDate = this.getNodeParameter('fromDate', i) as string;
								const toDate = this.getNodeParameter('toDate', i) as string;
								const query: {
									fromDate?: string;
									toDate?: string;
								} = {};
								if (fromDate) {
									query.fromDate = fromDate;
								}
								if (toDate) {
									query.toDate = toDate;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}/log`,
									query,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getFolderLink': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L287
								const folderId = this.getNodeParameter('folderId', i) as number;
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}/link`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'moveFolder': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L348
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/OperationController.cs/#L173
								const folderId = this.getNodeParameter('folderId', i) as number;
								let destFolderId: number | undefined;
								const isMyDocuments = this.getNodeParameter('isMyDocuments', i) as boolean;
								if (isMyDocuments) {
									const infoQuery: {
										count: number;
									} = {
										count: 1,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/files/@my',
										infoQuery,
									);
									destFolderId = infoResponse.body.response.current.id as number;
								} else {
									destFolderId = this.getNodeParameter('destFolderId', i) as number;
								}
								const moveBody: {
									folderIds: number[];
									destFolderId: number;
									deleteAfter: boolean;
								} = {
									folderIds: [folderId],
									destFolderId,
									deleteAfter: false,
								};
								const moveResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/files/fileops/move',
									undefined,
									moveBody,
								);
								await docspaceResolveAsyncApiResponse.call(this, i, moveResponse.body);
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/folder/${folderId}`,
								);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'updateFolder': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FoldersController.cs/#L255
								const folderId = this.getNodeParameter('folderId', i) as number;
								const title = this.getNodeParameter('title', i) as string;
								const body: {
									title?: string;
								} = {};
								if (title) {
									body.title = title;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/folder/${folderId}`,
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							default: {
								break;
							}
						}

						break;
					}

					case 'room': {
						switch (operation) {
							case 'archiveRoom': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/FilesController.cs/#L305
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L275
								const roomId = this.getNodeParameter('roomId', i, '', {
									extractValue: true,
								}) as string;
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/rooms/${roomId}`,
								);
								const archiveBody: {
									deleteAfter: boolean;
								} = {
									deleteAfter: false,
								};
								const archiveResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/rooms/${roomId}/archive`,
									undefined,
									archiveBody,
								);
								await docspaceResolveAsyncApiResponse.call(this, i, archiveResponse.body);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'createRoom': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L70
								const title = this.getNodeParameter('title', i) as string;
								const roomType = this.getNodeParameter('roomType', i) as number;
								const body: {
									title: string;
									roomType: number;
								} = {
									title,
									roomType,
								};
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'POST',
									'api/2.0/files/rooms',
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getRoomInfo': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L165
								const roomId = this.getNodeParameter('roomId', i, '', {
									extractValue: true,
								}) as string;
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/rooms/${roomId}`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'getRoomLink': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L424
								const roomId = this.getNodeParameter('roomId', i, '', {
									extractValue: true,
								}) as string;
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/rooms/${roomId}/link`,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'inviteUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L311
								const roomId = this.getNodeParameter('roomId', i, 0, {
									extractValue: true,
								}) as number;
								let userId: string | undefined;
								try {
									userId = this.getNodeParameter('userId', i, '', {
										extractValue: true,
									}) as string;
								} catch {}
								let userEmail: string | undefined;
								try {
									userEmail = this.getNodeParameter('userEmail', i) as string;
								} catch {}
								const userAccess = this.getNodeParameter('userAccess', i, 0, {
									extractValue: true,
								}) as number;
								const notify = this.getNodeParameter('notify', i) as boolean;
								let culture: string | undefined;
								try {
									culture = this.getNodeParameter('culture', i, '', {
										extractValue: true,
									}) as string;
								} catch {}
								if (!userId && !userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email',
										{ itemIndex: i },
									);
								}
								if (userId && userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email, not both',
										{ itemIndex: i },
									);
								}
								const shareBody: {
									invitations: [
										{
											id?: string;
											email?: string;
											access: number;
										},
									];
									notify: boolean;
									culture?: string;
								} = {
									invitations: [
										{
											access: userAccess,
										},
									],
									notify,
								};
								if (userId) {
									shareBody.invitations[0].id = userId;
								} else if (userEmail) {
									shareBody.invitations[0].email = userEmail;
								}
								if (culture) {
									shareBody.culture = culture;
								}
								const shareResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/rooms/${roomId}/share`,
									undefined,
									shareBody,
								);
								if (userId) {
									resultDataObject = shareResponse.body.response.members[0];
								} else if (userEmail) {
									const infoQuery: {
										count: number;
										filterBy: string;
										filterOp: string;
										filterValue: string;
									} = {
										count: 1,
										filterBy: 'email',
										filterOp: 'equals',
										filterValue: userEmail,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										`api/2.0/files/rooms/${roomId}/share`,
										infoQuery,
									);
									resultDataObject = infoResponse.body.response[0];
								}
								break;
							}

							case 'removeUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L311
								const roomId = this.getNodeParameter('roomId', i, 0, {
									extractValue: true,
								}) as number;
								let userId: string | undefined;
								try {
									userId = this.getNodeParameter('userId', i, '', {
										extractValue: true,
									}) as string;
								} catch {}
								let userEmail: string | undefined;
								try {
									userEmail = this.getNodeParameter('userEmail', i) as string;
								} catch {}
								if (userId && userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email, not both',
										{ itemIndex: i },
									);
								}
								if (!userId && !userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email',
										{ itemIndex: i },
									);
								}
								const infoQuery: {
									count: number;
									filterBy: string;
									filterOp: string;
									filterValue: string;
								} = {
									count: 1,
									filterBy: 'email',
									filterOp: 'equals',
									filterValue: '',
								};
								if (userId) {
									const userResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										`api/2.0/people/${userId}`,
									);
									infoQuery.filterValue = userResponse.body.response.email;
								} else if (userEmail) {
									infoQuery.filterValue = userEmail;
								}
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/rooms/${roomId}/share`,
									infoQuery,
								);
								const removeBody: {
									invitations: [
										{
											id?: string;
											email?: string;
											access: number;
										},
									];
								} = {
									invitations: [
										{
											access: 0,
										},
									],
								};
								if (userId) {
									removeBody.invitations[0].id = userId;
								} else if (userEmail) {
									removeBody.invitations[0].email = userEmail;
								}
								await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/rooms/${roomId}/share`,
									undefined,
									removeBody,
								);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'searchRoom': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L649
								const queryString = this.getNodeParameter('query', i) as string;
								const query: {
									filterValue?: string;
								} = {};
								if (queryString) {
									query.filterValue = queryString;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									'api/2.0/files/rooms',
									query,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'searchUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L349
								const roomId = this.getNodeParameter('roomId', i, '', {
									extractValue: true,
								}) as string;
								const queryString = this.getNodeParameter('query', i) as string;
								const query: {
									filterValue?: string;
								} = {};
								if (queryString) {
									query.filterValue = queryString;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/files/rooms/${roomId}/share`,
									query,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'updateRoom': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L180
								const roomId = this.getNodeParameter('roomId', i, '', {
									extractValue: true,
								}) as string;
								const title = this.getNodeParameter('title', i) as string;
								const body = {
									title,
								};
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/rooms/${roomId}`,
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'updateUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.Files/Server/Api/VirtualRoomsController.cs/#L311
								const roomId = this.getNodeParameter('roomId', i, 0, {
									extractValue: true,
								}) as number;
								let userId: string | undefined;
								try {
									userId = this.getNodeParameter('userId', i, '', {
										extractValue: true,
									}) as string;
								} catch {}
								let userEmail: string | undefined;
								try {
									userEmail = this.getNodeParameter('userEmail', i) as string;
								} catch {}
								const userAccess = this.getNodeParameter('userAccess', i, 0, {
									extractValue: true,
								}) as number;
								if (!userId && !userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email',
										{ itemIndex: i },
									);
								}
								if (userId && userEmail) {
									throw new NodeOperationError(
										this.getNode(),
										'Must provide either User ID or User Email, not both',
										{ itemIndex: i },
									);
								}
								const shareBody: {
									invitations: [
										{
											id?: string;
											email?: string;
											access: number;
										},
									];
								} = {
									invitations: [
										{
											access: userAccess,
										},
									],
								};
								if (userId) {
									shareBody.invitations[0].id = userId;
								} else if (userEmail) {
									shareBody.invitations[0].email = userEmail;
								}
								const shareResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/files/rooms/${roomId}/share`,
									undefined,
									shareBody,
								);
								if (userId) {
									resultDataObject = shareResponse.body.response.members[0];
								} else if (userEmail) {
									const infoQuery: {
										count: number;
										filterBy: string;
										filterOp: string;
										filterValue: string;
									} = {
										count: 1,
										filterBy: 'email',
										filterOp: 'equals',
										filterValue: userEmail,
									};
									const infoResponse = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										`api/2.0/files/rooms/${roomId}/share`,
										infoQuery,
									);
									resultDataObject = infoResponse.body.response[0];
								}
								break;
							}

							default: {
								break;
							}
						}

						break;
					}

					case 'user': {
						switch (operation) {
							case 'deleteUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L947
								const userId = this.getNodeParameter('userId', i, '', {
									extractValue: true,
								}) as string;
								const body: {
									userIds: string[];
								} = {
									userIds: [userId],
								};
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									'api/2.0/people/delete',
									undefined,
									body,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'disableUser':
							case 'enableUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L890
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L1576
								const userId = this.getNodeParameter('userId', i, '', {
									extractValue: true,
								}) as string;
								let status: number;
								switch (operation) {
									case 'disableUser':
										status = 2;
										break;
									case 'enableUser':
										status = 1;
										break;
								}
								const statusBody: {
									userIds: string[];
								} = {
									userIds: [userId],
								};
								await docspaceJsonApiRequest.call(
									this,
									i,
									'PUT',
									`api/2.0/people/status/${status}`,
									undefined,
									statusBody,
								);
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/people/${userId}`,
								);
								resultDataObject = infoResponse.body.response;
								break;
							}

							case 'getUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L847
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L890
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L1355
								const isMe = this.getNodeParameter('isMe', i) as boolean;
								let response;
								if (isMe) {
									response = await docspaceJsonApiRequest.call(
										this,
										i,
										'GET',
										'api/2.0/people/@self',
									);
								} else {
									let userId: string | undefined;
									try {
										userId = this.getNodeParameter('userId', i, '', {
											extractValue: true,
										}) as string;
									} catch {}
									let userEmail: string | undefined;
									try {
										userEmail = this.getNodeParameter('userEmail', i) as string;
									} catch {}
									if (!userId && !userEmail) {
										throw new NodeOperationError(
											this.getNode(),
											'Must provide either User ID or User Email',
											{ itemIndex: i },
										);
									}
									if (userId && userEmail) {
										throw new NodeOperationError(
											this.getNode(),
											'Must provide either User ID or User Email, not both',
											{ itemIndex: i },
										);
									}
									if (userId) {
										response = await docspaceJsonApiRequest.call(
											this,
											i,
											'GET',
											`api/2.0/people/${userId}`,
										);
									} else if (userEmail) {
										const query = {
											email: userEmail,
										};
										response = await docspaceJsonApiRequest.call(
											this,
											i,
											'GET',
											'api/2.0/people/email',
											query,
										);
									}
								}
								resultDataObject = response.body.response;
								break;
							}

							case 'inviteUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L325
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L811
								const type = this.getNodeParameter('type', i) as number;
								const email = this.getNodeParameter('email', i) as string;
								const culture = this.getNodeParameter('culture', i, '', {
									extractValue: true,
								}) as string;
								const inviteBody: {
									invitations: [
										{
											type: number;
											email: string;
										},
									];
									culture: string;
								} = {
									invitations: [
										{
											type,
											email,
										},
									],
									culture,
								};
								await docspaceJsonApiRequest.call(
									this,
									i,
									'POST',
									'api/2.0/people/invite',
									undefined,
									inviteBody,
								);
								const infoQuery: {
									count: number;
									filterBy: string;
									filterOp: string;
									filterValue: string;
								} = {
									count: 1,
									filterBy: 'email',
									filterOp: 'equals',
									filterValue: email,
								};
								const infoResponse = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									'api/2.0/people/filter',
									infoQuery,
								);
								resultDataObject = infoResponse.body.response[0];
								break;
							}

							case 'searchUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.0.4-server/products/ASC.People/Server/Api/UserController.cs/#L811
								const queryString = this.getNodeParameter('query', i) as string;
								const query: {
									filterValue?: string;
								} = {};
								if (queryString) {
									query.filterValue = queryString;
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									'api/2.0/people/filter',
									query,
								);
								resultDataObject = response.body.response;
								break;
							}

							case 'updateUser': {
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L890
								// https://github.com/ONLYOFFICE/DocSpace-server/blob/v3.1.0-server/products/ASC.People/Server/Api/UserController.cs/#L1941
								const userId = this.getNodeParameter('userId', i, '', {
									extractValue: true,
								}) as string;
								const type = this.getNodeParameter('type', i) as number;
								if (type) {
									const body = {
										type,
										userId,
									};
									await docspaceJsonApiRequest.call(
										this,
										i,
										'POST',
										'api/2.0/people/type',
										undefined,
										body,
									);
									// todo: sync
								}
								const response = await docspaceJsonApiRequest.call(
									this,
									i,
									'GET',
									`api/2.0/people/${userId}`,
								);
								resultDataObject = response.body.response;
								break;
							}

							default: {
								break;
							}
						}

						break;
					}
				}

				if (resultDataObject === undefined && resultBinaryData === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation ${operation} is not recognized for the resource ${resource}`,
						{ itemIndex: i },
					);
				}

				if (resultDataObject === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'The result of an operation cannot be undefined',
						{ itemIndex: i },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					resultDataObject = {
						error: error.message,
					};
				} else {
					throw error;
				}
			}

			if (resultBinaryData) {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
					pairedItem: items[i].pairedItem,
				};
				if (Object.keys(newItem.json).length === 0) {
					newItem.json = resultDataObject;
				}
				if (items[i].binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}
				if (newItem.binary) {
					newItem.binary[binaryPropertyName] = resultBinaryData;
				}
				returnData.push(newItem);
			} else {
				const executionData = this.helpers.returnJsonArray(resultDataObject);
				const executionOptions: INodeExecutionOptions = {
					itemData: {
						item: i,
					},
				};
				const executionMetaData = this.helpers.constructExecutionMetaData(
					executionData,
					executionOptions,
				);
				returnData.push.apply(returnData, executionMetaData);
			}
		}

		return [returnData];
	}
}
