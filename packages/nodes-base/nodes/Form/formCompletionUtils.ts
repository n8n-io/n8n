import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

const respondWithBinary = () => {
	// const item = items[0];
	// 				if (item.binary === undefined) {
	// 					throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
	// 				}
	// 				let responseBinaryPropertyName: string;
	// 				const responseDataSource = this.getNodeParameter('responseDataSource', 0) as string;
	// 				if (responseDataSource === 'set') {
	// 					responseBinaryPropertyName = this.getNodeParameter('inputFieldName', 0) as string;
	// 				} else {
	// 					const binaryKeys = Object.keys(item.binary);
	// 					if (binaryKeys.length === 0) {
	// 						throw new NodeOperationError(
	// 							this.getNode(),
	// 							'No binary data exists on the first item!',
	// 						);
	// 					}
	// 					responseBinaryPropertyName = binaryKeys[0];
	// 				}
	// 				const binaryData = this.helpers.assertBinaryData(0, responseBinaryPropertyName);
	// 				if (binaryData.id) {
	// 					responseBody = { binaryData };
	// 				} else {
	// 					responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
	// 					headers['content-length'] = (responseBody as Buffer).length;
	// 				}
	// 				if (!headers['content-type']) {
	// 					headers['content-type'] = binaryData.mimeType;
	// 				}
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
