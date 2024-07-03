import {
	NodeOperationError,
	jsonParse,
	type IDataObject,
	type IWebhookFunctions,
} from 'n8n-workflow';
import type { FormField, FormTriggerData, FormTriggerInput } from './interfaces';

export const prepareFormData = (
	formTitle: string,
	formDescription: string,
	formSubmittedText: string | undefined,
	redirectUrl: string | undefined,
	formFields: FormField[],
	testRun: boolean,
	instanceId?: string,
	useResponseData?: boolean,
	appendAttribution = true,
) => {
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
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
		useResponseData,
		appendAttribution,
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
		const { fieldType, requiredField, multiselect } = field;

		const input: IDataObject = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
		};

		if (multiselect) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}`,
					label: e.option,
				})) ?? [];
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date';
		}

		formData.formFields.push(input as FormTriggerInput);
	}

	return formData;
};

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

export async function formWebhook(context: IWebhookFunctions) {
	const mode = context.getMode() === 'manual' ? 'test' : 'production';
	const formFields = context.getNodeParameter('formFields.values', []) as FormField[];
	const method = context.getRequestObject().method;

	checkResponseModeConfiguration(context);

	//Show the form on GET request
	if (method === 'GET') {
		const formTitle = context.getNodeParameter('formTitle', '') as string;
		const formDescription = context.getNodeParameter('formDescription', '') as string;
		const instanceId = context.getInstanceId();
		const responseMode = context.getNodeParameter('responseMode', '') as string;
		const options = context.getNodeParameter('options', {}) as IDataObject;

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

		const useResponseData = responseMode === 'responseNode';

		const data = prepareFormData(
			formTitle,
			formDescription,
			formSubmittedText,
			redirectUrl,
			formFields,
			mode === 'test',
			instanceId,
			useResponseData,
			appendAttribution,
		);

		const res = context.getResponseObject();
		res.render('form-trigger', data);
		return {
			noWebhookResponse: true,
		};
	}

	const bodyData = (context.getBodyData().data as IDataObject) ?? {};

	const returnData: IDataObject = {};
	for (const [index, field] of formFields.entries()) {
		const key = `field-${index}`;
		let value = bodyData[key] ?? null;

		if (value === null) returnData[field.fieldLabel] = null;

		if (field.fieldType === 'number') {
			value = Number(value);
		}
		if (field.fieldType === 'text') {
			value = String(value).trim();
		}
		if (field.multiselect && typeof value === 'string') {
			value = jsonParse(value);
		}

		returnData[field.fieldLabel] = value;
	}
	returnData.submittedAt = new Date().toISOString();
	returnData.formMode = mode;

	const webhookResponse: IDataObject = { status: 200 };

	return {
		webhookResponse,
		workflowData: [context.helpers.returnJsonArray(returnData)],
	};
}
