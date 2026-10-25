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
// Telegram does not read lines indented with a tab as code.
const INDENTED_CODE_REGEX = /^ {4}/;
const BACKTICK_RUN_REGEX = /`+/g;
const TABLE_ROW_REGEX = /^\s*\|.*\|\s*$/;
// A table delimiter row, with or without outer pipes: `|---|:--:|` or `--- | ---`.
const TABLE_DELIMITER_ROW_REGEX = /^\s*(\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?|\|\s*:?-+:?\s*\|)\s*$/;
const BLOCKQUOTE_PREFIX_REGEX = /^\s*(>\s?)+/;
const HTML_VERBATIM_TAG_REGEX = /<\/?(pre|code)\b[^>]*>/gi;
// Block-level tags already start a new line, and <br> already is one,
// so a break next to them would add an empty line.
const HTML_BLOCK_TAG =
	'(?:br|hr|p|div|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|caption|blockquote|pre|h[1-6]|details|summary|figure|figcaption)';
const HTML_BLOCK_TAG_AT_END_REGEX = new RegExp(`<\\/?${HTML_BLOCK_TAG}\\b[^>]*>\\s*$`, 'i');
const HTML_BLOCK_TAG_AT_START_REGEX = new RegExp(`^\\s*<\\/?${HTML_BLOCK_TAG}\\b`, 'i');
// Lines that are a whole Markdown block: headings, thematic breaks and setext underlines.
// Telegram shows any line that starts with `#` as a heading, `#hashtag` included.
const MARKDOWN_BLOCK_LINE_REGEX = /^\s*(#.*|=+|-+|(\*\s*){3,}|(_\s*){3,}|(-\s*){3,})\s*$/;
// Lines that start a new Markdown block: list items, block quotes and headings.
const MARKDOWN_BLOCK_START_REGEX = /^\s*([-*+]\s|\d{1,9}[.)]\s|>|#)/;

// An odd number of trailing backslashes, or two or more trailing spaces, is
// Markdown's own hard-break syntax. An even number of backslashes is escaped.
function hasMarkdownHardBreak(line: string): boolean {
	if (/ {2,}$/.test(line)) return true;
	const trailingBackslashes = /\\+$/.exec(line);
	return trailingBackslashes !== null && trailingBackslashes[0].length % 2 === 1;
}

function isMarkdownBlockBoundary(line: string, nextLine: string, lineAfterNext = ''): boolean {
	// Inside one block quote, check the quoted content instead of the `>` markers.
	const quotePrefix = BLOCKQUOTE_PREFIX_REGEX.exec(line)?.[0];
	const nextQuotePrefix = BLOCKQUOTE_PREFIX_REGEX.exec(nextLine)?.[0];
	if (quotePrefix && nextQuotePrefix) {
		// A different number of `>` markers starts a new, nested quote.
		if (quotePrefix.split('>').length !== nextQuotePrefix.split('>').length) return true;
		const quotedLine = line.replace(BLOCKQUOTE_PREFIX_REGEX, '');
		const quotedNextLine = nextLine.replace(BLOCKQUOTE_PREFIX_REGEX, '');
		if (quotedLine.trim() === '' || quotedNextLine.trim() === '') return true;
		return isMarkdownBlockBoundary(quotedLine, quotedNextLine);
	}

	return (
		MARKDOWN_BLOCK_LINE_REGEX.test(line) ||
		MARKDOWN_BLOCK_LINE_REGEX.test(nextLine) ||
		MARKDOWN_BLOCK_START_REGEX.test(nextLine) ||
		FENCE_MARKER_REGEX.test(nextLine) ||
		TABLE_ROW_REGEX.test(line) ||
		TABLE_ROW_REGEX.test(nextLine) ||
		TABLE_DELIMITER_ROW_REGEX.test(nextLine) ||
		// The next line is a table header row. Telegram needs a blank line before a table,
		// so keep these lines unchanged and do not split the table into loose lines.
		TABLE_DELIMITER_ROW_REGEX.test(lineAfterNext)
	);
}

// Counts the backtick runs in each line from `start` to the end of the paragraph.
function countBacktickRuns(lines: string[], start: number): Map<string, number> {
	const runsLeft = new Map<string, number>();
	for (let i = start; i < lines.length && lines[i].trim() !== ''; i++) {
		for (const [run] of lines[i].matchAll(BACKTICK_RUN_REGEX)) {
			runsLeft.set(run, (runsLeft.get(run) ?? 0) + 1);
		}
	}
	return runsLeft;
}

// Returns the backtick run of a code span that is still open at the end of the line.
// `runsLeft` holds the runs not yet read in the paragraph, and this function updates it.
function getOpenCodeSpan(line: string, openRun: string, runsLeft: Map<string, number>): string {
	for (const match of line.matchAll(BACKTICK_RUN_REGEX)) {
		const run = match[0];
		runsLeft.set(run, (runsLeft.get(run) ?? 1) - 1);
		if (openRun) {
			if (run === openRun) openRun = '';
			continue;
		}
		// An escaped backtick is plain text.
		const backslashes = /\\*$/.exec(line.slice(0, match.index))?.[0].length ?? 0;
		let opener = backslashes % 2 === 1 ? run.slice(1) : run;
		// Telegram reads a run with no closing run of the same length in the paragraph
		// as one plain backtick, followed by a shorter run.
		while (opener && !runsLeft.get(opener)) opener = opener.slice(1);
		openRun = opener;
	}
	return openRun;
}

export function materializeRichMessageLineBreaks(
	content: string,
	format: 'markdown' | 'html',
): string {
	const lines = content.split('\n');
	let inFence = false;
	let fenceToken = '';
	let inVerbatimHtml = false;
	let inIndentedCode = false;
	let inTable = false;
	let codeSpan = '';
	let runsLeft = new Map<string, number>();

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

				// An indented code block starts after a blank line and continues while lines stay indented.
				const previousLine = i === 0 ? '' : lines[i - 1];
				inIndentedCode =
					!inFence &&
					!isFenceMarker &&
					line.trim() !== '' &&
					INDENTED_CODE_REGEX.test(line) &&
					(previousLine.trim() === '' || inIndentedCode);

				// A table starts at its delimiter row and ends at the first line without a pipe.
				if (TABLE_DELIMITER_ROW_REGEX.test(line)) inTable = true;
				else if (!line.includes('|')) inTable = false;

				// Inline code can span lines, and Telegram shows a <br> in it as text.
				if (i === 0 || previousLine.trim() === '') runsLeft = countBacktickRuns(lines, i);
				const openCodeSpan = getOpenCodeSpan(line, codeSpan, runsLeft);
				codeSpan =
					inFence || isFenceMarker || inIndentedCode || line.trim() === '' ? '' : openCodeSpan;
			}

			if (format === 'html') {
				for (const tag of line.matchAll(HTML_VERBATIM_TAG_REGEX)) {
					inVerbatimHtml = !tag[0].startsWith('</');
				}
			}

			const isLastLine = i === lines.length - 1;
			if (isLastLine) return line;

			// Keep a CRLF line ending intact: the <br> goes before the \r.
			const eol = line.endsWith('\r') ? '\r' : '';
			const text = eol ? line.slice(0, -1) : line;
			const nextLine = lines[i + 1];
			// In HTML, Telegram also collapses blank lines, so a paragraph break needs two <br>.
			const isHtmlParagraphBreak = format === 'html' && nextLine.trim() === '';
			const nextText = isHtmlParagraphBreak
				? lines.slice(i + 1).find((l) => l.trim() !== '')
				: nextLine;
			const verbatim =
				isFenceMarker ||
				(format === 'markdown'
					? inFence || inIndentedCode || inTable || codeSpan !== ''
					: inVerbatimHtml);
			const isSoftBreak =
				!verbatim &&
				text.trim() !== '' &&
				nextText !== undefined &&
				nextText.trim() !== '' &&
				!HTML_BLOCK_TAG_AT_END_REGEX.test(text) &&
				!HTML_BLOCK_TAG_AT_START_REGEX.test(nextText) &&
				!(
					format === 'markdown' &&
					(hasMarkdownHardBreak(text) || isMarkdownBlockBoundary(text, nextLine, lines[i + 2]))
				);

			if (!isSoftBreak) return line;
			return `${text}${isHtmlParagraphBreak ? '<br><br>' : '<br>'}${eol}`;
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
