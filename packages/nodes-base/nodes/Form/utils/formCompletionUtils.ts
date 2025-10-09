import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type IBinaryData,
	type IDataObject,
	OperationalError,
} from 'n8n-workflow';

import { sanitizeCustomCss, sanitizeHtml } from './utils';

const SANDBOX_CSP =
	'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols';

const getBinaryDataFromNode = (context: IWebhookFunctions, nodeName: string): IDataObject => {
	return context.evaluateExpression(`{{ $('${nodeName}').first().binary }}`) as IDataObject;
};

export const binaryResponse = async (
	context: IWebhookFunctions,
): Promise<{ data: string | Buffer; fileName: string; type: string }> => {
	const inputDataFieldName = context.getNodeParameter('inputDataFieldName', '') as string;
	const parentNodes = context.getParentNodes(context.getNode().name);
	const binaryNode = parentNodes
		.reverse()
		.find((node) => getBinaryDataFromNode(context, node?.name)?.hasOwnProperty(inputDataFieldName));
	if (!binaryNode) {
		throw new OperationalError(`No binary data with field ${inputDataFieldName} found.`);
	}
	const binaryData = getBinaryDataFromNode(context, binaryNode?.name)[
		inputDataFieldName
	] as IBinaryData;

	return {
		// If a binaryData has an id, the following field is set:
		// N8N_DEFAULT_BINARY_DATA_MODE=filesystem
		data: binaryData.id
			? await context.helpers.binaryToBuffer(await context.helpers.getBinaryStream(binaryData.id))
			: atob(binaryData.data),
		fileName: binaryData.fileName ?? 'file',
		type: binaryData.mimeType,
	};
};

export const renderFormCompletion = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
): Promise<IWebhookResponseData> => {
	const completionTitle = context.getNodeParameter('completionTitle', '') as string;
	const completionMessage = context.getNodeParameter('completionMessage', '') as string;
	const redirectUrl = context.getNodeParameter('redirectUrl', '') as string;
	const options = context.getNodeParameter('options', {}) as {
		formTitle: string;
		customCss?: string;
	};
	const responseText = (context.getNodeParameter('responseText', '') as string) ?? '';
	const binary =
		context.getNodeParameter('respondWith', '') === 'returnBinary'
			? await binaryResponse(context)
			: '';

	let title = options.formTitle;
	if (!title) {
		title = context.evaluateExpression(`{{ $('${trigger?.name}').params.formTitle }}`) as string;
	}
	const appendAttribution = context.evaluateExpression(
		`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	res.setHeader('Content-Security-Policy', SANDBOX_CSP);
	res.render('form-trigger-completion', {
		title: completionTitle,
		message: sanitizeHtml(completionMessage),
		formTitle: title,
		appendAttribution,
		responseText,
		responseBinary: encodeURIComponent(JSON.stringify(binary)),
		dangerousCustomCss: sanitizeCustomCss(options.customCss),
		redirectUrl,
	});

	return { noWebhookResponse: true };
};
