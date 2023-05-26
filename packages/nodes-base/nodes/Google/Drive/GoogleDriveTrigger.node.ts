import type {
	IPollFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { extractId, googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

import moment from 'moment';
import { fileSearch, folderSearch } from './SearchFunctions';

export class GoogleDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive Trigger',
		name: 'googleDriveTrigger',
		icon: 'file:googleDrive.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Google Drive events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Google Drive Trigger',
		},
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
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Credential Type',
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
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Changes to a Specific File',
						value: 'specificFile',
					},
					{
						name: 'Changes Involving a Specific Folder',
						value: 'specificFolder',
					},
					// {
					// 	name: 'Changes To Any File/Folder',
					// 	value: 'anyFileFolder',
					// },
				],
			},
			{
				displayName: 'File',
				name: 'fileToWatch',
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
						placeholder: 'https://drive.google.com/file/d/1wroCSfK-hupQIYf_xzeoUEzOhvfTFH2P/edit',
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
				displayOptions: {
					show: {
						triggerOn: ['specificFile'],
					},
				},
			},
			{
				displayName: 'Watch For',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						triggerOn: ['specificFile'],
					},
				},
				required: true,
				default: 'fileUpdated',
				options: [
					{
						name: 'File Updated',
						value: 'fileUpdated',
					},
				],
				description: 'When to trigger this node',
			},
			{
				displayName: 'Folder',
				name: 'folderToWatch',
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
							regex:
								'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
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
				displayOptions: {
					show: {
						triggerOn: ['specificFolder'],
					},
				},
			},
			{
				displayName: 'Watch For',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						triggerOn: ['specificFolder'],
					},
				},
				required: true,
				default: '',
				options: [
					{
						name: 'File Created',
						value: 'fileCreated',
						description: 'When a file is created in the watched folder',
					},
					{
						name: 'File Updated',
						value: 'fileUpdated',
						description: 'When a file is updated in the watched folder',
					},
					{
						name: 'Folder Created',
						value: 'folderCreated',
						description: 'When a folder is created in the watched folder',
					},
					{
						name: 'Folder Updated',
						value: 'folderUpdated',
						description: 'When a folder is updated in the watched folder',
					},
					{
						name: 'Watch Folder Updated',
						value: 'watchFolderUpdated',
						description: 'When the watched folder itself is modified',
					},
				],
			},
			{
				displayName: "Changes within subfolders won't trigger this node",
				name: 'asas',
				type: 'notice',
				displayOptions: {
					show: {
						triggerOn: ['specificFolder'],
					},
					hide: {
						event: ['watchFolderUpdated'],
					},
				},
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Drive To Watch',
				name: 'driveToWatch',
				type: 'options',
				displayOptions: {
					show: {
						triggerOn: ['anyFileFolder'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getDrives',
				},
				default: 'root',
				required: true,
				description:
					'The drive to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Watch For',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						triggerOn: ['anyFileFolder'],
					},
				},
				required: true,
				default: 'fileCreated',
				options: [
					{
						name: 'File Created',
						value: 'fileCreated',
						description: 'When a file is created in the watched drive',
					},
					{
						name: 'File Updated',
						value: 'fileUpdated',
						description: 'When a file is updated in the watched drive',
					},
					{
						name: 'Folder Created',
						value: 'folderCreated',
						description: 'When a folder is created in the watched drive',
					},
					{
						name: 'Folder Updated',
						value: 'folderUpdated',
						description: 'When a folder is updated in the watched drive',
					},
				],
				description: 'When to trigger this node',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						event: ['fileCreated', 'fileUpdated'],
					},
					hide: {
						triggerOn: ['specificFile'],
					},
				},
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'File Type',
						name: 'fileType',
						type: 'options',
						options: [
							{
								name: '[All]',
								value: 'all',
							},
							{
								name: 'Audio',
								value: 'application/vnd.google-apps.audio',
							},
							{
								name: 'Google Docs',
								value: 'application/vnd.google-apps.document',
							},
							{
								name: 'Google Drawings',
								value: 'application/vnd.google-apps.drawing',
							},
							{
								name: 'Google Slides',
								value: 'application/vnd.google-apps.presentation',
							},
							{
								name: 'Google Spreadsheets',
								value: 'application/vnd.google-apps.spreadsheet',
							},
							{
								name: 'Photos and Images',
								value: 'application/vnd.google-apps.photo',
							},
							{
								name: 'Videos',
								value: 'application/vnd.google-apps.video',
							},
						],
						default: 'all',
						description: 'Triggers only when the file is this type',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			fileSearch,
			folderSearch,
		},
		loadOptions: {
			// Get all the calendars to display them to user so that they can
			// select them easily
			async getDrives(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const drives = await googleApiRequestAllItems.call(
					this,
					'drives',
					'GET',
					'/drive/v3/drives',
				);
				returnData.push({
					name: 'Root',
					value: 'root',
				});
				for (const drive of drives) {
					returnData.push({
						name: drive.name,
						value: drive.id,
					});
				}
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const event = this.getNodeParameter('event') as string;
		const webhookData = this.getWorkflowStaticData('node');
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const qs: IDataObject = {};

		const now = moment().utc().format();

		const startDate = (webhookData.lastTimeChecked as string) || now;

		const endDate = now;

		const query = ['trashed = false'];

		if (triggerOn === 'specificFolder' && event !== 'watchFolderUpdated') {
			const folderToWatch = extractId(
				this.getNodeParameter('folderToWatch', '', { extractValue: true }) as string,
			);
			query.push(`'${folderToWatch}' in parents`);
		}

		// if (triggerOn === 'anyFileFolder') {
		// 	const driveToWatch = this.getNodeParameter('driveToWatch');
		// 	query.push(`'${driveToWatch}' in parents`);
		// }

		if (event.startsWith('file')) {
			query.push("mimeType != 'application/vnd.google-apps.folder'");
		} else {
			query.push("mimeType = 'application/vnd.google-apps.folder'");
		}

		if (options.fileType && options.fileType !== 'all') {
			query.push(`mimeType = '${options.fileType}'`);
		}

		if (this.getMode() !== 'manual') {
			if (event.includes('Created')) {
				query.push(`createdTime > '${startDate}'`);
			} else {
				query.push(`modifiedTime > '${startDate}'`);
			}
		}

		qs.q = query.join(' AND ');

		qs.fields = 'nextPageToken, files(*)';

		let files;

		if (this.getMode() === 'manual') {
			qs.pageSize = 1;
			files = await googleApiRequest.call(this, 'GET', '/drive/v3/files', {}, qs);
			files = files.files;
		} else {
			files = await googleApiRequestAllItems.call(this, 'files', 'GET', '/drive/v3/files', {}, qs);
		}

		if (triggerOn === 'specificFile' && this.getMode() !== 'manual') {
			const fileToWatch = extractId(
				this.getNodeParameter('fileToWatch', '', { extractValue: true }) as string,
			);
			files = files.filter((file: { id: string }) => file.id === fileToWatch);
		}

		if (
			triggerOn === 'specificFolder' &&
			event === 'watchFolderUpdated' &&
			this.getMode() !== 'manual'
		) {
			const folderToWatch = extractId(
				this.getNodeParameter('folderToWatch', '', { extractValue: true }) as string,
			);
			files = files.filter((file: { id: string }) => file.id === folderToWatch);
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(files) && files.length) {
			return [this.helpers.returnJsonArray(files)];
		}

		if (this.getMode() === 'manual') {
			throw new NodeApiError(this.getNode(), {
				message: 'No data with the current filter could be found',
			});
		}

		return null;
	}
}
