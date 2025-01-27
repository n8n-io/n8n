import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

export const renderFormCompletion = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
): Promise<IWebhookResponseData> => {
	const completionTitle = context.getNodeParameter('completionTitle', '') as string;
	const completionMessage = context.getNodeParameter('completionMessage', '') as string;
	const redirectUrl = context.getNodeParameter('redirectUrl', '') as string;
	const options = context.getNodeParameter('options', {}) as { formTitle: string };

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
	});

	return { noWebhookResponse: true };
};
