import { createHmac } from 'crypto';
import type { IHttpRequestOptions, IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { slackApiRequest } from './V2/GenericFunctions';
import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

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
	const req = this.getRequestObject();

	const timestamp = req.header('x-slack-request-timestamp');
	if (!timestamp) {
		return false;
	}

	const signatureSecret = credential.signatureSecret;
	try {
		const isValid = verifySignatureGeneric({
			getExpectedSignature: () => {
				if (!signatureSecret || typeof signatureSecret !== 'string' || !req.rawBody) {
					return null;
				}

				const hmac = createHmac('sha256', signatureSecret);

				if (Buffer.isBuffer(req.rawBody)) {
					hmac.update(`v0:${timestamp}:`);
					hmac.update(req.rawBody);
				} else {
					const rawBodyString =
						typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
					hmac.update(`v0:${timestamp}:${rawBodyString}`);
				}

				const computedSignature = `v0=${hmac.digest('hex')}`;
				return computedSignature;
			},
			skipIfNoExpectedSignature: !signatureSecret || typeof signatureSecret !== 'string',
			getActualSignature: () => {
				const actualSignature = req.header('x-slack-signature');
				return typeof actualSignature === 'string' ? actualSignature : null;
			},
			getTimestamp: () => timestamp,
		});
		return isValid;
	} catch (error) {
		return false;
	}
}
