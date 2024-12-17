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
	jsonParse,
} from 'n8n-workflow';

import type { FormTriggerData, FormTriggerInput } from './interfaces';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from './interfaces';

import { WebhookAuthorizationError } from '../Webhook/error';
import { validateWebhookAuthentication } from '../Webhook/utils';

import { DateTime } from 'luxon';
import isbot from 'isbot';
import type { Response } from 'express';
import { getResolvables } from '../../utils/utilities';

export function prepareFormData({
	formTitle,
	formDescription,
	formSubmittedHeader,
	formSubmittedText,
	redirectUrl,
	formFields,
	testRun,
	query,
	instanceId,
	useResponseData,
	appendAttribution = true,
	buttonLabel,
}: {
	formTitle: string;
	formDescription: string;
	formSubmittedText: string | undefined;
	redirectUrl: string | undefined;
	formFields: FormFieldsParameter;
	testRun: boolean;
	query: IDataObject;
	instanceId?: string;
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
	formSubmittedHeader?: string;
}) {
	const validForm = formFields.length > 0;
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData: FormTriggerData = {
		testRun,
		validForm,
		formTitle,
		formDescription,
		formSubmittedHeader,
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
		useResponseData,
		appendAttribution,
		buttonLabel,
	};

	if (redirectUrl) {
		if (!redirectUrl.includes('://')) {
			redirectUrl = `http://${redirectUrl}`;
		}
		formData.redirectUrl = redirectUrl;
	}

	if (!validForm) {
		return formData;
	}

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect, placeholder } = field;

		const input: IDataObject = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
			defaultValue: query[field.fieldLabel] ?? '',
			placeholder,
		};

		if (multiselect) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}_${input.id}`,
					label: e.option,
				})) ?? [];
		} else if (fieldType === 'file') {
			input.isFileInput = true;
			input.acceptFileTypes = field.acceptFileTypes;
			input.multipleFiles = field.multipleFiles ? 'multiple' : '';
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date' | 'email';
		}

		formData.formFields.push(input as FormTriggerInput);
	}

	return formData;
}

const checkResponseModeConfiguration = (context: IWebhookFunctions) => {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const connectedNodes = context.getChildNodes(context.getNode().name);

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

	if (isRespondToWebhookConnected && responseMode !== 'responseNode') {
		throw new NodeOperationError(
			context.getNode(),
			new Error(`${context.getNode().name} node not correctly configured`),
			{
				description:
					'Set the “Respond When” parameter to “Using Respond to Webhook Node” or remove the Respond to Webhook node',
			},
		);
	}
};

export async function prepareFormReturnItem(
	context: IWebhookFunctions,
	formFields: FormFieldsParameter,
	mode: 'test' | 'production',
	useWorkflowTimezone: boolean = false,
) {
	const bodyData = (context.getBodyData().data as IDataObject) ?? {};
	const files = (context.getBodyData().files as IDataObject) ?? {};

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
			bodyData[key] = filesInput.map((file) => ({
				filename: file.originalFilename,
				mimetype: file.mimetype,
				size: file.size,
			}));
			processFiles.push(...filesInput);
			multiFile = true;
		} else {
			bodyData[key] = {
				filename: filesInput.originalFilename,
				mimetype: filesInput.mimetype,
				size: filesInput.size,
			};
			processFiles.push(filesInput);
		}

		const entryIndex = Number(key.replace(/field-/g, ''));
		const fieldLabel = isNaN(entryIndex) ? key : formFields[entryIndex].fieldLabel;

		let fileCount = 0;
		for (const file of processFiles) {
			let binaryPropertyName = fieldLabel.replace(/\W/g, '_');

			if (multiFile) {
				binaryPropertyName += `_${fileCount++}`;
			}

			returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
				file.filepath,
				file.originalFilename ?? file.newFilename,
				file.mimetype,
			);
		}
	}

	for (const [index, field] of formFields.entries()) {
		const key = `field-${index}`;
		let value = bodyData[key] ?? null;

		if (value === null) {
			returnItem.json[field.fieldLabel] = null;
			continue;
		}

		if (field.fieldType === 'number') {
			value = Number(value);
		}
		if (field.fieldType === 'text') {
			value = String(value).trim();
		}
		if (field.multiselect && typeof value === 'string') {
			value = jsonParse(value);
		}
		if (field.fieldType === 'date' && value && field.formatDate !== '') {
			value = DateTime.fromFormat(String(value), 'yyyy-mm-dd').toFormat(field.formatDate as string);
		}
		if (field.fieldType === 'file' && field.multipleFiles && !Array.isArray(value)) {
			value = [value];
		}

		returnItem.json[field.fieldLabel] = value;
	}

	const timezone = useWorkflowTimezone ? context.getTimezone() : 'UTC';
	returnItem.json.submittedAt = DateTime.now().setZone(timezone).toISO();

	returnItem.json.formMode = mode;

	const workflowStaticData = context.getWorkflowStaticData('node');
	if (
		Object.keys(workflowStaticData || {}).length &&
		context.getNode().type === FORM_TRIGGER_NODE_TYPE
	) {
		returnItem.json.formQueryParameters = workflowStaticData;
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
}) {
	formDescription = (formDescription || '').replace(/\\n/g, '\n').replace(/<br>/g, '\n');
	const instanceId = context.getInstanceId();

	const useResponseData = responseMode === 'responseNode';

	let query: IDataObject = {};

	if (context.getNode().type === FORM_TRIGGER_NODE_TYPE) {
		query = context.getRequestObject().query as IDataObject;
		const workflowStaticData = context.getWorkflowStaticData('node');
		for (const key of Object.keys(query)) {
			workflowStaticData[key] = query[key];
		}
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
	});

	res.render('form-trigger', data);
}

export async function formWebhook(
	context: IWebhookFunctions,
	authProperty = FORM_TRIGGER_AUTHENTICATION_PROPERTY,
) {
	const node = context.getNode();
	const options = context.getNodeParameter('options', {}) as {
		ignoreBots?: boolean;
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
	};
	const res = context.getResponseObject();
	const req = context.getRequestObject();

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

	checkResponseModeConfiguration(context);

	//Show the form on GET request
	if (method === 'GET') {
		const formTitle = context.getNodeParameter('formTitle', '') as string;
		const formDescription = context.getNodeParameter('formDescription', '') as string;
		const responseMode = context.getNodeParameter('responseMode', '') as string;

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

		if (!redirectUrl && node.type !== FORM_TRIGGER_NODE_TYPE) {
			const connectedNodes = context.getChildNodes(context.getNode().name);
			const hasNextPage = connectedNodes.some(
				(n) => n.type === FORM_NODE_TYPE || n.type === WAIT_NODE_TYPE,
			);

			if (hasNextPage) {
				redirectUrl = context.evaluateExpression('{{ $execution.resumeFormUrl }}') as string;
			}
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
