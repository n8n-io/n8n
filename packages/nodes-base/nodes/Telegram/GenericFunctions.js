import { Container } from '@n8n/di';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import { NodeApiError } from 'n8n-workflow';
import { getSendAndWaitConfig } from '../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../utils/utilities';
/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {number} index The index of the item
 */
export function addAdditionalFields(body, index, nodeVersion, instanceId) {
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
        const containsUrl = regex.test(body.text);
        if (!containsUrl) {
            body.disable_web_page_preview = true;
        }
        if (additionalFields.appendAttribution) {
            if (additionalFields.parse_mode === 'Markdown') {
                body.text = `${body.text}\n\n_${attributionText}_[n8n](${link})`;
            }
            else if (additionalFields.parse_mode === 'HTML') {
                body.text = `${body.text}\n\n<em>${attributionText}</em><a href="${link}" target="_blank">n8n</a>`;
            }
        }
        if (nodeVersion &&
            nodeVersion >= 1.2 &&
            additionalFields.disable_web_page_preview === undefined) {
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
export function addReplyMarkup(body, index) {
    const operation = this.getNodeParameter('operation', index);
    let replyMarkupOption = '';
    if (operation !== 'sendMediaGroup') {
        replyMarkupOption = this.getNodeParameter('replyMarkup', index);
        if (replyMarkupOption === 'none') {
            return;
        }
    }
    body.reply_markup = {};
    if (['inlineKeyboard', 'replyKeyboard'].includes(replyMarkupOption)) {
        let setParameterName = 'inline_keyboard';
        if (replyMarkupOption === 'replyKeyboard') {
            setParameterName = 'keyboard';
        }
        const keyboardData = this.getNodeParameter(replyMarkupOption, index);
        // @ts-ignore
        body.reply_markup[setParameterName] =
            [];
        let sendButtonData;
        if (keyboardData.rows !== undefined) {
            for (const row of keyboardData.rows) {
                const sendRows = [];
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
                const array = body.reply_markup[setParameterName];
                array.push(sendRows);
            }
        }
    }
    else if (replyMarkupOption === 'forceReply') {
        const forceReply = this.getNodeParameter('forceReply', index);
        body.reply_markup = forceReply;
    }
    else if (replyMarkupOption === 'replyKeyboardRemove') {
        const forceReply = this.getNodeParameter('replyKeyboardRemove', index);
        body.reply_markup = forceReply;
    }
    if (replyMarkupOption === 'replyKeyboard') {
        const replyKeyboardOptions = this.getNodeParameter('replyKeyboardOptions', index);
        Object.assign(body.reply_markup, replyKeyboardOptions);
    }
}
/**
 * Make an API request to Telegram
 *
 */
export async function apiRequest(method, endpoint, body, query, option = {}) {
    const credentials = await this.getCredentials('telegramApi');
    query = query || {};
    const options = {
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
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function getImageBySize(photos, size) {
    const sizes = {
        small: 0,
        medium: 1,
        large: 2,
        extraLarge: 3,
    };
    const index = sizes[size];
    return photos[index];
}
export function getPropertyName(operation) {
    return operation.replace('send', '').toLowerCase();
}
export function getSecretToken() {
    // Only characters A-Z, a-z, 0-9, _ and - are allowed.
    const secret_token = `${this.getWorkflow().id}_${this.getNode().id}`;
    return secret_token.replace(/[^a-zA-Z0-9\_\-]+/g, '');
}
export function createSendAndWaitMessageBody(context, chatApproval = false) {
    const chat_id = context.getNodeParameter('chatId', 0);
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
                            callback_data: buildHitlCallbackReference(executionId, option.approved ? 'a' : 'd', hmacSecret),
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
//# sourceMappingURL=GenericFunctions.js.map