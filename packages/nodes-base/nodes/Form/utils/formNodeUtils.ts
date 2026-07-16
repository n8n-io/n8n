import { type Response } from 'express';
import {
	type NodeTypeAndVersion,
	type IUser,
	type IWebhookFunctions,
	type FormFieldsParameter,
	type IWebhookResponseData,
	NodeOperationError,
	FORM_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

import {
	generateFormUserAuthToken,
	handleNewlines,
	renderForm,
	resolveRawData,
	sanitizeHtml,
} from './utils';

export const renderFormNode = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
	fields: FormFieldsParameter,
	mode: 'test' | 'production',
	authedUser?: IUser,
): Promise<IWebhookResponseData> => {
	const options = context.getNodeParameter('options', {}) as {
		formTitle: string;
		formDescription: string;
		buttonLabel: string;
		customCss?: string;
	};

	let title = options.formTitle;
	if (!title) {
		title = context.evaluateExpression(`{{ $('${trigger?.name}').params.formTitle }}`) as string;
		title = resolveRawData(context, title);
	}

	const description = handleNewlines(sanitizeHtml(options.formDescription ?? ''));

	let buttonLabel = options.buttonLabel;
	if (!buttonLabel) {
		buttonLabel =
			(context.evaluateExpression(
				`{{ $('${trigger?.name}').params.options?.buttonLabel }}`,
			) as string) || 'Submit';
		buttonLabel = resolveRawData(context, buttonLabel);
	}

	const appendAttribution = context.evaluateExpression(
		`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	// Embed the form auth token so subsequent POSTs can re-authenticate the
	// user — cookies aren't sent on fetch from a sandboxed form page.
	const authToken = authedUser
		? generateFormUserAuthToken(context.getNode(), authedUser)
		: undefined;

	renderForm({
		context,
		res,
		formTitle: title,
		formDescription: description,
		formFields: fields,
		responseMode: 'responseNode',
		mode,
		redirectUrl: undefined,
		appendAttribution,
		buttonLabel,
		customCss: options.customCss,
		authToken,
	});

	return {
		noWebhookResponse: true,
	};
};

/**
 * Retrieves the active Form Trigger node from the workflow's parent nodes.
 *
 * This function searches through the parent nodes to find Form Trigger nodes,
 * then determines which one has been executed.
 *
 * @returns The NodeTypeAndVersion object representing the active Form Trigger node
 * @throws {NodeOperationError} When no Form Trigger node is found in parent nodes
 * @throws {NodeOperationError} When Form Trigger node exists but was not executed
 */
export function getFormTriggerNode(context: IWebhookFunctions): NodeTypeAndVersion {
	const parentNodes = context.getParentNodes(context.getNode().name);

	const formTriggers = parentNodes.filter((node) => node.type === FORM_TRIGGER_NODE_TYPE);

	if (!formTriggers.length) {
		throw new NodeOperationError(
			context.getNode(),
			'Form Trigger node must be set before this node',
		);
	}

	for (const trigger of formTriggers) {
		try {
			context.evaluateExpression(`{{ $('${trigger.name}').first() }}`);
		} catch (error) {
			continue;
		}
		return trigger;
	}

	throw new NodeOperationError(context.getNode(), 'Form Trigger node was not executed');
}
