import type {
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';
import MailComposer from 'nodemailer/lib/mail-composer';
export namespace SendInBlueNode {
	type ValidEmailFields = { to: string } | { sender: string } | { cc: string } | { bcc: string };
	type Address = { address: string; name?: string };
	type Email = { email: string; name?: string };
	type ToEmail = { to: Email[] };
	type SenderEmail = { sender: Email };
	type CCEmail = { cc: Email[] };
	type BBCEmail = { bbc: Email[] };
	type ValidatedEmail = ToEmail | SenderEmail | CCEmail | BBCEmail;

	enum OVERRIDE_MAP_VALUES {
		'CATEGORY' = 'category',
		'NORMAL' = 'boolean',
		'TRANSACTIONAL' = 'id',
	}

	enum OVERRIDE_MAP_TYPE {
		'CATEGORY' = 'category',
		'NORMAL' = 'normal',
		'TRANSACTIONAL' = 'transactional',
	}

	export const INTERCEPTORS = new Map<string, (body: JsonObject) => void>([
		[
			OVERRIDE_MAP_TYPE.CATEGORY,
			(body: JsonObject) => {
				body.type = OVERRIDE_MAP_VALUES.CATEGORY;
			},
		],
		[
			OVERRIDE_MAP_TYPE.NORMAL,
			(body: JsonObject) => {
				body.type = OVERRIDE_MAP_VALUES.NORMAL;
			},
		],
		[
			OVERRIDE_MAP_TYPE.TRANSACTIONAL,
			(body: JsonObject) => {
				body.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
			},
		],
	]);
	export namespace Validators {
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

		export async function validateAndCompileAttachmentsData(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const dataPropertyList = this.getNodeParameter(
				'additionalFields.emailAttachments.attachment',
			) as JsonObject;
			const { body } = requestOptions;

			const { attachment = [] } = body as { attachment: Array<{ content: string; name: string }> };

			try {
				const { binaryPropertyName } = dataPropertyList;
				const dataMappingList = (binaryPropertyName as string).split(',');
				for (const attachmentDataName of dataMappingList) {
					const binaryPropertyAttachmentName = attachmentDataName;

					const item = this.getInputData();

					if (item.binary![binaryPropertyAttachmentName] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`Item has no binary property called "${binaryPropertyName}"`,
						);
					}

					const bufferFromIncomingData = await this.helpers.getBinaryDataBuffer(
						binaryPropertyAttachmentName,
					);

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
						fileExtension!,
						fileName || item.binary!.data.fileName!,
					);

					attachment.push({ content, name });
				}

				Object.assign(body!, { attachment });

				return requestOptions;
			} catch (err) {
				throw new NodeOperationError(this.getNode(), err as Error);
			}
		}

		export async function validateAndCompileTags(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const { tag } = this.getNodeParameter('additionalFields.emailTags.tags') as JsonObject;
			const tags = (tag as string)
				.split(',')
				.map((entry) => entry.trim())
				.filter((entry) => {
					return entry !== '';
				});
			const { body } = requestOptions;
			Object.assign(body!, { tags });
			return requestOptions;
		}

		function formatToEmailName(data: Address): Email {
			const { address: email, name } = data;
			const result = { email };
			if (name !== undefined && name !== '') {
				Object.assign(result, { name });
			}
			return { ...result };
		}

		function validateEmailStrings(input: ValidEmailFields): ValidatedEmail {
			const composer = new MailComposer({ ...input });
			const addressFields = composer.compile().getAddresses();

			const fieldFetcher = new Map<string, () => Email[] | Email>([
				[
					'bcc',
					() => {
						return (addressFields.bcc as unknown as Address[])?.map(formatToEmailName);
					},
				],
				[
					'cc',
					() => {
						return (addressFields.cc as unknown as Address[])?.map(formatToEmailName);
					},
				],
				[
					'from',
					() => {
						return (addressFields.from as unknown as Address[])?.map(formatToEmailName);
					},
				],
				[
					'reply-to',
					() => {
						return (addressFields['reply-to'] as unknown as Address[])?.map(formatToEmailName);
					},
				],
				[
					'sender',
					() => {
						return (addressFields.sender as unknown as Address[])?.map(formatToEmailName)[0];
					},
				],
				[
					'to',
					() => {
						return (addressFields.to as unknown as Address[])?.map(formatToEmailName);
					},
				],
			]);

			const result: { [key in keyof ValidatedEmail]: Email[] | Email } = {} as ValidatedEmail;
			Object.keys(input).reduce((obj: { [key: string]: Email[] | Email }, key: string) => {
				const getter = fieldFetcher.get(key);
				const value = getter!();
				obj[key] = value;
				return obj;
			}, result);

			return result as ValidatedEmail;
		}

		export async function validateAndCompileCCEmails(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const ccData = this.getNodeParameter(
				'additionalFields.receipientsCC.receipientCc',
			) as JsonObject;
			const { cc } = ccData;
			const { body } = requestOptions;
			const data = validateEmailStrings({ cc: cc as string });
			Object.assign(body!, data);

			return requestOptions;
		}

		export async function validateAndCompileBCCEmails(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const bccData = this.getNodeParameter(
				'additionalFields.receipientsBCC.receipientBcc',
			) as JsonObject;
			const { bcc } = bccData;
			const { body } = requestOptions;
			const data = validateEmailStrings({ bcc: bcc as string });
			Object.assign(body!, data);

			return requestOptions;
		}

		export async function validateAndCompileReceipientEmails(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const to = this.getNodeParameter('receipients') as string;
			const { body } = requestOptions;
			const data = validateEmailStrings({ to });
			Object.assign(body!, data);

			return requestOptions;
		}

		export async function validateAndCompileSenderEmail(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const sender = this.getNodeParameter('sender') as string;
			const { body } = requestOptions;
			const data = validateEmailStrings({ sender });
			Object.assign(body!, data);

			return requestOptions;
		}

		export async function validateAndCompileTemplateParameters(
			this: IExecuteSingleFunctions,
			requestOptions: IHttpRequestOptions,
		): Promise<IHttpRequestOptions> {
			const parameterData = this.getNodeParameter(
				'additionalFields.templateParameters.parameterValues',
			);
			const { body } = requestOptions;
			const { parameters } = parameterData as JsonObject;
			const params = (parameters as string)
				.split(',')
				.filter((parameter) => {
					return parameter.split('=').length === 2;
				})
				.map((parameter) => {
					const [key, value] = parameter.split('=');
					return {
						[key]: value,
					};
				})
				.reduce((obj, cObj) => {
					Object.assign(obj, cObj);
					return obj;
				}, {});

			Object.assign(body!, { params });
			return requestOptions;
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

	const credentialsName = 'sendInBlueApi';
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
		const endpoint = `${baseURL}/webhooks?type=${type}`;

		const options: OptionsWithUri = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
			uri: endpoint,
		};

		const webhooks = (await ref.helpers.requestWithAuthentication.call(
			ref,
			credentialsName,
			options,
		)) as string;

		return jsonParse(webhooks);
	};

	export const createWebHook = async (
		ref: IHookFunctions,
		type: string,
		events: string[],
		url: string,
	): Promise<WebhookId> => {
		const endpoint = `${baseURL}/webhooks`;

		const options: OptionsWithUri = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
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

		return jsonParse(webhookId as string);
	};

	export const deleteWebhook = async (ref: IHookFunctions, webhookId: string) => {
		const endpoint = `${baseURL}/webhooks/${webhookId}`;
		const body = {};

		const options: OptionsWithUri = {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
			},
			uri: endpoint,
			body,
		};

		return ref.helpers.requestWithAuthentication.call(ref, credentialsName, options);
	};
}
