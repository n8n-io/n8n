import { Container } from '@n8n/di';
import get from 'lodash/get';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import { NodeOperationError } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import { HITL_APPROVE_ACTION_ID, HITL_DECLINE_ACTION_ID, } from './MessageInterface';
import { getSendAndWaitConfig } from '../../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../../utils/utilities';
function isDefined(value) {
    return value !== undefined && value !== null && value !== '';
}
// When an expression is wrapped in surrounding text/whitespace, n8n switches to
// string interpolation and a multiOptions array is coerced to a comma-joined
// string. Accept both shapes so the Slack node degrades gracefully.
export function toMultiOptionsCsv(value) {
    if (Array.isArray(value)) {
        return value
            .map((entry) => String(entry).trim())
            .filter((entry) => entry.length > 0)
            .join(',');
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
            .join(',');
    }
    return '';
}
/**
 * Turns an `ok: false` Slack payload into a user-facing error. Exported so callers
 * that opt out of `slackApiRequest`'s error handling (to treat one error code as a
 * non-failure) can still map every other code the same way.
 */
export function throwOnSlackApiError(
// tslint:disable-next-line:no-any
responseData) {
    if (responseData.error === 'paid_teams_only') {
        throw new NodeOperationError(this.getNode(), `Your current Slack plan does not include the resource '${this.getNodeParameter('resource', 0)}'`, {
            description: 'Hint: Upgrade to a Slack plan that includes the functionality you want to use.',
            level: 'warning',
        });
    }
    else if (responseData.error === 'ratelimited' || responseData.error === 'rate_limited') {
        throw new NodeOperationError(this.getNode(), 'Slack error response: ' + JSON.stringify(responseData.error), {
            description: 'Wait before running this again, or request less data at a time. Limits differ per operation - see the Slack Documentation - https://docs.slack.dev/apis/web-api/rate-limits',
            level: 'warning',
        });
    }
    else if (responseData.error === 'missing_scope') {
        throw new NodeOperationError(this.getNode(), 'Your Slack credential is missing required Oauth Scopes', {
            description: `Add the following scope(s) to your Slack App: ${responseData.needed}`,
            level: 'warning',
        });
    }
    else if (responseData.error === 'not_allowed_token_type' ||
        responseData.error === 'invalid_action_token') {
        throw new NodeOperationError(this.getNode(), 'This Slack operation requires a user token', {
            description: 'Bot tokens are not accepted here. Use OAuth2 authentication, or an Access Token credential holding a user token (starts with "xoxp-").',
            level: 'warning',
        });
    }
    else if (responseData.error === 'not_admin') {
        throw new NodeOperationError(this.getNode(), 'Need higher Role Level for this Operation (e.g. Owner or Admin Rights)', {
            description: 'Hint: Check the Role of your Slack App Integration. For more information see the Slack Documentation - https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack',
            level: 'warning',
        });
    }
    throw new NodeOperationError(this.getNode(), 'Slack error response: ' + JSON.stringify(responseData.error));
}
// Display label for a Slack user in pickers. Real names are friendlier but aren't
// unique in Slack, so the handle is appended to keep same-named users distinguishable.
// `real_name` is optional, so bots and unconfigured accounts show the handle alone.
export function formatUserLabel(user) {
    return user.real_name ? `${user.real_name} (@${user.name})` : user.name;
}
export async function slackApiRequest(method, resource, body = {}, query = {}, headers = undefined, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
    let options = {
        method,
        headers: headers ?? {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body,
        qs: query,
        uri: resource.startsWith('https') ? resource : `https://slack.com/api${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(query).length === 0) {
        delete options.qs;
    }
    const oAuth2Options = {
        tokenType: 'Bearer',
        property: 'authed_user.access_token',
    };
    const credentialType = authenticationMethod === 'accessToken' ? 'slackApi' : 'slackOAuth2Api';
    let response;
    try {
        response = await this.helpers.requestWithAuthentication.call(this, credentialType, options, {
            oauth2: oAuth2Options,
        });
    }
    catch (error) {
        if (error instanceof NodeOperationError)
            throw error;
        throw new NodeOperationError(this.getNode(), error);
    }
    const responseData = options.resolveWithFullResponse ? response.body : response;
    // don't try to handle errors if simple responses are disabled
    if (responseData.ok === false && options.simple !== false) {
        throwOnSlackApiError.call(this, responseData);
    }
    if (responseData.ts !== undefined) {
        Object.assign(responseData, { message_timestamp: responseData.ts });
        delete responseData.ts;
    }
    return response;
}
function hasNextPage(responseData, propertyName) {
    const nextCursorDefined = isDefined(responseData.response_metadata?.next_cursor);
    const morePagesAvailable = isDefined(responseData.paging?.pages) &&
        isDefined(responseData.paging.page) &&
        responseData.paging.page < responseData.paging.pages;
    const morePropertyPagesAvailable = isDefined(responseData[propertyName]?.paging?.pages) &&
        isDefined(responseData[propertyName]?.paging?.page) &&
        responseData[propertyName].paging.page < responseData[propertyName].paging.pages;
    return nextCursorDefined || morePagesAvailable || morePropertyPagesAvailable;
}
export async function slackApiRequestAllItemsWithRateLimit(context, propertyName, method, endpoint, body = {}, query = {}, options = {}) {
    const { maxRetries = 3, fallbackDelay = 30_000, onFail = 'throw' } = options;
    const returnData = [];
    let responseData;
    query.page = 1;
    //if the endpoint uses legacy pagination use count
    //https://api.slack.com/docs/pagination#classic
    if (endpoint.includes('files.list')) {
        query.count = 100;
    }
    else {
        query.limit = query.limit ?? 100;
    }
    do {
        let retryCount = 0;
        let requestSuccessful = false;
        while (!requestSuccessful) {
            const response = await slackApiRequest.call(context, method, endpoint, body, query, {}, { resolveWithFullResponse: true, simple: false });
            const getErrMsg = () => 'Slack error response: ' +
                JSON.stringify(response.body?.error ?? response.statusMessage ?? 'Unknown error');
            if (response.statusCode === 200) {
                retryCount = 0;
                responseData = response.body;
                requestSuccessful = true;
            }
            else if (response.statusCode === 429) {
                const shouldRetry = retryCount < maxRetries;
                // if onFail='stop' we should wait, so that user don't hit rate limit when scrolling through results
                if (shouldRetry || onFail === 'stop') {
                    // Extract Retry-After header (in seconds) and convert to milliseconds
                    const retryAfterHeader = response.headers?.['retry-after'] ?? response.headers?.['Retry-After'];
                    const waitTime = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : fallbackDelay;
                    await sleep(waitTime);
                    retryCount++;
                }
                if (shouldRetry) {
                    continue;
                }
                if (onFail === 'stop') {
                    // Return the data collected so far with cursor/page info
                    const result = {
                        data: returnData,
                    };
                    // Add cursor if available
                    if (query.cursor) {
                        result.cursor = query.cursor;
                    }
                    // Add nextPage if using legacy pagination
                    if (responseData?.paging?.page) {
                        result.page = String(responseData.paging.page);
                    }
                    else if (responseData?.[propertyName]?.paging?.page) {
                        result.page = String(responseData[propertyName].paging.page);
                    }
                    else if (query.page) {
                        result.page = String(query.page);
                    }
                    return result;
                }
                throw new NodeOperationError(context.getNode(), getErrMsg());
            }
            else {
                throw new NodeOperationError(context.getNode(), getErrMsg());
            }
        }
        query.cursor = get(responseData, 'response_metadata.next_cursor');
        query.page++;
        returnData.push.apply(returnData, responseData[propertyName]?.matches ?? responseData[propertyName] ?? []);
    } while (hasNextPage(responseData, propertyName));
    return { data: returnData };
}
export async function slackApiRequestAllItems(propertyName, method, endpoint, 
// tslint:disable-next-line:no-any
body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    //if the endpoint uses legacy pagination use count
    //https://api.slack.com/docs/pagination#classic
    if (endpoint.includes('files.list')) {
        query.count = 100;
    }
    else {
        query.limit = query.limit ?? 100;
    }
    do {
        responseData = await slackApiRequest.call(this, method, endpoint, body, query);
        query.cursor = get(responseData, 'response_metadata.next_cursor');
        query.page++;
        returnData.push.apply(returnData, responseData[propertyName]?.matches ?? responseData[propertyName] ?? []);
    } while (hasNextPage(responseData, propertyName));
    return returnData;
}
/** Slack caps `limit` on assistant.search.context at 20 results per request. */
const SEARCH_CONTEXT_PAGE_SIZE = 20;
/**
 * Cursor-paginates the Real-time Search API up to `maxResults`. It needs its own loop
 * because it takes arguments in the request body and returns `results.messages` with a
 * cursor, none of which the query-string based helpers above can express.
 */
export async function searchContextItems(body, maxResults) {
    const returnData = [];
    let cursor;
    do {
        const responseData = await slackApiRequest.call(this, 'POST', '/assistant.search.context', {
            ...body,
            limit: Math.min(SEARCH_CONTEXT_PAGE_SIZE, maxResults - returnData.length),
            ...(cursor ? { cursor } : {}),
        }, {}, undefined, 
        // Errors are handled here so the pagination cap can end the loop instead of failing
        { simple: false });
        // `simple: false` also suppresses HTTP-status errors, so anything that is not an
        // explicit success has to be raised here rather than parsed as results.
        if (responseData.ok !== true) {
            // Slack caps how deep a search can be paged. Hitting the cap means there is
            // nothing further to fetch, so keep what we have instead of failing the node.
            if (responseData.error === 'page_limit_exceeded')
                break;
            throwOnSlackApiError.call(this, responseData);
        }
        const messages = get(responseData, 'results.messages') ?? [];
        returnData.push(...messages);
        cursor = get(responseData, 'response_metadata.next_cursor');
        // An empty page with a cursor would otherwise spin forever
        if (messages.length === 0)
            break;
    } while (cursor && returnData.length < maxResults);
    return returnData;
}
export function getMessageContent(i, nodeVersion, instanceId) {
    const includeLinkToWorkflow = this.getNodeParameter('otherOptions.includeLinkToWorkflow', i, nodeVersion >= 2.1 ? true : false);
    const { id } = this.getWorkflow();
    const automatedMessage = `_Automated with this <${this.getInstanceBaseUrl()}workflow/${id}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent('n8n-nodes-base.slack')}${instanceId ? '_' + instanceId : ''}|n8n workflow>_`;
    const messageType = this.getNodeParameter('messageType', i);
    let content = {};
    const text = this.getNodeParameter('text', i, '');
    switch (messageType) {
        case 'text':
            content = {
                text: includeLinkToWorkflow ? `${text}\n${automatedMessage}` : text,
            };
            break;
        case 'block':
            content = this.getNodeParameter('blocksUi', i, {}, { ensureType: 'object' });
            if (includeLinkToWorkflow && Array.isArray(content.blocks)) {
                content.blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: automatedMessage,
                    },
                });
            }
            if (text) {
                content.text = text;
            }
            break;
        case 'attachment':
            const attachmentsUI = this.getNodeParameter('attachments', i);
            const attachments = [];
            for (const attachment of attachmentsUI) {
                if (attachment.fields !== undefined) {
                    if (attachment?.fields?.item) {
                        attachment.fields = attachment?.fields?.item;
                    }
                }
                attachments.push(attachment);
            }
            content = { attachments };
            if (includeLinkToWorkflow && Array.isArray(content.attachments)) {
                content.attachments.push({
                    text: automatedMessage,
                });
            }
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The message type "${messageType}" is not known!`);
    }
    return content;
}
// tslint:disable-next-line:no-any
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
export function getTarget(context, itemIndex, idType) {
    let target = '';
    if (idType === 'channel') {
        target = context.getNodeParameter('channelId', itemIndex, undefined, {
            extractValue: true,
        });
    }
    else {
        target = context.getNodeParameter('user', itemIndex, undefined, {
            extractValue: true,
        });
    }
    if (idType === 'user' &&
        context.getNodeParameter('user', itemIndex).mode === 'username') {
        target = target.slice(0, 1) === '@' ? target : `@${target}`;
    }
    return target;
}
export function processThreadOptions(threadOptions) {
    const result = {};
    if (threadOptions?.replyValues) {
        const replyValues = threadOptions.replyValues;
        if (replyValues.thread_ts) {
            result.thread_ts = String(replyValues.thread_ts);
        }
        if (replyValues.reply_broadcast !== undefined) {
            result.reply_broadcast = replyValues.reply_broadcast;
        }
    }
    return result;
}
export function createSendAndWaitMessageBody(context) {
    const select = context.getNodeParameter('select', 0);
    const target = getTarget(context, 0, select);
    const config = getSendAndWaitConfig(context);
    const responseType = context.getNodeParameter('responseType', 0, 'approval');
    // Capture-responder only works with Approve/Reject buttons. Free-text and custom-form
    // replies still use the plain link button.
    const captureResponder = context.getNodeParameter('captureResponder', 0, false) === true && responseType === 'approval';
    // HMAC secret for the callback reference the CLI layer verifies to prove which execution and
    // decision to resume (same helper/secret as Telegram). Only needed in capture-responder mode.
    const executionId = context.getExecutionId();
    const hmacSecret = captureResponder ? Container.get(InstanceSettings).hmacSignatureSecret : '';
    const body = {
        channel: target,
        blocks: [
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: context.getNode().typeVersion > 2.2 ? 'mrkdwn' : 'plain_text',
                    text: config.message,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'plain_text',
                    text: ' ',
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'actions',
                elements: config.options.map((option) => ({
                    type: 'button',
                    style: option.style === 'primary' ? 'primary' : undefined,
                    text: {
                        type: 'plain_text',
                        text: option.label,
                        emoji: true,
                    },
                    // A button with a `url` is a plain link. In capture-responder mode we drop
                    // the url so Slack treats it as interactive and POSTs the click to us instead.
                    ...(captureResponder
                        ? {
                            action_id: option.approved ? HITL_APPROVE_ACTION_ID : HITL_DECLINE_ACTION_ID,
                            value: buildHitlCallbackReference(executionId, option.approved ? 'a' : 'd', hmacSecret),
                        }
                        : { url: option.url }),
                })),
            },
        ],
    };
    const otherOptions = context.getNodeParameter('options', 0, {});
    const threadParams = processThreadOptions(otherOptions?.thread_ts);
    Object.assign(body, threadParams);
    if (config.appendAttribution) {
        const instanceId = context.getInstanceId();
        const attributionText = 'This message was sent automatically with ';
        const link = createUtmCampaignLink('n8n-nodes-base.slack', instanceId);
        body.blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${attributionText} _<${link}|n8n>_`,
            },
        });
    }
    if (context.getNode().typeVersion > 2.2 && body.blocks?.[1]?.type === 'section') {
        delete body.blocks[1].text.emoji;
    }
    return body;
}
//# sourceMappingURL=GenericFunctions.js.map