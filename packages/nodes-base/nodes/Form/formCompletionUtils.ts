import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { sanitizeHtml } from './utils';

export const renderFormCompletion = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
): Promise<IWebhookResponseData> => {
	const completionTitle = context.getNodeParameter('completionTitle', '') as string;
	const completionMessage = context.getNodeParameter('completionMessage', '') as string;
	const redirectUrl = context.getNodeParameter('redirectUrl', '') as string;
	const options = context.getNodeParameter('options', {}) as { formTitle: string };
	const responseText = context.getNodeParameter('responseText', '') as string;

	if (redirectUrl) {
		res.send(
			`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head></html>`,
		);
		return { noWebhookResponse: true };
	}

	let title = options.formTitle;
	if (!title) {
		title = context.evaluateExpression(`{{ $('${trigger?.name}').params.formTitle }}`) as string;
	}
	const appendAttribution = context.evaluateExpression(
		`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	res.render('form-trigger-completion', {
		title: completionTitle,
		message: completionMessage,
		formTitle: title,
		appendAttribution,
		responseText: sanitizeHtml(responseText),
	});

	return { noWebhookResponse: true };
};
