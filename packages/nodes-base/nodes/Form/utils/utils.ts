import type { Response } from 'express';
import { rm } from 'fs/promises';
import isbot from 'isbot';
import { DateTime } from 'luxon';
import { getHtmlSandboxCSP, isFormHtmlSandboxingDisabled } from 'n8n-core';
import type {
	INodeExecutionData,
	MultiPartFormData,
	IDataObject,
	IWebhookFunctions,
	FormFieldsParameter,
	NodeTypeAndVersion,
} from 'n8n-workflow';
import {
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	WAIT_NODE_TYPE,
	WorkflowConfigurationError,
	jsonParse,
	BINARY_MODE_COMBINED,
	tryToParseJsonToFormFields,
	sanitizeHtml,
	handleNewlines,
	sanitizeCustomCss,
	validateSafeRedirectUrl,
	createDescriptionMetadata,
	getFieldIdentifier,
	prepareFormFields,
	prepareFormData,
} from 'n8n-workflow';
import * as a from 'node:assert';

import { getResolvables } from '../../../utils/utilities';
import { WebhookAuthorizationError } from '../../Webhook/error';
import {
	generateFormPostBasicAuthToken,
	isIpAllowed,
	validateWebhookAuthentication,
} from '../../Webhook/utils';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';

export {
	sanitizeHtml,
	handleNewlines,
	sanitizeCustomCss,
	validateSafeRedirectUrl,
	createDescriptionMetadata,
	prepareFormFields,
	prepareFormData,
};

export const validateResponseModeConfiguration = (context: IWebhookFunctions) => {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const connectedNodes = context.getChildNodes(context.getNode().name);
	const nodeVersion = context.getNode().typeVersion;

	const isRespondToWebhookConnected = connectedNodes.some(
		(node) => node.type === 'n8n-nodes-base.respondToWebhook',
	);

	if (!isRespondToWebhookConnected && responseMode === 'responseNode') {
		throw new NodeOperationError(
			context.getNode(),
			new Error('No Respond to Webhook node found in the workflow'),
			{
				description:
					'Insert a Respond to Webhook node to your workflow to respond to the form submission or choose another option for the “Respond When” parameter',
			},
		);
	}

	if (isRespondToWebhookConnected && responseMode !== 'responseNode' && nodeVersion <= 2.1) {
		throw new WorkflowConfigurationError(
			context.getNode(),
			new Error('Unused Respond to Webhook node found in the workflow'),
			{
				description:
					'Set the “Respond When” parameter to “Using Respond to Webhook Node” or remove the Respond to Webhook node',
			},
		);
	}

	if (isRespondToWebhookConnected && nodeVersion > 2.1) {
		throw new NodeOperationError(
			context.getNode(),
			new Error(
				'The "Respond to Webhook" node is not supported in workflows initiated by the "n8n Form Trigger"',
			),
			{
				description:
					'To configure your response, add an "n8n Form" node and set the "Page Type" to "Form Ending"',
			},
		);
	}
};

export function addFormResponseDataToReturnItem(
	returnItem: INodeExecutionData,
	formFields: FormFieldsParameter,
	bodyData: IDataObject,
	nodeVersion?: number,
) {
	for (const [index, field] of formFields.entries()) {
		const key = `field-${index}`;
		const name = getFieldIdentifier(field, nodeVersion);
		let value = bodyData[key] ?? null;

		if (value === null) {
			returnItem.json[name] = null;
			continue;
		}

		if (field.fieldType === 'html') {
			if (field.elementName) {
				returnItem.json[field.elementName] = value;
			}
			continue;
		}

		if (field.fieldType === 'number') {
			value = Number(value);
		}
		if (field.fieldType === 'text') {
			value = String(value).trim();
		}
		if (
			(field.multiselect || field.fieldType === 'checkbox' || field.fieldType === 'radio') &&
			typeof value === 'string'
		) {
			value = jsonParse(value);

			if (field.fieldType === 'radio' && Array.isArray(value)) {
				value = value[0];
			}
		}
		if (field.fieldType === 'date' && value && field.formatDate) {
			const datetime = DateTime.fromFormat(String(value), 'yyyy-mm-dd');
			value = datetime.toFormat(field.formatDate as string);
		}
		if (field.fieldType === 'file' && field.multipleFiles && !Array.isArray(value)) {
			value = [value];
		}

		returnItem.json[name] = value;
	}
}

export async function prepareFormReturnItem(
	context: IWebhookFunctions,
	formFields: FormFieldsParameter,
	mode: 'test' | 'production',
	useWorkflowTimezone: boolean = false,
) {
	const req = context.getRequestObject() as MultiPartFormData.Request;
	a.ok(req.contentType === 'multipart/form-data', 'Expected multipart/form-data');
	const bodyData = (context.getBodyData().data as IDataObject) ?? {};
	const files = (context.getBodyData().files as IDataObject) ?? {};
	const { binaryMode } = context.getWorkflowSettings();

	const returnItem: INodeExecutionData = {
		json: {},
	};
	if (files && Object.keys(files).length) {
		returnItem.binary = {};
	}

	for (const key of Object.keys(files)) {
		const processFiles: MultiPartFormData.File[] = [];
		let multiFile = false;
		const filesInput = files[key] as MultiPartFormData.File[] | MultiPartFormData.File;

		if (Array.isArray(filesInput)) {
			bodyData[key] =
				binaryMode === BINARY_MODE_COMBINED
					? []
					: filesInput.map((file) => ({
							filename: file.originalFilename,
							mimetype: file.mimetype,
							size: file.size,
						}));
			processFiles.push(...filesInput);
			multiFile = true;
		} else {
			bodyData[key] =
				binaryMode === BINARY_MODE_COMBINED
					? {}
					: {
							filename: filesInput.originalFilename,
							mimetype: filesInput.mimetype,
							size: filesInput.size,
						};
			processFiles.push(filesInput);
		}

		const entryIndex = Number(key.replace(/field-/g, ''));
		const field = isNaN(entryIndex) ? null : formFields[entryIndex];
		const fieldLabel = field ? getFieldIdentifier(field, context.getNode().typeVersion) : key;

		let fileCount = 0;
		for (const file of processFiles) {
			const binaryData = await context.nodeHelpers.copyBinaryFile(
				file.filepath,
				file.originalFilename ?? file.newFilename,
				file.mimetype,
			);

			if (binaryMode === BINARY_MODE_COMBINED) {
				if (Array.isArray(bodyData[key])) {
					(bodyData[key] as IDataObject[]).push(binaryData);
				} else {
					bodyData[key] = binaryData;
				}
			} else {
				let binaryPropertyName = fieldLabel.replace(/\W/g, '_');

				if (multiFile) {
					binaryPropertyName += `_${fileCount++}`;
				}

				returnItem.binary![binaryPropertyName] = binaryData;
			}

			// Delete original file to prevent tmp directory from growing too large
			await rm(file.filepath, { force: true });
		}
	}

	addFormResponseDataToReturnItem(returnItem, formFields, bodyData, context.getNode().typeVersion);

	const timezone = useWorkflowTimezone ? context.getTimezone() : 'UTC';
	returnItem.json.submittedAt = DateTime.now().setZone(timezone).toISO();

	returnItem.json.formMode = mode;

	if (
		context.getNode().type === FORM_TRIGGER_NODE_TYPE &&
		Object.keys(context.getRequestObject().query || {}).length
	) {
		returnItem.json.formQueryParameters = context.getRequestObject().query;
	}

	return returnItem;
}

export function renderForm({
	context,
	res,
	formTitle,
	formDescription,
	formFields,
	responseMode,
	mode,
	formSubmittedText,
	redirectUrl,
	appendAttribution,
	buttonLabel,
	customCss,
	authToken,
}: {
	context: IWebhookFunctions;
	res: Response;
	formTitle: string;
	formDescription: string;
	formFields: FormFieldsParameter;
	responseMode: string;
	mode: 'test' | 'production';
	formSubmittedText?: string;
	redirectUrl?: string;
	appendAttribution?: boolean;
	buttonLabel?: string;
	customCss?: string;
	authToken?: string;
}) {
	const instanceId = context.getInstanceId();

	const useResponseData = responseMode === 'responseNode';

	let query: IDataObject = {};

	if (context.getNode().type === FORM_TRIGGER_NODE_TYPE) {
		query = context.getRequestObject().query as IDataObject;
	} else if (context.getNode().type === FORM_NODE_TYPE) {
		const parentNodes = context.getParentNodes(context.getNode().name);
		const trigger = parentNodes.find(
			(node) => node.type === FORM_TRIGGER_NODE_TYPE,
		) as NodeTypeAndVersion;
		try {
			const triggerQueryParameters = context.evaluateExpression(
				`{{ $('${trigger?.name}').first().json.formQueryParameters }}`,
			) as IDataObject;

			if (triggerQueryParameters) {
				query = triggerQueryParameters;
			}
		} catch (error) {}
	}

	formFields = prepareFormFields(formFields);

	const data = prepareFormData({
		formTitle,
		formDescription,
		formSubmittedText,
		redirectUrl,
		formFields,
		testRun: mode === 'test',
		query,
		instanceId,
		useResponseData,
		appendAttribution,
		buttonLabel,
		customCss,
		nodeVersion: context.getNode().typeVersion,
		authToken,
	});

	if (!isFormHtmlSandboxingDisabled()) {
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
	}
	res.render('form-trigger', data);
}

export const isFormConnected = (nodes: NodeTypeAndVersion[]) => {
	return nodes.some(
		(n) =>
			n.type === FORM_NODE_TYPE || (n.type === WAIT_NODE_TYPE && n.parameters?.resume === 'form'),
	);
};

export async function formWebhook(
	context: IWebhookFunctions,
	authProperty = FORM_TRIGGER_AUTHENTICATION_PROPERTY,
) {
	const node = context.getNode();
	const options = context.getNodeParameter('options', {}) as {
		ignoreBots?: boolean;
		ipWhitelist?: string;
		respondWithOptions?: {
			values: {
				respondWith: 'text' | 'redirect';
				formSubmittedText: string;
				redirectUrl: string;
			};
		};
		formSubmittedText?: string;
		useWorkflowTimezone?: boolean;
		appendAttribution?: boolean;
		buttonLabel?: string;
		customCss?: string;
	};
	const res = context.getResponseObject();
	const req = context.getRequestObject();

	// Check IP allowlist first (before bot detection and authentication)
	if (!isIpAllowed(options.ipWhitelist, req.ips, req.ip)) {
		res.writeHead(403);
		res.end('IP is not allowed to access this form!');
		return { noWebhookResponse: true };
	}

	try {
		if (options.ignoreBots && isbot(req.headers['user-agent'])) {
			throw new WebhookAuthorizationError(403);
		}
		if (node.typeVersion > 1) {
			await validateWebhookAuthentication(context, authProperty);
		}
	} catch (error) {
		if (error instanceof WebhookAuthorizationError) {
			res.setHeader('WWW-Authenticate', 'Basic realm="Enter credentials"');
			res.status(401).send();
			return { noWebhookResponse: true };
		}
		throw error;
	}

	const mode = context.getMode() === 'manual' ? 'test' : 'production';
	const formFields = context.getNodeParameter('formFields.values', []) as FormFieldsParameter;

	const method = context.getRequestObject().method;

	validateResponseModeConfiguration(context);

	//Show the form on GET request
	if (method === 'GET') {
		const formTitle = context.getNodeParameter('formTitle', '') as string;
		const formDescription = handleNewlines(
			sanitizeHtml(context.getNodeParameter('formDescription', '') as string),
		);
		let responseMode = context.getNodeParameter('responseMode', '') as string;

		let formSubmittedText;
		let redirectUrl;
		let appendAttribution = true;

		if (options.respondWithOptions) {
			const values = (options.respondWithOptions as IDataObject).values as IDataObject;
			if (values.respondWith === 'text') {
				formSubmittedText = values.formSubmittedText as string;
			}
			if (values.respondWith === 'redirect') {
				redirectUrl = values.redirectUrl as string;
			}
		} else {
			formSubmittedText = options.formSubmittedText as string;
		}

		if (options.appendAttribution === false) {
			appendAttribution = false;
		}

		let buttonLabel = 'Submit';

		if (options.buttonLabel) {
			buttonLabel = options.buttonLabel;
		}

		const connectedNodes = context.getChildNodes(context.getNode().name, {
			includeNodeParameters: true,
		});
		const hasNextPage = isFormConnected(connectedNodes);

		if (hasNextPage) {
			redirectUrl = undefined;
			responseMode = 'responseNode';
		}

		let authToken: string | undefined;
		if (node.typeVersion > 1) {
			authToken = await generateFormPostBasicAuthToken(context, authProperty);
		}

		renderForm({
			context,
			res,
			formTitle,
			formDescription,
			formFields,
			responseMode,
			mode,
			formSubmittedText,
			redirectUrl,
			appendAttribution,
			buttonLabel,
			customCss: options.customCss,
			authToken,
		});

		return {
			noWebhookResponse: true,
		};
	}

	let { useWorkflowTimezone } = options;

	if (useWorkflowTimezone === undefined && node.typeVersion > 2) {
		useWorkflowTimezone = true;
	}

	const returnItem = await prepareFormReturnItem(context, formFields, mode, useWorkflowTimezone);

	return {
		webhookResponse: { status: 200 },
		workflowData: [[returnItem]],
	};
}

export function resolveRawData(context: IWebhookFunctions, rawData: string) {
	const resolvables = getResolvables(rawData);
	let returnData: string = rawData;

	if (returnData.startsWith('=')) {
		returnData = returnData.replace(/^=+/, '');
	} else {
		return returnData;
	}

	if (resolvables.length) {
		for (const resolvable of resolvables) {
			const resolvedValue = context.evaluateExpression(`${resolvable}`);

			if (typeof resolvedValue === 'object' && resolvedValue !== null) {
				returnData = returnData.replace(resolvable, JSON.stringify(resolvedValue));
			} else {
				returnData = returnData.replace(resolvable, resolvedValue as string);
			}
		}
	}
	return returnData;
}

type ParseFormFieldsOptions = {
	defineForm: 'json' | 'fields';
	fieldsParameterName: string;
	mode?: 'test' | 'production';
};
export function parseFormFields(context: IWebhookFunctions, options: ParseFormFieldsOptions) {
	let fields: FormFieldsParameter = [];
	if (options.defineForm === 'json') {
		try {
			const jsonOutput = context.getNodeParameter(options.fieldsParameterName, '', {
				rawExpressions: true,
			}) as string;

			fields = tryToParseJsonToFormFields(resolveRawData(context, jsonOutput));
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error.message, {
				description: error.message,
				type: options.mode === 'test' ? 'manual-form-test' : undefined,
			});
		}
	} else {
		fields = context.getNodeParameter(options.fieldsParameterName, []) as FormFieldsParameter;
		for (const field of fields) {
			if (field.fieldType === 'html') {
				let html = field.html ?? '';
				for (const resolvable of getResolvables(html)) {
					html = html.replace(resolvable, context.evaluateExpression(resolvable) as string);
				}
				field.html = html;
			}
		}
	}
	return fields;
}
