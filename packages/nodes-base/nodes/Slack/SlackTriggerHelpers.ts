import type { IHttpRequestOptions, IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createHmac, timingSafeEqual } from 'crypto';

import { slackApiRequest } from './V2/GenericFunctions';

export async function getUserInfo(this: IWebhookFunctions, userId: string): Promise<any> {
	const user = await slackApiRequest.call(
		this,
		'GET',
		'/users.info',
		{},
		{
			user: userId,
		},
	);

	return user.user.name;
}

export async function getChannelInfo(this: IWebhookFunctions, channelId: string): Promise<any> {
	const channel = await slackApiRequest.call(
		this,
		'GET',
		'/conversations.info',
		{},
		{
			channel: channelId,
		},
	);

	return channel.channel.name;
}

export async function downloadFile(this: IWebhookFunctions, url: string): Promise<any> {
	let options: IHttpRequestOptions = {
		method: 'GET',
		url,
	};

	const requestOptions = {
		encoding: 'arraybuffer',
		returnFullResponse: true,
		json: false,
		useStream: true,
	};

	options = Object.assign({}, options, requestOptions);

	const response = await this.helpers.requestWithAuthentication.call(this, 'slackApi', options);

	if (response.ok === false) {
		if (response.error === 'paid_teams_only') {
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
		} else if (response.error === 'missing_scope') {
			throw new NodeOperationError(
				this.getNode(),
				'Your Slack credential is missing required Oauth Scopes',
				{
					description: `Add the following scope(s) to your Slack App: ${response.needed}`,
					level: 'warning',
				},
			);
		}
		throw new NodeOperationError(
			this.getNode(),
			'Slack error response: ' + JSON.stringify(response.error),
		);
	}
	return response;
}

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const credential = await this.getCredentials('slackApi');
	if (!credential?.signatureSecret) {
		return true; // No signature secret provided, skip verification
	}

	const req = this.getRequestObject();

	const signature = req.header('x-slack-signature');
	const timestamp = req.header('x-slack-request-timestamp');
	if (!signature || !timestamp) {
		return false;
	}

	const currentTime = Math.floor(Date.now() / 1000);
	const timestampNum = parseInt(timestamp, 10);
	if (isNaN(timestampNum) || Math.abs(currentTime - timestampNum) > 60 * 5) {
		return false;
	}

	try {
		if (typeof credential.signatureSecret !== 'string') {
			return false;
		}

		if (!req.rawBody) {
			return false;
		}

		const hmac = createHmac('sha256', credential.signatureSecret);

		if (Buffer.isBuffer(req.rawBody)) {
			hmac.update(`v0:${timestamp}:`);
			hmac.update(req.rawBody);
		} else {
			const rawBodyString =
				typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
			hmac.update(`v0:${timestamp}:${rawBodyString}`);
		}

		const computedSignature = `v0=${hmac.digest('hex')}`;

		const computedBuffer = Buffer.from(computedSignature);
		const providedBuffer = Buffer.from(signature);

		return (
			computedBuffer.length === providedBuffer.length &&
			timingSafeEqual(computedBuffer, providedBuffer)
		);
	} catch (error) {
		return false;
	}
}
