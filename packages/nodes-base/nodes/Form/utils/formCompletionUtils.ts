import { type Response } from 'express';
import { getHtmlSandboxCSP, isFormHtmlSandboxingDisabled } from 'n8n-core';
import {
	type NodeTypeAndVersion,
	type IUser,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type IBinaryData,
	type IDataObject,
	OperationalError,
} from 'n8n-workflow';

import {
	generateFormUserAuthToken,
	getHostNavigationPath,
	getNodeReference,
	handleNewlines,
	resolveRawData,
	sanitizeCustomCss,
	sanitizeHtml,
	validateSafeRedirectUrl,
} from './utils';

type BinaryResponse = { data: string | Buffer; fileName: string; type: string };

const getBinaryDataFromNode = (
	context: IWebhookFunctions,
	nodeName: string,
): IDataObject | undefined => {
	try {
		return context.evaluateExpression(`{{ ${getNodeReference(nodeName)}.first().binary }}`) as
			| IDataObject
			| undefined;
	} catch {
		// Parent nodes without run data (e.g. branches of another Form Trigger,
		// or nodes that ran before a resumed waiting form in queue mode) throw
		// an ExpressionError — treat them as having no binary data.
		return undefined;
	}
};

const getInputDataFieldNames = (inputDataFieldName: string) => {
	const fieldNames = inputDataFieldName
		.split(',')
		.map((fieldName) => fieldName.trim())
		.filter(Boolean);

	return fieldNames.length ? fieldNames : [inputDataFieldName];
};

export const binaryResponse = async (context: IWebhookFunctions): Promise<BinaryResponse[]> => {
	const inputDataFieldName = context.getNodeParameter('inputDataFieldName', '') as string;
	const inputDataFieldNames = getInputDataFieldNames(inputDataFieldName);
	const responses: BinaryResponse[] = [];
	const parentNodesBinaries = context
		.getParentNodes(context.getNode().name)
		.reverse()
		.map((node) => getBinaryDataFromNode(context, node.name) ?? {});

	for (const fieldName of inputDataFieldNames) {
		const nodeBinary = parentNodesBinaries.find((bin) => Object.hasOwn(bin, fieldName));
		if (!nodeBinary) {
			throw new OperationalError(`No binary data with field ${fieldName} found.`);
		}

		const binaryData = nodeBinary[fieldName] as IBinaryData;

		responses.push({
			// If a binaryData has an id, the following field is set:
			// N8N_DEFAULT_BINARY_DATA_MODE=filesystem
			data: binaryData.id
				? await context.helpers.binaryToBuffer(await context.helpers.getBinaryStream(binaryData.id))
				: atob(binaryData.data),
			fileName: binaryData.fileName ?? 'file',
			type: binaryData.mimeType,
		});
	}

	return responses;
};

export const renderFormCompletion = async (
	context: IWebhookFunctions,
	res: Response,
	trigger: NodeTypeAndVersion,
	authedUser?: IUser,
): Promise<IWebhookResponseData> => {
	const completionTitle = context.getNodeParameter('completionTitle', '') as string;
	const completionMessage = handleNewlines(
		sanitizeHtml(context.getNodeParameter('completionMessage', '') as string),
	);
	const redirectUrl = context.getNodeParameter('redirectUrl', '') as string;
	const options = context.getNodeParameter('options', {}) as {
		formTitle: string;
		customCss?: string;
	};
	const respondWith = context.getNodeParameter('respondWith', '') as
		| 'text'
		| 'redirect'
		| 'showText'
		| 'returnBinary';
	const responseText =
		respondWith === 'showText'
			? ((context.getNodeParameter('responseText', '') as string) ?? '')
			: '';
	const binary = respondWith === 'returnBinary' ? await binaryResponse(context) : [];
	const triggerRef = getNodeReference(trigger.name);

	let title = options.formTitle;
	if (!title) {
		title = context.evaluateExpression(`{{ ${triggerRef}.params.formTitle }}`) as string;
		title = resolveRawData(context, title);
	}
	const appendAttribution = context.evaluateExpression(
		`{{ ${triggerRef}.params.options?.appendAttribution === false ? false : true }}`,
	) as boolean;

	if (respondWith !== 'redirect' && !isFormHtmlSandboxingDisabled()) {
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
	}

	// Embed the form auth token so the completion page's auto-POST (which
	// resumes the paused workflow) can re-authenticate the user — cookies
	// aren't sent on fetch from the sandboxed completion page.
	const authToken = authedUser
		? generateFormUserAuthToken(context.getNode(), authedUser, {
				workflowId: context.getWorkflow().id,
				executionId: context.getExecutionId(),
			})
		: undefined;

	res.render('form-trigger-completion', {
		title: completionTitle,
		message: completionMessage,
		formTitle: title,
		appendAttribution,
		responseText,
		responseBinary: encodeURIComponent(JSON.stringify(binary)),
		dangerousCustomCss: sanitizeCustomCss(options.customCss),
		redirectUrl: validateSafeRedirectUrl(redirectUrl) ?? undefined,
		authToken,
		// The completion page reloads itself while the run finishes, and that hop is
		// subject to the same cookie semantics as every other page of the form, so it
		// goes through the host when the host is the shell.
		hostNavigationPath: getHostNavigationPath(context),
	});

	return { noWebhookResponse: true };
};
