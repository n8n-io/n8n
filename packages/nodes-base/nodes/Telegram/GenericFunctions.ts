import { Container } from '@n8n/di';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getSendAndWaitConfig } from '../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../utils/utilities';

// Interface in n8n
export interface IMarkupKeyboard {
	rows?: IMarkupKeyboardRow[];
}

export interface IMarkupKeyboardRow {
	row?: IMarkupKeyboardRow;
}

export interface IMarkupKeyboardRow {
	buttons?: IMarkupKeyboardButton[];
}

export interface IMarkupKeyboardButton {
	text: string;
	additionalFields?: IDataObject;
}

// Interface in Telegram
export interface ITelegramInlineReply {
	inline_keyboard?: ITelegramKeyboardButton[][];
}

export interface ITelegramKeyboardButton {
	[key: string]: string | number | boolean;
}

export interface ITelegramReplyKeyboard extends IMarkupReplyKeyboardOptions {
	keyboard: ITelegramKeyboardButton[][];
}

/**
 * Response of the `getWebhookInfo` endpoint. Every field is optional: the
 * credential's Base URL can point at any host, so a 2xx response does not
 * guarantee the payload Telegram sends.
 */
export interface TelegramWebhookInfo {
	result?: {
		url?: string;
		allowed_updates?: string[];
	};
}

// Shared interfaces
export interface IMarkupForceReply {
	force_reply?: boolean;
	selective?: boolean;
}

export interface IMarkupReplyKeyboardOptions {
	one_time_keyboard?: boolean;
	resize_keyboard?: boolean;
	selective?: boolean;
}

export interface IMarkupReplyKeyboardRemove {
	force_reply?: boolean;
	selective?: boolean;
}

/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {number} index The index of the item
 */
export function addAdditionalFields(
	this: IExecuteFunctions,
	body: IDataObject,
	index: number,
	nodeVersion?: number,
	instanceId?: string,
) {
	const operation = this.getNodeParameter('operation', index);

	// Add the additional fields
	const additionalFields = this.getNodeParameter('additionalFields', index);

	if (operation === 'sendMessage') {
		const attributionText = 'This message was sent automatically with ';
		const link = createUtmCampaignLink('n8n-nodes-base.telegram', instanceId);

		if (nodeVersion && nodeVersion >= 1.1 && additionalFields.appendAttribution === undefined) {
			additionalFields.appendAttribution = true;
		}

		if (!additionalFields.parse_mode) {
			additionalFields.parse_mode = 'Markdown';
		}

		const regex = /(https?|ftp|file):\/\/\S+|www\.\S+|\S+\.\S+/;
		const containsUrl = regex.test(body.text as string);

		if (!containsUrl) {
			body.disable_web_page_preview = true;
		}

		if (additionalFields.appendAttribution) {
			if (additionalFields.parse_mode === 'Markdown') {
				body.text = `${body.text}\n\n_${attributionText}_[n8n](${link})`;
			} else if (additionalFields.parse_mode === 'HTML') {
				body.text = `${body.text}\n\n<em>${attributionText}</em><a href="${link}" target="_blank">n8n</a>`;
			}
		}

		if (
			nodeVersion &&
			nodeVersion >= 1.2 &&
			additionalFields.disable_web_page_preview === undefined
		) {
			body.disable_web_page_preview = true;
		}

		delete additionalFields.appendAttribution;
	}

	Object.assign(body, additionalFields);

	// Add the reply markup
	addReplyMarkup.call(this, body, index);
}

/**
 * Build the `reply_markup` field from the node's reply markup parameters
 *
 * @param {IDataObject} body The body object to add the reply markup to
 * @param {number} index The index of the item
 */
export function addReplyMarkup(this: IExecuteFunctions, body: IDataObject, index: number) {
	const operation = this.getNodeParameter('operation', index);

	let replyMarkupOption = '';
	if (operation !== 'sendMediaGroup') {
		replyMarkupOption = this.getNodeParameter('replyMarkup', index) as string;
		if (replyMarkupOption === 'none') {
			return;
		}
	}

	body.reply_markup = {} as
		| IMarkupForceReply
		| IMarkupReplyKeyboardRemove
		| ITelegramInlineReply
		| ITelegramReplyKeyboard;
	if (['inlineKeyboard', 'replyKeyboard'].includes(replyMarkupOption)) {
		let setParameterName = 'inline_keyboard';
		if (replyMarkupOption === 'replyKeyboard') {
			setParameterName = 'keyboard';
		}

		const keyboardData = this.getNodeParameter(replyMarkupOption, index) as IMarkupKeyboard;

		// @ts-ignore
		(body.reply_markup as ITelegramInlineReply | ITelegramReplyKeyboard)[setParameterName] =
			[] as ITelegramKeyboardButton[][];
		let sendButtonData: ITelegramKeyboardButton;
		if (keyboardData.rows !== undefined) {
			for (const row of keyboardData.rows) {
				const sendRows: ITelegramKeyboardButton[] = [];
				if (row.row?.buttons === undefined) {
					continue;
				}
				for (const button of row.row.buttons) {
					sendButtonData = {};
					sendButtonData.text = button.text;
					if (button.additionalFields) {
						Object.assign(sendButtonData, button.additionalFields);
					}
					sendRows.push(sendButtonData);
				}

				// @ts-ignore
				const array = (body.reply_markup as ITelegramInlineReply | ITelegramReplyKeyboard)[
					setParameterName
				] as ITelegramKeyboardButton[][];
				array.push(sendRows);
			}
		}
	} else if (replyMarkupOption === 'forceReply') {
		const forceReply = this.getNodeParameter('forceReply', index) as IMarkupForceReply;
		body.reply_markup = forceReply;
	} else if (replyMarkupOption === 'replyKeyboardRemove') {
		const forceReply = this.getNodeParameter(
			'replyKeyboardRemove',
			index,
		) as IMarkupReplyKeyboardRemove;
		body.reply_markup = forceReply;
	}

	if (replyMarkupOption === 'replyKeyboard') {
		const replyKeyboardOptions = this.getNodeParameter(
			'replyKeyboardOptions',
			index,
		) as IMarkupReplyKeyboardOptions;
		Object.assign(body.reply_markup, replyKeyboardOptions);
	}
}

/**
 * Make an API request to Telegram
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('telegramApi');

	query = query || {};

	const options: IRequestOptions = {
		headers: {},
		method,
		uri: `${credentials.baseUrl}/bot${credentials.accessToken}/${endpoint}`,
		body,
		qs: query,
		json: true,
	};

	if (Object.keys(option).length > 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function getImageBySize(photos: IDataObject[], size: string): IDataObject | undefined {
	const sizes = {
		small: 0,
		medium: 1,
		large: 2,
		extraLarge: 3,
	} as IDataObject;

	const index = sizes[size] as number;

	return photos[index];
}

export function getPropertyName(operation: string) {
	return operation.replace('send', '').toLowerCase();
}

const FENCE_MARKER_REGEX = /^\s*(`{3,}|~{3,})/;
const TABLE_ROW_REGEX = /^\s*\|.*\|\s*$/;
const HTML_VERBATIM_TAG_REGEX = /<\/?(pre|code)\b[^>]*>/gi;

// An odd number of trailing backslashes is Markdown's own hard-break syntax;
// an even number is an escaped backslash with no line-break meaning.
function hasMarkdownHardBreak(line: string): boolean {
	const trailingBackslashes = /\\+$/.exec(line);
	return trailingBackslashes !== null && trailingBackslashes[0].length % 2 === 1;
}

export function materializeRichMessageLineBreaks(
	content: string,
	format: 'markdown' | 'html',
): string {
	const lines = content.split('\n');
	let inFence = false;
	let fenceToken = '';
	let inVerbatimHtml = false;

	return lines
		.map((line, i) => {
			let isFenceMarker = false;
			if (format === 'markdown') {
				const fenceMatch = FENCE_MARKER_REGEX.exec(line);
				if (fenceMatch) {
					const token = fenceMatch[1];
					if (!inFence) {
						inFence = true;
						fenceToken = token;
						isFenceMarker = true;
					} else if (token[0] === fenceToken[0] && token.length >= fenceToken.length) {
						// Only a delimiter using the same character, at least as long as the
						// opening one, actually closes the fence (same rule CommonMark uses) -
						// a shorter or differently-charactered run is just fence content.
						inFence = false;
						fenceToken = '';
						isFenceMarker = true;
					}
				}
			}

			if (format === 'html') {
				for (const tag of line.matchAll(HTML_VERBATIM_TAG_REGEX)) {
					inVerbatimHtml = !tag[0].startsWith('</');
				}
			}

			const isLastLine = i === lines.length - 1;
			if (isLastLine) return line;

			const nextLine = lines[i + 1];
			const verbatim = isFenceMarker || (format === 'markdown' ? inFence : inVerbatimHtml);
			const hasHardBreak = format === 'markdown' && hasMarkdownHardBreak(line);
			const isSoftBreak =
				!verbatim &&
				!hasHardBreak &&
				line.trim() !== '' &&
				nextLine.trim() !== '' &&
				!(format === 'markdown' && (TABLE_ROW_REGEX.test(line) || TABLE_ROW_REGEX.test(nextLine)));

			return isSoftBreak ? `${line}<br>` : line;
		})
		.join('\n');
}

export function getSecretToken(this: IHookFunctions | IWebhookFunctions) {
	// Only characters A-Z, a-z, 0-9, _ and - are allowed.
	const secret_token = `${this.getWorkflow().id}_${this.getNode().id}`;
	return secret_token.replace(/[^a-zA-Z0-9\_\-]+/g, '');
}

export function createSendAndWaitMessageBody(context: IExecuteFunctions, chatApproval = false) {
	const chat_id = context.getNodeParameter('chatId', 0) as string;

	const config = getSendAndWaitConfig(context);
	let text = config.message;

	if (config.appendAttribution !== false) {
		const instanceId = context.getInstanceId();
		const attributionText = 'This message was sent automatically with ';
		const link = createUtmCampaignLink('n8n-nodes-base.telegram', instanceId);
		text = `${text}\n\n_${attributionText}_[n8n](${link})`;
	}

	const body = {
		chat_id,
		text,

		disable_web_page_preview: true,
		parse_mode: 'Markdown',
		reply_markup: {
			inline_keyboard: [
				config.options.map((option) => {
					if (chatApproval) {
						const executionId = context.getExecutionId();
						const hmacSecret = Container.get(InstanceSettings).hmacSignatureSecret;
						return {
							text: option.label,
							callback_data: buildHitlCallbackReference(
								executionId,
								option.approved ? 'a' : 'd',
								hmacSecret,
							),
						};
					}
					return {
						text: option.label,
						url: option.url,
					};
				}),
			],
		},
	};

	return body;
}
