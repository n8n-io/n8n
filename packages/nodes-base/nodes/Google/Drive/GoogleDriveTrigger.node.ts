import {
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import * as moment from 'moment';

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
			color: '#4285F4',
		},
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'googleDriveOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
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
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				required: true,
				default: 'fileCreated',
				description: 'The resource whose events trigger the webhook.',
				options: [
					{
						name: 'File Created',
						value: 'fileCreated',
					},
					{
						name: 'File Modified',
						value: 'fileModified',
					},
					{
						name: 'Folder Created',
						value: 'folderCreated',
					},
					{
						name: 'Folder Updated',
						value: 'folderUpdated',
					},
				],
			},
			{
				displayName: 'Within',
				name: 'within',
				type: 'options',
				required: true,
				default: 'drive',
				options: [
					{
						name: 'Drive',
						value: 'drive',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
				],
			},
			{
				displayName: 'Drive Name/ID',
				name: 'driveId',
				type: 'options',
				displayOptions: {
					show: {
						within: [
							'drive',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getDrives',
				},
				default: 'root',
				required: true,
				description: 'The drive to monitor',
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				displayOptions: {
					show: {
						within: [
							'folder',
						],
					},
				},
				default: '',
				description: 'The folder to monitor',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						triggerOn: [
							'fileCreated',
							'fileModified',
						],
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
								name: 'Google Docs',
								value: 'application/vnd.google-apps.document',
							},
							{
								name: 'Google Spreadsheets',
								value: 'application/vnd.google-apps.spreadsheet',
							},
							{
								name: 'Google Slides',
								value: 'application/vnd.google-apps.presentation',
							},
							{
								name: 'Google Drawings',
								value: 'application/vnd.google-apps.drawing',
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
		loadOptions: {
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getDrives(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const drives = await googleApiRequestAllItems.call(this, 'drives', 'GET', `/drive/v3/drives`);
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
		const within = this.getNodeParameter('within') as string;
		const webhookData = this.getWorkflowStaticData('node');
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const qs: IDataObject = {};

		const now = moment().utc().format();

		const startDate = webhookData.lastTimeChecked as string || now;

		const endDate = now;

		const parent = (within === 'drive') ? this.getNodeParameter('driveId') : this.getNodeParameter('folderId');

		const query = [
			'trashed = false',
			`'${parent}' in parents`,
		];

		if (triggerOn.startsWith('file')) {
			query.push(`mimeType != 'application/vnd.google-apps.folder'`);
		} else {
			query.push(`mimeType = 'application/vnd.google-apps.folder'`);
		}

		if (triggerOn.includes('Created')) {
			query.push(`createdTime > '${startDate}'`);
		} else {
			query.push(`modifiedTime > '${startDate}'`);
		}

		if (options.fileType && options.fileType !== 'all') {
			query.push(`mimeType = '${options.fileType}'`);
		}

		qs.q = query.join(' AND ');

		qs.fields = 'nextPageToken, files(*)';

		let files;

		if (this.getMode() === 'manual') {
			qs.q = '';
			qs.pageSize = 1;
			files = await googleApiRequest.call(this, 'GET', `/drive/v3/files`, {}, qs);
			files = files.files;
		} else {
			files = await googleApiRequestAllItems.call(this, 'files', 'GET', `/drive/v3/files`, {}, qs);
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(files) && files.length) {
			return [this.helpers.returnJsonArray(files)];
		}

		return null;
	}
}
