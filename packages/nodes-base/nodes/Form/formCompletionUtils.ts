import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type IBinaryData,
	type IDataObject,
	OperationalError,
} from 'n8n-workflow';

import { sanitizeHtml } from './utils';

const getBinaryDataFromNode = (context: IWebhookFunctions, nodeName: string): IDataObject => {
	return context.evaluateExpression(`{{ $('${nodeName}').first().binary }}`) as IDataObject;
};

export const binaryResponse = (context: IWebhookFunctions): IDataObject => {
	const inputDataFieldName = context.getNodeParameter('inputDataFieldName', '') as string;
	const parentNodes = context.getParentNodes(context.getNode().name);
	const binaryNode = parentNodes.find((node) =>
		getBinaryDataFromNode(context, node?.name)?.hasOwnProperty(inputDataFieldName),
	);
	if (!binaryNode) {
		throw new OperationalError(`No binary data with field ${inputDataFieldName} found.`);
	}
	const binaryData = getBinaryDataFromNode(context, binaryNode?.name)[
		inputDataFieldName
	] as IBinaryData;

	return binaryData;
};

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
	const binary =
		context.getNodeParameter('respondWith', '') === 'returnBinary' ? binaryResponse(context) : '';

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
		responseBinary: encodeURIComponent(JSON.stringify(binary)),
		redirectUrl,
	});

	return { noWebhookResponse: true };
};
