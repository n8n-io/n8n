import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IWebhookFunctions,
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
	type FormFieldsParameter,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { renderForm } from './utils';

export const renderFormNode = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
	fields: FormFieldsParameter,
	mode: 'test' | 'production',
): Promise<IWebhookResponseData> => {
	const options = context.getNodeParameter('options', {}) as {
		formTitle: string;
		formDescription: string;
		buttonLabel: string;
	};

	let title = options.formTitle;
	if (!title) {
		title = context.evaluateExpression(`{{ $('${trigger?.name}').params.formTitle }}`) as string;
	}

	let description = options.formDescription;
	if (!description) {
		description = context.evaluateExpression(
			`{{ $('${trigger?.name}').params.formDescription }}`,
		) as string;
	}

	let buttonLabel = options.buttonLabel;
	if (!buttonLabel) {
		buttonLabel =
			(context.evaluateExpression(
				`{{ $('${trigger?.name}').params.options?.buttonLabel }}`,
			) as string) || 'Submit';
	}

	const responseMode = 'onReceived';

	let redirectUrl;

	const connectedNodes = context.getChildNodes(context.getNode().name);

	const hasNextPage = connectedNodes.some(
		(node) => !node.disabled && (node.type === FORM_NODE_TYPE || node.type === WAIT_NODE_TYPE),
	);

	if (hasNextPage) {
		redirectUrl = context.evaluateExpression('{{ $execution.resumeFormUrl }}') as string;
	}

	const appendAttribution = context.evaluateExpression(
		`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	renderForm({
		context,
		res,
		formTitle: title,
		formDescription: description,
		formFields: fields,
		responseMode,
		mode,
		redirectUrl,
		appendAttribution,
		buttonLabel,
	});

	return {
		noWebhookResponse: true,
	};
};
