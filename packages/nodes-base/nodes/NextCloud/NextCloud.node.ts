import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	sanitizeXmlName,
} from 'n8n-workflow';
import { URLSearchParams } from 'url';
import { parseString } from 'xml2js';

import { deckFields } from './descriptions/Deck.descriptions';
import { nextCloudApiRequest } from './GenericFunctions';
import {
	getBoards,
	getCards,
	getLabels,
	getStacks,
} from './SearchFunctions/Deck/deckSearchFunctions';
import { getUsers } from './SearchFunctions/shared/sharedSearchFunctions';
import { wrapData } from '../../utils/utilities';

export class NextCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nextcloud',
		name: 'nextCloud',
		icon: 'file:nextcloud.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Nextcloud',
		defaults: {
			name: 'Nextcloud',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'nextCloudApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'nextCloudOAuth2Api',
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
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
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
						name: 'Deck',
						value: 'deck',
					},
					{
						name: 'User',
						value: 'user',
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
						name: 'Move',
						value: 'move',
						description: 'Move a file',
						action: 'Move a file',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Share a file',
						action: 'Share a file',
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
						name: 'Copy',
						value: 'copy',
						description: 'Copy a folder',
						action: 'Copy a folder',
					},
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
						name: 'List',
						value: 'list',
						description: 'Return the contents of a given folder',
						action: 'List a folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a folder',
						action: 'Move a folder',
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

			// Deck operations are extracted to descriptions/Deck.descriptions.ts
			// to keep the main node file maintainable.

			...deckFields,

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Invite a user to a NextCloud organization',
						action: 'Create a user',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a user',
						action: 'Delete a user',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve information about a single user',
						action: 'Get a user',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve a list of users',
						action: 'Get many users',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Edit attributes related to a user',
						action: 'Update a user',
					},
				],
				default: 'create',
			},

			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file/folder:copy
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/original.txt',
				description: 'The path of file or folder to copy. The path should start with "/".',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'Delete Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The path to delete. Can be a single file or a whole folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file/folder:move
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/old_name.txt',
				description: 'The path of file or folder to move. The path should start with "/".',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder. The path should start with "/".',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The file path of the file to download. Has to contain the full path. The path should start with "/".',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				hint: 'The name of the output binary field to put the file in',
			},

			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The absolute file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.',
			},
			{
				displayName: 'Binary File',
				name: 'binaryDataUpload',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						binaryDataUpload: [false],
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '',
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						binaryDataUpload: [true],
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '',
				hint: 'The name of the input binary field containing the file to be uploaded',
			},

			// ----------------------------------
			//         file:share
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['share'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The file path of the file to share. Has to contain the full path. The path should start with "/".',
			},
			{
				displayName: 'Share Type',
				name: 'shareType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['share'],
						resource: ['file', 'folder'],
					},
				},
				options: [
					{
						name: 'Circle',
						value: 7,
					},
					{
						name: 'Email',
						value: 4,
					},
					{
						name: 'Group',
						value: 1,
					},
					{
						name: 'Internal Link',
						value: 200,
						description:
							'Generates an internal Nextcloud URL (not a public share). Uses the file/folder ID from a PROPFIND call. The output is { link: "..." }. Do not use with shareWith fields.',
					},
					{
						name: 'Public Link',
						value: 3,
					},
					{
						name: 'User',
						value: 0,
					},
				],
				default: 0,
				description: 'The share permissions to set',
			},
			{
				displayName: 'Circle ID',
				name: 'circleId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [7],
					},
				},
				default: '',
				description: 'The ID of the circle to share with',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [4],
					},
				},
				default: '',
				description: 'The Email address to share with',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [1],
					},
				},
				default: '',
				description: 'The ID of the group to share with',
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
						shareType: [0],
					},
				},
				default: '',
				description: 'The user to share with',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['file', 'folder'],
						operation: ['share'],
					},
				},
				options: [
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: { password: true },
						displayOptions: {
							show: {
								'/resource': ['file', 'folder'],
								'/operation': ['share'],
								'/shareType': [3],
							},
						},
						default: '',
						description: 'Optional search string',
					},
					{
						displayName: 'Permissions',
						name: 'permissions',
						type: 'options',
						options: [
							{
								name: 'All',
								value: 31,
							},
							{
								name: 'Create',
								value: 4,
							},
							{
								name: 'Delete',
								value: 8,
							},
							{
								name: 'Read',
								value: 1,
							},
							{
								name: 'Update',
								value: 2,
							},
						],
						default: 1,
						description: 'The share permissions to set',
					},
				],
			},

			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019',
				description:
					'The folder to create. The parent folder has to exist. The path should start with "/".',
			},

			// ----------------------------------
			//         folder:list
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019/',
				description: 'The path of which to list the content. The path should start with "/".',
			},

			// ----------------------------------
			//         user
			// ----------------------------------

			// ----------------------------------
			//         user:create
			// ----------------------------------
			{
				displayName: 'Username',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				placeholder: 'john',
				description: 'Username the user will have',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				placeholder: 'john@email.com',
				description: 'The email of the user to invite',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Display Name',
						name: 'displayName',
						type: 'string',
						default: '',
						description: 'The display name of the user to invite',
					},
				],
			},
			// ----------------------------------
			//         user:get/delete/update
			// ----------------------------------
			{
				displayName: 'Username',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['delete', 'get', 'update'],
					},
				},
				placeholder: 'john',
				description: 'Username the user will have',
			},
			// ----------------------------------
			//         user:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getAll'],
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
						resource: ['user'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description: 'Optional search string',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: '',
						description: 'Optional offset value',
					},
				],
			},
			// ----------------------------------
			//         user:update
			// ----------------------------------
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Fields',
						name: 'field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'options',
								default: 'email',
								options: [
									{
										name: 'Address',
										value: 'address',
										description: 'The new address for the user',
									},
									{
										name: 'Display Name',
										value: 'displayname',
										description: 'The new display name for the user',
									},
									{
										name: 'Email',
										value: 'email',
										description: 'The new email for the user',
									},
									{
										name: 'Password',
										value: 'password',
										description: 'The new password for the user',
									},
									{
										name: 'Twitter',
										value: 'twitter',
										description: 'The new twitter handle for the user',
									},
									{
										name: 'Website',
										value: 'website',
										description: 'The new website for the user',
									},
								],
								description: 'Key of the updated attribute',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the updated attribute',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			getUsers,
			getBoards,
			getCards,
			getLabels,
			getStacks,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData().slice();
		const returnData: INodeExecutionData[] = [];

		const authenticationMethod = this.getNodeParameter('authentication', 0);
		let credentials;

		if (authenticationMethod === 'accessToken') {
			credentials = await this.getCredentials('nextCloudApi');
		} else {
			credentials = await this.getCredentials('nextCloudOAuth2Api');
		}

		let resource: string = '';
		let operation: string = '';
		let lastOperationWasDownload = false;

		for (let i = 0; i < items.length; i++) {
			let endpoint = '';
			let requestMethod: IHttpRequestMethods = 'GET';
			let responseData: any;

			let body: string | Buffer | IDataObject = '';
			const headers: IDataObject = {};
			let qs;
			// Reinitialize per-iteration so state from a previous item never leaks.
			let useWebDavEndpoint = true;

			resource = this.getNodeParameter('resource', i);
			operation = this.getNodeParameter('operation', i);

			// Must be set before the try block so it still runs when download fails with continueOnFail
			if (resource === 'file' && operation === 'download') {
				lastOperationWasDownload = true;
			}

			try {
				if (resource === 'file') {
					if (operation === 'download') {
						// ----------------------------------
						//         download
						// ----------------------------------

						requestMethod = 'GET';
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'upload') {
						// ----------------------------------
						//         upload
						// ----------------------------------

						requestMethod = 'PUT';
						endpoint = this.getNodeParameter('path', i) as string;

						if (this.getNodeParameter('binaryDataUpload', i) === true) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							this.helpers.assertBinaryData(i, binaryPropertyName);
							body = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						} else {
							// Is text file
							body = this.getNodeParameter('fileContent', i) as string;
						}
					}
				} else if (resource === 'folder') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'MKCOL' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						// PROPFIND is not in the IHttpRequestMethods enum but is required for WebDAV PROPFIND requests
						requestMethod = 'PROPFIND' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
					}
				}

				if (['file', 'folder'].includes(resource)) {
					if (operation === 'copy') {
						// ----------------------------------
						//         copy
						// ----------------------------------

						requestMethod = 'COPY' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
						const toPath = this.getNodeParameter('toPath', i) as string;
						headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						endpoint = this.getNodeParameter('path', i) as string;
					} else if (operation === 'move') {
						// ----------------------------------
						//         move
						// ----------------------------------

						requestMethod = 'MOVE' as IHttpRequestMethods;
						endpoint = this.getNodeParameter('path', i) as string;
						const toPath = this.getNodeParameter('toPath', i) as string;
						headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;
					} else if (operation === 'share') {
						// ----------------------------------
						//         share
						// ----------------------------------

						const shareType = this.getNodeParameter('shareType', i) as number;
						const sharePath = this.getNodeParameter('path', i) as string;

						if (shareType === 200) {
							// Internal Link: not a real OCS share, derive the link from oc:fileid via PROPFIND.
							// PROPFIND is not in the IHttpRequestMethods enum but is required for WebDAV PROPFIND requests
							requestMethod = 'PROPFIND' as IHttpRequestMethods;
							endpoint = sharePath;
							headers['Content-Type'] = 'application/xml';
							headers.Depth = '0';
							body = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid/></d:prop>
</d:propfind>`;
							// useWebDavEndpoint stays true (default) for WebDAV PROPFIND.
						} else {
							// Regular OCS share.
							requestMethod = 'POST';
							useWebDavEndpoint = false;
							endpoint = 'ocs/v2.php/apps/files_sharing/api/v1/shares';
							headers['OCS-APIRequest'] = true;
							headers['Content-Type'] = 'application/x-www-form-urlencoded';

							const bodyParameters = this.getNodeParameter('options', i) as IDataObject;

							bodyParameters.path = sharePath;
							bodyParameters.shareType = shareType;

							if (shareType === 0) {
								bodyParameters.shareWith = this.getNodeParameter('user', i) as string;
							} else if (shareType === 7) {
								bodyParameters.shareWith = this.getNodeParameter('circleId', i) as string;
							} else if (shareType === 4) {
								bodyParameters.shareWith = this.getNodeParameter('email', i) as string;
							} else if (shareType === 1) {
								bodyParameters.shareWith = this.getNodeParameter('groupId', i) as string;
							}

							body = new URLSearchParams(bodyParameters as Record<string, string>).toString();
						}
					}
				} else if (resource === 'deck') {
					if (authenticationMethod !== 'accessToken') {
						throw new NodeOperationError(
							this.getNode(),
							'The Deck resource requires username/password authentication. OAuth2 is not supported by the Nextcloud Deck API.',
						);
					}

					useWebDavEndpoint = false;

					// Build base URL by stripping WebDAV suffix
					const baseUrl = (credentials.webDavUrl as string)
						.replace(/\/remote\.php\/(webdav|dav)\/?$/, '')
						.replace(/\/+$/, '');

					const deckBase = 'index.php/apps/deck/api/v1.1';

					// Build Basic Auth header once
					const user = credentials.user as string;
					const pass = credentials.password as string;
					const basicAuth = Buffer.from(`${user}:${pass}`).toString('base64');

					// Strip leading # from color hex (Deck API expects 31CC7C, not #31CC7C)
					const stripHash = (hex?: string): string => (hex ? hex.replace(/^#/, '') : '');
					const getOwnerUid = (owner: IDataObject | string | undefined): string => {
						if (!owner) return '';
						if (typeof owner === 'string') return owner;
						return String(owner.uid ?? owner.id ?? '');
					};

					// Reusable Deck request helper
					const deckRequest = async (
						method: IHttpRequestMethods,
						path: string,
						body?: IDataObject,
					): Promise<unknown> => {
						return await this.helpers.request({
							method,
							url: `${baseUrl}/${deckBase}${path}`,
							headers: {
								'OCS-APIRequest': 'true',
								'Content-Type': 'application/json',
								Accept: 'application/json',
								Authorization: `Basic ${basicAuth}`,
							},
							body,
							json: true,
						});
					};

					switch (operation) {
						// ------------------------------------------
						// BOARD
						// ------------------------------------------
						case 'listBoards': {
							responseData = await deckRequest('GET', '/boards');
							break;
						}
						case 'getBoard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest('GET', `/boards/${encodeURIComponent(boardId)}`);
							break;
						}
						case 'createBoard': {
							responseData = await deckRequest('POST', '/boards', {
								title: this.getNodeParameter('title', i),
								color: stripHash(this.getNodeParameter('color', i, '') as string),
							} as IDataObject);
							break;
						}

						case 'updateBoard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const boardPath = `/boards/${encodeURIComponent(boardId)}`;
							const currentBoard = (await deckRequest('GET', boardPath)) as IDataObject;
							const updateBody: IDataObject = { ...currentBoard };
							const title = this.getNodeParameter('title', i, '') as string;
							const color = this.getNodeParameter('color', i, '') as string;
							// `undefined` default matches the description's `default: undefined`,
							// so we can detect "user left this untouched" and preserve the server value.
							const archived = this.getNodeParameter('archived', i, undefined) as
								| boolean
								| undefined;
							if (title) updateBody.title = title;
							if (color) updateBody.color = stripHash(color);
							updateBody.owner = getOwnerUid(
								currentBoard.owner as IDataObject | string | undefined,
							);
							// Only include `archived` when the user explicitly toggled it.
							// The Deck API treats PUT as a full replacement, so omitting the field
							// here lets the pre-flight GET value (`{ ...currentBoard }`) survive.
							if (archived !== undefined) updateBody.archived = archived;
							responseData = await deckRequest('PUT', boardPath, updateBody);
							break;
						}
						case 'deleteBoard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest('DELETE', `/boards/${encodeURIComponent(boardId)}`);
							break;
						}

						// ------------------------------------------
						// STACK
						// ------------------------------------------
						case 'listStacks': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'GET',
								`/boards/${encodeURIComponent(boardId)}/stacks`,
							);
							break;
						}
						case 'getStack': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'GET',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}`,
							);
							break;
						}
						case 'createStack': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'POST',
								`/boards/${encodeURIComponent(boardId)}/stacks`,
								{
									title: this.getNodeParameter('title', i),
									order: this.getNodeParameter('order', i),
								} as IDataObject,
							);
							break;
						}
						case 'updateStack': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const stackPath = `/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}`;
							const currentStack = (await deckRequest('GET', stackPath)) as IDataObject;
							const updateBody: IDataObject = { ...currentStack };
							const title = this.getNodeParameter('title', i, '') as string;
							const order = this.getNodeParameter('order', i, undefined) as number;
							if (title) updateBody.title = title;
							if (order !== undefined) updateBody.order = order;
							updateBody.owner = getOwnerUid(
								currentStack.owner as IDataObject | string | undefined,
							);
							responseData = await deckRequest('PUT', stackPath, updateBody);
							break;
						}
						case 'deleteStack': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'DELETE',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}`,
							);
							break;
						}

						// ------------------------------------------
						// CARD (simple — no pre-flight)
						// ------------------------------------------
						case 'listCards': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							// The Deck API has no standalone GET /boards/{id}/stacks/{id}/cards
							// endpoint (it returns 405). Per the official docs, list cards by
							// fetching the parent stack — it returns the stack with an
							// embedded `cards` array.
							const stack = (await deckRequest(
								'GET',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}`,
							)) as IDataObject;
							responseData = (stack?.cards as IDataObject[]) ?? [];
							break;
						}
						case 'getCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'GET',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}`,
							);
							break;
						}
						case 'createCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardBody: IDataObject = {
								title: this.getNodeParameter('title', i),
								type: this.getNodeParameter('type', i, 'plain'),
								order: this.getNodeParameter('order', i, 0),
							};
							const description = this.getNodeParameter('description', i, '') as string;
							const dueDate = this.getNodeParameter('dueDate', i, '') as string;
							if (description) cardBody.description = description;
							if (dueDate) cardBody.duedate = dueDate;
							responseData = await deckRequest(
								'POST',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards`,
								cardBody,
							);
							break;
						}
						case 'deleteCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'DELETE',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}`,
							);
							break;
						}
						case 'assignLabel': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const labelId = this.getNodeParameter('labelId', i, '', {
								extractValue: true,
							}) as string;
							if (!/^\d+$/.test(labelId)) {
								throw new NodeOperationError(
									this.getNode(),
									'The label ID must be a valid number.',
								);
							}
							const parsedLabelId = parseInt(labelId, 10);
							responseData = await deckRequest(
								'PUT',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/assignLabel`,
								{
									labelId: parsedLabelId,
								} as IDataObject,
							);
							break;
						}
						case 'removeLabel': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const labelId = this.getNodeParameter('labelId', i, '', {
								extractValue: true,
							}) as string;
							const parsedLabelId = parseInt(labelId, 10);
							if (Number.isNaN(parsedLabelId)) {
								throw new NodeOperationError(
									this.getNode(),
									'The label ID must be a valid number.',
								);
							}
							responseData = await deckRequest(
								'PUT',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/removeLabel`,
								{
									labelId: parsedLabelId,
								} as IDataObject,
							);
							break;
						}
						case 'assignUser': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const userId = this.getNodeParameter('userId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'PUT',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/assignUser`,
								{
									userId,
								} as IDataObject,
							);
							break;
						}
						case 'unassignUser': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const userId = this.getNodeParameter('userId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'PUT',
								`/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/unassignUser`,
								{
									userId,
								} as IDataObject,
							);
							break;
						}

						// ------------------------------------------
						// CARD (complex — pre-flight GET required)
						// ------------------------------------------
						case 'updateCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const cardPath = `/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}`;

							// Pre-flight: fetch current card so the PUT keeps the existing card data
							const currentCard = (await deckRequest('GET', cardPath)) as IDataObject;

							const updateBody: IDataObject = { ...currentCard };
							const title = this.getNodeParameter('title', i, '') as string;
							const description = this.getNodeParameter('description', i, '') as string;
							const type = this.getNodeParameter('type', i, '') as string;
							const order = this.getNodeParameter('order', i, undefined) as number;
							const dueDate = this.getNodeParameter('dueDate', i, '') as string;

							if (title) updateBody.title = title;
							if (description) updateBody.description = description;
							if (type) updateBody.type = type;
							if (order !== undefined) updateBody.order = order;
							if (dueDate) updateBody.duedate = dueDate;

							// Owner is REQUIRED by Deck API on update – extract the uid string
							const ownerUid = getOwnerUid(currentCard.owner as IDataObject | string | undefined);
							if (ownerUid) {
								updateBody.owner = ownerUid;
							}

							responseData = await deckRequest('PUT', cardPath, updateBody);
							break;
						}

						// ------------------------------------------
						// CARD MOVE (documented endpoint only)
						// ------------------------------------------
						case 'moveCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const targetStackId = this.getNodeParameter('targetStackId', i, '', {
								extractValue: true,
							}) as string;
							const order = this.getNodeParameter('order', i, 0) as number;
							const parsedTargetStackId = parseInt(targetStackId, 10);
							if (Number.isNaN(parsedTargetStackId)) {
								throw new NodeOperationError(
									this.getNode(),
									'The stack ID must be a valid number.',
								);
							}

							const movePath = `/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/reorder`;
							responseData = await deckRequest('PUT', movePath, {
								stackId: parsedTargetStackId,
								order,
							} as IDataObject);
							break;
						}

						// ------------------------------------------
						// CARD ARCHIVE (dedicated endpoints)
						// ------------------------------------------
						case 'archiveCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const archivePath = `/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/archive`;
							responseData = await deckRequest('PUT', archivePath);
							break;
						}
						case 'unarchiveCard': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const stackId = this.getNodeParameter('stackId', i, '', {
								extractValue: true,
							}) as string;
							const cardId = this.getNodeParameter('cardId', i, '', {
								extractValue: true,
							}) as string;
							const unarchivePath = `/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards/${encodeURIComponent(cardId)}/unarchive`;
							responseData = await deckRequest('PUT', unarchivePath);
							break;
						}

						// ------------------------------------------
						// LABEL
						// ------------------------------------------
						case 'createLabel': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'POST',
								`/boards/${encodeURIComponent(boardId)}/labels`,
								{
									title: this.getNodeParameter('title', i),
									color: stripHash(this.getNodeParameter('color', i, '') as string),
								} as IDataObject,
							);
							break;
						}
						case 'updateLabel': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const labelId = this.getNodeParameter('labelId', i, '', {
								extractValue: true,
							}) as string;
							const labelPath = `/boards/${encodeURIComponent(boardId)}/labels/${encodeURIComponent(labelId)}`;
							const currentLabel = (await deckRequest('GET', labelPath)) as IDataObject;
							const updateBody: IDataObject = { ...currentLabel };
							const title = this.getNodeParameter('title', i, '') as string;
							const color = this.getNodeParameter('color', i, '') as string;
							if (title) updateBody.title = title;
							if (color) updateBody.color = stripHash(color);
							responseData = await deckRequest('PUT', labelPath, updateBody);
							break;
						}
						case 'deleteLabel': {
							const boardId = this.getNodeParameter('boardId', i, '', {
								extractValue: true,
							}) as string;
							const labelId = this.getNodeParameter('labelId', i, '', {
								extractValue: true,
							}) as string;
							responseData = await deckRequest(
								'DELETE',
								`/boards/${encodeURIComponent(boardId)}/labels/${encodeURIComponent(labelId)}`,
							);
							break;
						}

						default: {
							throw new NodeOperationError(
								this.getNode(),
								`The operation "${operation}" is not supported for resource "deck".`,
							);
						}
					}

					// Normalize single objects to arrays for consistent n8n output
					if (!Array.isArray(responseData)) {
						responseData = [responseData];
					}

					const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
						itemData: { item: i },
					});
					returnData.push(...executionData);

					// CRITICAL: Skip the centralized nextCloudApiRequest block below
					continue;
				} else if (resource === 'user') {
					useWebDavEndpoint = false;
					if (operation === 'create') {
						// ----------------------------------
						//         user:create
						// ----------------------------------

						requestMethod = 'POST';

						endpoint = 'ocs/v1.php/cloud/users';

						headers['OCS-APIRequest'] = true;
						headers['Content-Type'] = 'application/x-www-form-urlencoded';

						const userid = this.getNodeParameter('userId', i) as string;
						const email = this.getNodeParameter('email', i) as string;

						body = `userid=${userid}&email=${email}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.displayName) {
							body += `&displayName=${additionalFields.displayName}`;
						}
					}
					if (operation === 'delete') {
						// ----------------------------------
						//         user:delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${userid}`;

						headers['OCS-APIRequest'] = true;
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'get') {
						// ----------------------------------
						//         user:get
						// ----------------------------------

						requestMethod = 'GET';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${userid}`;

						headers['OCS-APIRequest'] = true;
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'getAll') {
						// ----------------------------------
						//         user:getAll
						// ----------------------------------

						requestMethod = 'GET';
						const returnAll = this.getNodeParameter('returnAll', i);
						qs = this.getNodeParameter('options', i);
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i);
						}
						endpoint = 'ocs/v1.php/cloud/users';

						headers['OCS-APIRequest'] = true;
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
					if (operation === 'update') {
						// ----------------------------------
						//         user:update
						// ----------------------------------

						requestMethod = 'PUT';

						const userid = this.getNodeParameter('userId', i) as string;
						endpoint = `ocs/v1.php/cloud/users/${userid}`;

						body = Object.entries(this.getNodeParameter('updateFields', i).field as IDataObject)
							.map((entry) => {
								const [key, value] = entry;
								return `${key}=${value}`;
							})
							.join('&');

						headers['OCS-APIRequest'] = true;
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				// Make sure that the webdav URL does never have a trailing slash because
				// one gets added always automatically
				let webDavUrl = credentials.webDavUrl as string;
				if (webDavUrl.slice(-1) === '/') {
					webDavUrl = webDavUrl.slice(0, -1);
				}

				let encoding = undefined;
				if (resource === 'file' && operation === 'download') {
					// Return the data as a buffer
					encoding = null;
				}

				try {
					responseData = await nextCloudApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						headers,
						encoding,
						qs,
						useWebDavEndpoint,
					);
				} catch (error) {
					if (this.continueOnFail()) {
						if (resource === 'file' && operation === 'download') {
							items[i].json = { error: error.message };
						} else {
							returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
						}
						continue;
					}

					throw error;
				}

				if (resource === 'file' && operation === 'download') {
					const newItem: INodeExecutionData = {
						json: items[i].json,
						pairedItem: { item: i },
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary as IBinaryKeyData, items[i].binary);
					}

					items[i] = newItem;

					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

					items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
						responseData as Buffer,
						endpoint,
					);
				} else if (['file', 'folder'].includes(resource) && operation === 'share') {
					const shareType = this.getNodeParameter('shareType', i) as number;

					if (shareType === 200) {
						// Internal Link: responseData is the PROPFIND multistatus XML.
						if (typeof responseData !== 'string') {
							throw new NodeOperationError(
								this.getNode(),
								'Could not retrieve internal link: unexpected response type from NextCloud',
								{ itemIndex: i },
							);
						}

						const propfindData: IDataObject = await new Promise((resolve, reject) => {
							parseString(
								responseData,
								{
									explicitArray: false,
									tagNameProcessors: [sanitizeXmlName],
									attrNameProcessors: [sanitizeXmlName],
								},
								(err, data) => {
									if (err) {
										return reject(err);
									}
									if (!data || typeof data !== 'object') {
										return reject(
											new NodeOperationError(
												this.getNode(),
												'Could not retrieve internal link: invalid XML response structure',
												{ itemIndex: i },
											),
										);
									}
									resolve(data);
								},
							);
						});

						const multistatus = propfindData['d:multistatus'] as IDataObject | undefined;
						if (!multistatus) {
							throw new NodeOperationError(
								this.getNode(),
								'Could not retrieve internal link: malformed PROPFIND response',
								{ itemIndex: i },
							);
						}

						const responses = multistatus['d:response'];
						if (!responses) {
							throw new NodeOperationError(
								this.getNode(),
								'Could not retrieve internal link: malformed PROPFIND response',
								{ itemIndex: i },
							);
						}

						const responseList: IDataObject[] = Array.isArray(responses)
							? (responses as IDataObject[])
							: [responses as IDataObject];

						const matchedResponse = responseList[0];

						let props: IDataObject | undefined;
						const propstat = matchedResponse['d:propstat'];
						if (Array.isArray(propstat)) {
							props = (propstat[0] as IDataObject)['d:prop'] as IDataObject | undefined;
						} else if (propstat && typeof propstat === 'object') {
							props = (propstat as IDataObject)['d:prop'] as IDataObject | undefined;
						}

						const fileid = props?.['oc:fileid'];
						if (typeof fileid !== 'string' || fileid.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'Could not retrieve internal link: oc:fileid not found in PROPFIND response',
								{ itemIndex: i },
							);
						}

						const webDavBase = (credentials.webDavUrl as string).replace(
							/\/remote\.php\/webdav\/?$/,
							'',
						);

						if (webDavBase === credentials.webDavUrl) {
							throw new NodeOperationError(
								this.getNode(),
								'WebDAV URL must end with /remote.php/webdav for generating an internal link. Please check your Nextcloud credentials.',
								{ itemIndex: i },
							);
						}

						const internalLink = `${webDavBase}/f/${fileid}`;
						const executionData = this.helpers.constructExecutionMetaData(
							wrapData({ link: internalLink }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else {
						if (typeof responseData !== 'string') {
							throw new NodeOperationError(
								this.getNode(),
								'Unexpected response type from NextCloud OCS share endpoint',
								{ itemIndex: i },
							);
						}
						const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
							parseString(
								responseData,
								{
									explicitArray: false,
									tagNameProcessors: [sanitizeXmlName],
									attrNameProcessors: [sanitizeXmlName],
								},
								(err, data) => {
									if (err) {
										return reject(err);
									}

									if (data.ocs.meta.status !== 'ok') {
										return reject(
											new NodeApiError(
												this.getNode(),
												(data.ocs.meta.message as JsonObject) ||
													(data.ocs.meta.status as JsonObject),
											),
										);
									}

									if (!data?.ocs?.data || typeof data.ocs.data !== 'object') {
										return reject(
											new NodeApiError(this.getNode(), { error: 'Invalid OCS response structure' }),
										);
									}
									resolve(data.ocs.data);
								},
							);
						});

						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(jsonResponseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				} else if (resource === 'user') {
					if (operation !== 'getAll') {
						const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
							parseString(
								responseData as string,
								{
									explicitArray: false,
									tagNameProcessors: [sanitizeXmlName],
									attrNameProcessors: [sanitizeXmlName],
								},
								(err, data) => {
									if (err) {
										return reject(err);
									}

									if (data.ocs.meta.status !== 'ok') {
										return reject(
											new NodeApiError(
												this.getNode(),
												(data.ocs.meta.message || data.ocs.meta.status) as JsonObject,
											),
										);
									}

									if (operation === 'delete' || operation === 'update') {
										resolve(data.ocs.meta as IDataObject);
									} else {
										resolve(data.ocs.data as IDataObject);
									}
								},
							);
						});

						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(jsonResponseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else {
						const jsonResponseData: IDataObject[] = await new Promise((resolve, reject) => {
							parseString(
								responseData as string,
								{
									explicitArray: false,
									tagNameProcessors: [sanitizeXmlName],
									attrNameProcessors: [sanitizeXmlName],
								},
								(err, data) => {
									if (err) {
										return reject(err);
									}

									if (data.ocs.meta.status !== 'ok') {
										return reject(
											new NodeApiError(this.getNode(), data.ocs.meta.message as JsonObject),
										);
									}

									if (typeof data.ocs.data.users.element === 'string') {
										resolve([data.ocs.data.users.element] as IDataObject[]);
									} else {
										resolve(data.ocs.data.users.element as IDataObject[]);
									}
								},
							);
						});

						jsonResponseData.forEach((value) => {
							returnData.push({ json: { id: value }, pairedItem: { item: i } });
						});
					}
				} else if (resource === 'folder' && operation === 'list') {
					const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
						parseString(
							responseData as string,
							{
								explicitArray: false,
								tagNameProcessors: [sanitizeXmlName],
								attrNameProcessors: [sanitizeXmlName],
							},
							(err, data) => {
								if (err) {
									return reject(err);
								}
								resolve(data as IDataObject);
							},
						);
					});

					const propNames: { [key: string]: string } = {
						'd:getlastmodified': 'lastModified',
						'd:getcontentlength': 'contentLength',
						'd:getcontenttype': 'contentType',
					};

					if (
						jsonResponseData['d:multistatus'] !== undefined &&
						jsonResponseData['d:multistatus'] !== null &&
						(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== undefined &&
						(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== null
					) {
						let skippedFirst = false;
						// @ts-ignore
						if (Array.isArray(jsonResponseData['d:multistatus']['d:response'])) {
							// @ts-ignore
							for (const item of jsonResponseData['d:multistatus']['d:response']) {
								if (!skippedFirst) {
									skippedFirst = true;
									continue;
								}
								const newItem: IDataObject = {};

								newItem.path = item['d:href'].slice(19);

								let props: IDataObject = {};
								if (Array.isArray(item['d:propstat'])) {
									props = item['d:propstat'][0]['d:prop'] as IDataObject;
								} else {
									props = item['d:propstat']['d:prop'] as IDataObject;
								}

								// Get the props and save them under a proper name
								for (const propName of Object.keys(propNames)) {
									if (props[propName] !== undefined) {
										newItem[propNames[propName]] = props[propName];
									}
								}

								if (props['d:resourcetype'] === '') {
									newItem.type = 'file';
								} else {
									newItem.type = 'folder';
								}
								// @ts-ignore
								newItem.eTag = props['d:getetag'].slice(1, -1);

								returnData.push({ json: newItem, pairedItem: { item: i } });
							}
						}
					}
				} else {
					const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
						itemData: { item: i },
					});

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					}
					continue;
				}
				throw error;
			}
			if (resource === 'file' && operation === 'download') {
				lastOperationWasDownload = true;
			}
		}

		if (lastOperationWasDownload) {
			// For file downloads the files get attached to the existing items
			return [items];
		} else {
			// For all other ones does the output get replaced
			return [returnData];
		}
	}
}
