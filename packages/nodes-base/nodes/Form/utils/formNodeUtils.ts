import { type Response } from 'express';
import {
	type IWebhookFunctions,
	type FormFieldsParameter,
	type IWebhookResponseData,
	type INode,
	type IFormTriggerContext,
	NodeOperationError,
} from 'n8n-workflow';

import { renderForm } from './utils';

export const renderFormNode = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: INode,
	fields: FormFieldsParameter,
	mode: 'test' | 'production',
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
	}

	let buttonLabel = options.buttonLabel;
	if (!buttonLabel) {
		buttonLabel =
			(context.evaluateExpression(
				`{{ $('${trigger?.name}').params.options?.buttonLabel }}`,
			) as string) || 'Submit';
	}

	const appendAttribution = context.evaluateExpression(
		`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	renderForm({
		context,
		res,
		formTitle: title,
		formDescription: options.formDescription,
		formFields: fields,
		responseMode: 'responseNode',
		mode,
		redirectUrl: undefined,
		appendAttribution,
		buttonLabel,
		customCss: options.customCss,
	});

	return {
		noWebhookResponse: true,
	};
};

/**
 * Retrieves the Form Trigger context from the workflow.
 *
 * This function uses the new getFormTrigger() API to get the Form Trigger node
 * and validates that it has been executed.
 *
 * @returns The IFormTriggerContext with the node and auth validation capabilities
 * @throws {NodeOperationError} When no Form Trigger node is found
 * @throws {NodeOperationError} When Form Trigger node exists but was not executed
 */
export function getFormTriggerContext(context: IWebhookFunctions): IFormTriggerContext {
	const formTrigger = context.getFormTrigger();

	if (!formTrigger) {
		throw new NodeOperationError(
			context.getNode(),
			'Form Trigger node must be set before this node',
		);
	}

	// Validate it was executed
	try {
		context.evaluateExpression(`{{ $('${formTrigger.node.name}').first() }}`);
	} catch {
		throw new NodeOperationError(context.getNode(), 'Form Trigger node was not executed');
	}

	return formTrigger;
}

/**
 * Retrieves the active Form Trigger node from the workflow.
 *
 * @returns The full INode object representing the active Form Trigger node
 * @throws {NodeOperationError} When no Form Trigger node is found
 * @throws {NodeOperationError} When Form Trigger node exists but was not executed
 */
export function getFormTriggerNode(context: IWebhookFunctions): INode {
	return getFormTriggerContext(context).node;
}
