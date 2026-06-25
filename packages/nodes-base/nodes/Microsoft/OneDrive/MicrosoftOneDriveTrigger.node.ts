import { DateTime } from 'luxon';
import {
	type IPollFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { targetDescription } from './descriptions/TargetDescription';
import {
	driveEndpoint,
	getOneDriveCredentialType,
	getPath,
	microsoftApiRequest,
	microsoftApiRequestAllItemsDelta,
	resolveDriveScopeRoot,
} from './GenericFunctions';
import { triggerDescription } from './TriggerDescription';

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
				displayOptions: {
					show: {
						authentication: ['microsoftOneDriveOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftEntraServicePrincipalApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'OneDrive OAuth2',
						value: 'microsoftOneDriveOAuth2Api',
					},
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Enable the scopes this node needs (e.g. Files.ReadWrite.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: 'microsoftEntraServicePrincipalApi',
						description:
							'App-only access via a Microsoft Entra app registration. Choose which user or drive to watch under "Access As".',
					},
				],
				default: 'microsoftOneDriveOAuth2Api',
			},
			...targetDescription,
			...triggerDescription,
		],
	};

	methods = {
		loadOptions: {},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const workflowData = this.getWorkflowStaticData('node');
		let responseData: IDataObject[];

		const credentials = await this.getCredentials(getOneDriveCredentialType.call(this));
		const baseUrl = (
			typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
				? credentials.graphApiBaseUrl
				: 'https://graph.microsoft.com'
		).replace(/\/+$/, '');

		// App-only Graph has no `/me`, so the delta feed is rooted at the chosen
		// user/drive. `undefined` for OAuth2 → fall back to `/me/drive`.
		const driveScopeRoot = resolveDriveScopeRoot.call(this, true);
		const deltaRoot = `${baseUrl}/v1.0${driveScopeRoot ? driveEndpoint(driveScopeRoot) : '/me/drive'}/root/delta`;

		// Reset a persisted delta link that belongs to a different scope (auth switched,
		// or the target id changed) so polling stays on the currently-configured drive.
		const persistedLastLink = workflowData.LastLink as string | undefined;
		const hasValidScope = persistedLastLink?.startsWith(deltaRoot) ?? false;
		const lastLink: string = hasValidScope
			? (persistedLastLink as string)
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
				responseData = (await microsoftApiRequest.call(this, 'GET', '', {}, {}, deltaRoot))
					.value as IDataObject[];
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
