import { DateTime } from 'luxon';
import {
	type IPollFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
	requestPath,
} from 'n8n-workflow';

import { getPath, microsoftApiRequest, microsoftApiRequestAllItemsDelta } from './GenericFunctions';
import { triggerDescription } from './TriggerDescription';

// Compare decoded pathnames so that encoding differences (e.g. `@` vs `%40`) keep the
// link, but require the same origin first because the link is sent with the credential.
function isInDeltaScope(link: string, deltaRoot: string): boolean {
	try {
		const linkUrl = new URL(link);
		const rootUrl = new URL(deltaRoot);
		return (
			linkUrl.origin === rootUrl.origin &&
			decodeURIComponent(linkUrl.pathname).startsWith(decodeURIComponent(rootUrl.pathname))
		);
	} catch {
		return false;
	}
}

export class MicrosoftOneDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft OneDrive Trigger',
		name: 'microsoftOneDriveTrigger',
		icon: 'file:oneDrive.svg',
		group: ['trigger'],
		version: 1,
		description: 'Trigger for Microsoft OneDrive API.',
		subtitle: '={{($parameter["event"])}}',
		defaults: {
			name: 'Microsoft OneDrive Trigger',
		},
		credentials: [
			{
				name: 'microsoftOneDriveOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [...triggerDescription],
	};

	methods = {
		loadOptions: {},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const workflowData = this.getWorkflowStaticData('node');
		let responseData: IDataObject[];

		const deltaRoot = 'https://graph.microsoft.com/v1.0/me/drive/root/delta';

		// Use a persisted delta link only when it points to the delta feed of this drive.
		const persistedLastLink = workflowData.LastLink as string | undefined;
		const lastLink: string =
			persistedLastLink && isInDeltaScope(persistedLastLink, deltaRoot)
				? persistedLastLink
				: `${deltaRoot}?token=latest`;

		const now = DateTime.now().toUTC();
		const start = DateTime.fromISO(workflowData.lastTimeChecked as string) || now;
		const end = now;
		const event = this.getNodeParameter('event', 'fileCreated') as string;
		const watch = this.getNodeParameter('watch', 'anyFile') as string;
		const watchFolder = (this.getNodeParameter('watchFolder', false) as boolean) || false;
		const folderChild = (this.getNodeParameter('options.folderChild', false) as boolean) || false;

		let eventType = 'created';
		let eventResource = 'file';
		if (event.includes('Updated')) {
			eventType = 'updated';
		}
		if (event.includes('folder')) {
			eventResource = 'folder';
		}
		try {
			if (this.getMode() === 'manual') {
				responseData = (
					await microsoftApiRequest.call(this, 'GET', requestPath``, {}, {}, deltaRoot)
				).value as IDataObject[];
			} else {
				const response: IDataObject = (await microsoftApiRequestAllItemsDelta.call(
					this,
					lastLink,
					start,
					eventType,
				)) as IDataObject;
				responseData = response.returnData as IDataObject[];
				workflowData.LastLink = response.deltaLink;
			}

			workflowData.lastTimeChecked = end.toISO();
			if (watch === 'selectedFile') {
				const fileId = (
					this.getNodeParameter('fileId', '', {
						extractValue: true,
					}) as string
				).replace('%21', '!');
				if (fileId) {
					responseData = responseData.filter((item: IDataObject) => item.id === fileId);
				}
			}

			if (
				!folderChild &&
				(watch === 'oneSelectedFolder' || watch === 'selectedFolder' || watchFolder)
			) {
				const folderId = (
					this.getNodeParameter('folderId', '', {
						extractValue: true,
					}) as string
				).replace('%21', '!');
				if (folderId) {
					if (watch === 'oneSelectedFolder') {
						responseData = responseData.filter((item: IDataObject) => item.id === folderId);
					} else {
						responseData = responseData.filter(
							(item: IDataObject) => (item.parentReference as IDataObject).id === folderId,
						);
					}
				}
			}
			if (folderChild && (watch === 'selectedFolder' || watchFolder)) {
				const folderId = (
					this.getNodeParameter('folderId', '', {
						extractValue: true,
					}) as string
				).replace('%21', '!');
				const folderPath = await getPath.call(this, folderId);

				responseData = responseData.filter((item: IDataObject) => {
					const path = (item.parentReference as IDataObject)?.path as string;
					return typeof path === 'string' && path.startsWith(folderPath);
				});
			}
			responseData = responseData.filter((item: IDataObject) => item[eventResource]);
			if (!responseData?.length) {
				return null;
			}

			const simplify = this.getNodeParameter('simple') as boolean;
			if (simplify) {
				responseData = responseData.map((x) => ({
					id: x.id,
					createdDateTime: (x.fileSystemInfo as IDataObject)?.createdDateTime,
					lastModifiedDateTime: (x.fileSystemInfo as IDataObject)?.lastModifiedDateTime,
					name: x.name,
					webUrl: x.webUrl,
					size: x.size,
					path: (x.parentReference as IDataObject)?.path || '',
					mimeType: (x.file as IDataObject)?.mimeType || '',
				}));
			}

			return [this.helpers.returnJsonArray(responseData)];
		} catch (error) {
			if (this.getMode() === 'manual' || !workflowData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			const node = this.getNode();
			this.logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
			throw error;
		}

		return null;
	}
}
