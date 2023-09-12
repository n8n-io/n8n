import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
export function addAdditionalFields(this: IExecuteFunctions, body: IDataObject, index: number) {
	// Add the additional fields
	const additionalFields = this.getNodeParameter('additionalFields', index);
	Object.assign(body, additionalFields);

	const operation = this.getNodeParameter('operation', index);

	// Add the reply markup
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
				if (row.row === undefined || row.row.buttons === undefined) {
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
				// prettier-ignore
				((body.reply_markup as ITelegramInlineReply | ITelegramReplyKeyboard)[setParameterName] as ITelegramKeyboardButton[][]).push(sendRows);
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
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('telegramApi');

	query = query || {};

	const options: OptionsWithUri = {
		headers: {},
		method,
		uri: `https://api.telegram.org/bot${credentials.accessToken}/${endpoint}`,
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
