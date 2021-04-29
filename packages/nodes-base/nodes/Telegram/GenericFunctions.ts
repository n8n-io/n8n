import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

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
 * @param {IExecuteFunctions} this
 * @param {IDataObject} body The body object to add fields to
 * @param {number} index The index of the item
 * @returns
 */
export function addAdditionalFields(this: IExecuteFunctions, body: IDataObject, index: number) {
	// Add the additional fields
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	Object.assign(body, additionalFields);

	const operation = this.getNodeParameter('operation', index) as string;

	// Add the reply markup
	let replyMarkupOption = '';
	if (operation !== 'sendMediaGroup') {
		replyMarkupOption = this.getNodeParameter('replyMarkup', index) as string;
		if (replyMarkupOption === 'none') {
			return;
		}
	}

	body.reply_markup = {} as IMarkupForceReply | IMarkupReplyKeyboardRemove | ITelegramInlineReply | ITelegramReplyKeyboard;
	if (['inlineKeyboard', 'replyKeyboard'].includes(replyMarkupOption)) {
		let setParameterName = 'inline_keyboard';
		if (replyMarkupOption === 'replyKeyboard') {
			setParameterName = 'keyboard';
		}

		const keyboardData = this.getNodeParameter(replyMarkupOption, index) as IMarkupKeyboard;

		// @ts-ignore
		(body.reply_markup as ITelegramInlineReply | ITelegramReplyKeyboard)[setParameterName] = [] as ITelegramKeyboardButton[][];
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
				((body.reply_markup as ITelegramInlineReply | ITelegramReplyKeyboard)[setParameterName] as ITelegramKeyboardButton[][]).push(sendRows);
			}
		}
	} else if (replyMarkupOption === 'forceReply') {
		const forceReply = this.getNodeParameter('forceReply', index) as IMarkupForceReply;
		body.reply_markup = forceReply;
	} else if (replyMarkupOption === 'replyKeyboardRemove') {
		const forceReply = this.getNodeParameter('replyKeyboardRemove', index) as IMarkupReplyKeyboardRemove;
		body.reply_markup = forceReply;
	}

	if (replyMarkupOption === 'replyKeyboard') {
		const replyKeyboardOptions = this.getNodeParameter('replyKeyboardOptions', index) as IMarkupReplyKeyboardOptions;
		Object.assign(body.reply_markup, replyKeyboardOptions);
	}
}


/**
 * Make an API request to Telegram
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, endpoint: string, body: object, query?: IDataObject, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('telegramApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
		},
		method,
		body,
		qs: query,
		uri: `https://api.telegram.org/bot${credentials.accessToken}/${endpoint}`,
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
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function getImageBySize(photos: IDataObject[], size: string): IDataObject | undefined {

	const sizes = {
		'small': 0,
		'medium': 1,
		'large': 2,
	} as IDataObject;

	const index = sizes[size] as number;

	return photos[index];
}
