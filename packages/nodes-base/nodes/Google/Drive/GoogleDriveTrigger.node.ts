import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { GoogleDriveTriggerV1 } from './v1/GoogleDriveTriggerV1.node';

export class GoogleDriveTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Drive Trigger',
			name: 'googleDriveTrigger',
			icon: 'file:googleDrive.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Google Drive events occur',
			subtitle: '={{$parameter["event"]}}',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GoogleDriveTriggerV1(baseDescription),
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
