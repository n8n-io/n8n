import {
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';
export namespace SendInBlueNode {
	export interface EmailAttachment {
		content?: string;
		name?: string;
		url?: string;
	}

	export enum OVERRIDE_MAP_TYPE {
		'CATEGORY' = 'category',
		'NORMAL' = 'normal',
		'TRANSACTIONAL' = 'transactional',
	}

	enum OVERRIDE_MAP_VALUES {
		'CATEGORY' = 'category',
		'NORMAL' = 'boolean',
		'TRANSACTIONAL' = 'id',
	}

	export const INTERCEPTORS = new Map<string, (body: JsonObject) => void>([
		[
			OVERRIDE_MAP_TYPE.CATEGORY,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.CATEGORY;
			},
		],
		[
			OVERRIDE_MAP_TYPE.NORMAL,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.NORMAL;
			},
		],
		[
			OVERRIDE_MAP_TYPE.TRANSACTIONAL,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
			},
		],
	]);

	function getFileName(
		itemIndex: number,
		mimeType: string,
		fileExt: string,
		fileName: string,
	): string {
		let ext = fileExt;
		if (fileExt === undefined) {
			ext = mimeType.split('/')[1];
		}

		let name = `${fileName}.${ext}`;
		if (fileName === undefined) {
			name = `file-${itemIndex}.${ext}`;
		}
		return name;
	}

	export async function validateAttachmentsData(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const dataPropertyList = this.getNodeParameter(
			'additionalFields.emailAttachments.attachment',
		) as JsonObject[];
		const { body } = requestOptions;

		const { attachment = [] } = body as { attachment: Array<{ content: string; name: string }> };

		try {
			for (const [, attachmentDataName] of dataPropertyList.entries()) {
				const { binaryPropertyName } = attachmentDataName;

				const item = this.getInputData();

				if (item.binary![binaryPropertyName as string] === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`No binary data property “${binaryPropertyName}” exists on item!`,
					);
				}

				const bufferFromIncomingData = (await this.helpers.getBinaryDataBuffer(
					binaryPropertyName,
				)) as Buffer;

				const {
					data: content,
					mimeType,
					fileName,
					fileExtension,
				} = await this.helpers.prepareBinaryData(bufferFromIncomingData);

				const itemIndex = this.getItemIndex();
				const name = getFileName(
					itemIndex,
					mimeType,
					fileExtension,
					fileName || item.binary!.data.fileName,
				);

				attachment.push({ content, name });
			}

			Object.assign(body as {}, { attachment });

			return requestOptions;
		} catch (err) {
			throw new NodeOperationError(this.getNode(), `${err}`);
		}
	}
}

export namespace SendInBlueWebhookApi {
	interface WebhookDetails {
		url: string;
		id: number;
		description: string;
		events: string[];
		type: string;
		createdAt: string;
		modifiedAt: string;
	}

	interface WebhookId {
		id: string;
	}

	interface Webhooks {
		webhooks: WebhookDetails[];
	}

	const credentialsName = 'sendinblueApi';
	const baseURL = 'https://api.sendinblue.com/v3';
	export const supportedAuthMap = new Map<string, (ref: IWebhookFunctions) => Promise<string>>([
		[
			'apiKey',
			async (ref: IWebhookFunctions): Promise<string> => {
				const credentials = await ref.getCredentials(credentialsName);
				return credentials.sharedSecret as string;
			},
		],
	]);

	export const fetchWebhooks = async (ref: IHookFunctions, type: string): Promise<Webhooks> => {
		const { apiKey } = await ref.getCredentials(credentialsName);
		const endpoint = `${baseURL}/webhooks?type=${type}`;

		const options: OptionsWithUri = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Api-Key': apiKey,
			},
			uri: endpoint,
		};

		const webhooks = (await ref.helpers.requestWithAuthentication.call(
			ref,
			credentialsName,
			options,
		)) as string;

		return JSON.parse(webhooks) as Webhooks;
	};

	export const createWebHook = async (
		ref: IHookFunctions,
		type: string,
		events: string[],
		url: string,
	): Promise<WebhookId> => {
		const { apiKey } = await ref.getCredentials(credentialsName);
		const endpoint = `${baseURL}/webhooks`;

		const options: OptionsWithUri = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Api-Key': apiKey,
			},
			uri: endpoint,
			body: {
				events,
				type,
				url,
			},
		};

		const webhookId = await ref.helpers.requestWithAuthentication.call(
			ref,
			credentialsName,
			options,
		);

		return JSON.parse(webhookId) as WebhookId;
	};

	export const deleteWebhook = async (ref: IHookFunctions, webhookId: string) => {
		const endpoint = `${baseURL}/webhooks/${webhookId}`;
		const { apiKey } = await ref.getCredentials(credentialsName);
		const body = {};

		const options: OptionsWithUri = {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				'Api-Key': apiKey,
			},
			uri: endpoint,
			body,
		};

		return await ref.helpers.requestWithAuthentication.call(ref, credentialsName, options);
	};
}
