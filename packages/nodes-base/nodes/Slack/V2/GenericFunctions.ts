import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IOAuth2Options,
	IHttpRequestMethods,
	IRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import type { SendAndWaitMessageBody } from './MessageInterface';
import { getSendAndWaitConfig } from '../../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../../utils/utilities';

interface RateLimitOptions {
	/**
	 * The maximum number of times to retry the request if a rate limit error occurs.
	 */
	maxRetries?: number;
	/**
	 * The delay in milliseconds to wait before retrying the request if 'retry-after' header is not present.
	 */
	fallbackDelay?: number;
	/**
	 * What to do when a rate limit error occurs and maxRetries is exceeded.
	 * - 'throw' will throw an error
	 * - 'stop' will return the data collected so far with cursor/page info
	 */
	onFail?: 'throw' | 'stop';
}

function isDefined<T>(value: T | undefined | null | ''): value is NonNullable<T> {
	return value !== undefined && value !== null && value !== '';
}

export async function slackApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: object = {},
	query: IDataObject = {},
	headers: {} | undefined = undefined,
	option: Partial<IRequestOptions> = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;
	let options: IRequestOptions = {
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

	const oAuth2Options: IOAuth2Options = {
		tokenType: 'Bearer',
		property: 'authed_user.access_token',
	};

	const credentialType = authenticationMethod === 'accessToken' ? 'slackApi' : 'slackOAuth2Api';
	const response = await this.helpers.requestWithAuthentication.call(
		this,
		credentialType,
		options,
		{
			oauth2: oAuth2Options,
		},
	);

	const responseData = options.resolveWithFullResponse ? response.body : response;

	// don't try to handle errors if simple responses are disabled
	if (responseData.ok === false && options.simple !== false) {
		if (responseData.error === 'paid_teams_only') {
			throw new NodeOperationError(
				this.getNode(),
				`Your current Slack plan does not include the resource '${
					this.getNodeParameter('resource', 0) as string
				}'`,
				{
					description:
						'Hint: Upgrade to a Slack plan that includes the functionality you want to use.',
					level: 'warning',
				},
			);
		} else if (responseData.error === 'missing_scope') {
			throw new NodeOperationError(
				this.getNode(),
				'Your Slack credential is missing required Oauth Scopes',
				{
					description: `Add the following scope(s) to your Slack App: ${responseData.needed}`,
					level: 'warning',
				},
			);
		} else if (responseData.error === 'not_admin') {
			throw new NodeOperationError(
				this.getNode(),
				'Need higher Role Level for this Operation (e.g. Owner or Admin Rights)',
				{
					description:
						'Hint: Check the Role of your Slack App Integration. For more information see the Slack Documentation - https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack',
					level: 'warning',
				},
			);
		}

		throw new NodeOperationError(
			this.getNode(),
			'Slack error response: ' + JSON.stringify(responseData.error),
		);
	}

	if (responseData.ts !== undefined) {
		Object.assign(responseData, { message_timestamp: responseData.ts });
		delete responseData.ts;
	}

	return response;
}

function hasNextPage(responseData: any, propertyName: string): boolean {
	const nextCursorDefined = isDefined(responseData.response_metadata?.next_cursor);
	const morePagesAvailable =
		isDefined(responseData.paging?.pages) &&
		isDefined(responseData.paging.page) &&
		responseData.paging.page < responseData.paging.pages;
	const morePropertyPagesAvailable =
		isDefined(responseData[propertyName].paging?.pages) &&
		isDefined(responseData[propertyName].paging.page) &&
		responseData[propertyName].paging.page < responseData[propertyName].paging.pages;
	return nextCursorDefined || morePagesAvailable || morePropertyPagesAvailable;
}

export async function slackApiRequestAllItemsWithRateLimit<TResponseData>(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
	options: RateLimitOptions = {},
): Promise<{ data: TResponseData[]; cursor?: string; page?: string }> {
	const { maxRetries = 3, fallbackDelay = 30_000, onFail = 'throw' } = options;

	const returnData: TResponseData[] = [];
	let responseData;
	query.page = 1;
	//if the endpoint uses legacy pagination use count
	//https://api.slack.com/docs/pagination#classic
	if (endpoint.includes('files.list')) {
		query.count = 100;
	} else {
		query.limit = query.limit ?? 100;
	}
	do {
		let retryCount = 0;
		let requestSuccessful = false;

		while (!requestSuccessful) {
			const response = await slackApiRequest.call(
				context,
				method,
				endpoint,
				body as IDataObject,
				query,
				{},
				{ resolveWithFullResponse: true, simple: false },
			);

			const getErrMsg = () =>
				'Slack error response: ' +
				JSON.stringify(response.body?.error ?? response.statusMessage ?? 'Unknown error');

			if (response.statusCode === 200) {
				retryCount = 0;
				responseData = response.body;
				requestSuccessful = true;
			} else if (response.statusCode === 429) {
				const shouldRetry = retryCount < maxRetries;
				// if onFail='stop' we should wait, so that user don't hit rate limit when scrolling through results
				if (shouldRetry || onFail === 'stop') {
					// Extract Retry-After header (in seconds) and convert to milliseconds
					const retryAfterHeader =
						response.headers?.['retry-after'] ?? response.headers?.['Retry-After'];
					const waitTime = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : fallbackDelay;
					await sleep(waitTime);
					retryCount++;
				}

				if (shouldRetry) {
					continue;
				}

				if (onFail === 'stop') {
					// Return the data collected so far with cursor/page info
					const result: { data: TResponseData[]; cursor?: string; page?: string } = {
						data: returnData,
					};

					// Add cursor if available
					if (query.cursor) {
						result.cursor = query.cursor as string;
					}
					// Add nextPage if using legacy pagination
					if (responseData?.paging?.page) {
						result.page = String(responseData.paging.page);
					} else if (responseData?.[propertyName]?.paging?.page) {
						result.page = String(responseData[propertyName].paging.page);
					} else if (query.page) {
						result.page = String(query.page);
					}

					return result;
				}
				throw new NodeOperationError(context.getNode(), getErrMsg());
			} else {
				throw new NodeOperationError(context.getNode(), getErrMsg());
			}
		}

		query.cursor = get(responseData, 'response_metadata.next_cursor');
		query.page++;
		returnData.push.apply(
			returnData,
			(responseData[propertyName].matches as TResponseData[]) ?? responseData[propertyName],
		);
	} while (hasNextPage(responseData, propertyName));

	return { data: returnData };
}

export async function slackApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];
	let responseData;
	query.page = 1;
	//if the endpoint uses legacy pagination use count
	//https://api.slack.com/docs/pagination#classic
	if (endpoint.includes('files.list')) {
		query.count = 100;
	} else {
		query.limit = query.limit ?? 100;
	}
	do {
		responseData = await slackApiRequest.call(this, method, endpoint, body as IDataObject, query);
		query.cursor = get(responseData, 'response_metadata.next_cursor');
		query.page++;
		returnData.push.apply(
			returnData,
			(responseData[propertyName].matches as IDataObject[]) ?? responseData[propertyName],
		);
	} while (hasNextPage(responseData, propertyName));
	return returnData;
}

export function getMessageContent(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	i: number,
	nodeVersion: number,
	instanceId?: string,
) {
	const includeLinkToWorkflow = this.getNodeParameter(
		'otherOptions.includeLinkToWorkflow',
		i,
		nodeVersion >= 2.1 ? true : false,
	) as IDataObject;

	const { id } = this.getWorkflow();
	const automatedMessage = `_Automated with this <${this.getInstanceBaseUrl()}workflow/${id}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent(
		'n8n-nodes-base.slack',
	)}${instanceId ? '_' + instanceId : ''}|n8n workflow>_`;
	const messageType = this.getNodeParameter('messageType', i) as string;

	let content: IDataObject = {};
	const text = this.getNodeParameter('text', i, '') as string;
	switch (messageType) {
		case 'text':
			content = {
				text: includeLinkToWorkflow ? `${text}\n${automatedMessage}` : text,
			};
			break;
		case 'block':
			content = this.getNodeParameter('blocksUi', i, {}, { ensureType: 'object' }) as IDataObject;

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
			const attachmentsUI = this.getNodeParameter('attachments', i) as IDataObject[];

			const attachments: IDataObject[] = [];

			for (const attachment of attachmentsUI) {
				if (attachment.fields !== undefined) {
					if ((attachment?.fields as IDataObject)?.item) {
						attachment.fields = (attachment?.fields as IDataObject)?.item as IDataObject[];
					}
				}
				attachments.push(attachment);
			}

			content = { attachments } as IDataObject;

			if (includeLinkToWorkflow && Array.isArray(content.attachments)) {
				content.attachments.push({
					text: automatedMessage,
				});
			}
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The message type "${messageType}" is not known!`,
			);
	}

	return content;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

export function getTarget(
	context: IExecuteFunctions,
	itemIndex: number,
	idType: 'user' | 'channel',
): string {
	let target = '';

	if (idType === 'channel') {
		target = context.getNodeParameter('channelId', itemIndex, undefined, {
			extractValue: true,
		}) as string;
	} else {
		target = context.getNodeParameter('user', itemIndex, undefined, {
			extractValue: true,
		}) as string;
	}

	if (
		idType === 'user' &&
		(context.getNodeParameter('user', itemIndex) as IDataObject).mode === 'username'
	) {
		target = target.slice(0, 1) === '@' ? target : `@${target}`;
	}

	return target;
}

export function processThreadOptions(threadOptions: IDataObject | undefined): IDataObject {
	const result: IDataObject = {};

	if (threadOptions?.replyValues) {
		const replyValues = threadOptions.replyValues as IDataObject;
		if (replyValues.thread_ts) {
			result.thread_ts = String(replyValues.thread_ts);
		}
		if (replyValues.reply_broadcast !== undefined) {
			result.reply_broadcast = replyValues.reply_broadcast;
		}
	}

	return result;
}

export function createSendAndWaitMessageBody(context: IExecuteFunctions) {
	const select = context.getNodeParameter('select', 0) as 'user' | 'channel';
	const target = getTarget(context, 0, select);

	const config = getSendAndWaitConfig(context);

	const body: SendAndWaitMessageBody = {
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
				elements: config.options.map((option) => {
					return {
						type: 'button',
						style: option.style === 'primary' ? 'primary' : undefined,
						text: {
							type: 'plain_text',
							text: option.label,
							emoji: true,
						},
						url: option.url,
					};
				}),
			},
		],
	};

	const otherOptions = context.getNodeParameter('options', 0, {});
	const threadParams = processThreadOptions(otherOptions?.thread_ts as IDataObject);
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
