import { Container } from '@n8n/di';
import type { Response } from 'express';
import { rm } from 'fs/promises';
import isbot from 'isbot';
import { DateTime } from 'luxon';
import {
	FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
	InstanceSettings,
	getHtmlSandboxCSP,
	isFormHtmlSandboxingDisabled,
	signFormOauthJwt,
	type FormOauthSessionJwtPayload,
} from 'n8n-core';
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
	tryToParseUrl,
	BINARY_MODE_COMBINED,
	tryToParseJsonToFormFields,
} from 'n8n-workflow';
import * as a from 'node:assert';
import sanitize from 'sanitize-html';

import { getResolvables } from '../../../utils/utilities';
import { WebhookAuthorizationError, WebhookOauthAuthorizationError } from '../../Webhook/error';
import {
	generateFormPostBasicAuthToken,
	isIpAllowed,
	validateWebhookAuthentication,
} from '../../Webhook/utils';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';
import type { FormLoggedInBanner, FormTriggerData, FormField } from '../interfaces';

export function sanitizeHtml(text: string) {
	return sanitize(text, {
		allowedTags: [
			'b',
			'div',
			'i',
			'iframe',
			'img',
			'video',
			'source',
			'em',
			'strong',
			'a',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'u',
			'sub',
			'sup',
			'code',
			'pre',
			'span',
			'br',
			'ul',
			'ol',
			'li',
			'p',
			'table',
			'thead',
			'tbody',
			'tfoot',
			'td',
			'tr',
			'th',
			'br',
		],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height'],
			video: ['controls', 'autoplay', 'loop', 'muted', 'poster', 'width', 'height'],
			iframe: [
				'src',
				'width',
				'height',
				'frameborder',
				'allow',
				'allowfullscreen',
				'referrerpolicy',
			],
			source: ['src', 'type'],
			td: ['colspan', 'rowspan', 'scope', 'headers'],
			th: ['colspan', 'rowspan', 'scope', 'headers'],
		},
		allowedSchemes: ['https', 'http'],
		allowedSchemesByTag: {
			source: ['https', 'http'],
			iframe: ['https', 'http'],
		},
		allowProtocolRelative: false,
		transformTags: {
			iframe: sanitize.simpleTransform('iframe', {
				sandbox: '',
				referrerpolicy: 'strict-origin-when-cross-origin',
				allow: 'fullscreen; autoplay; encrypted-media',
			}),
		},
	});
}

/**
 *  Replaces `\n` strings with actual newline characters.
 *  Also replaces `\\n` strings with `\n` string
 * @param text - The text to replace newlines in
 * @returns Updated text
 */
export const handleNewlines = (text: string) => {
	return text.replace(/\\n|\\\\n/g, (match) => (match === '\\\\n' ? '\\n' : '\n'));
};

export const prepareFormFields = (fields: FormFieldsParameter) => {
	return fields.map((field) => {
		if (field.fieldType === 'html' && field.html) {
			field.html = sanitizeHtml(field.html);
		}
		if (field.fieldType === 'hiddenField') {
			field.fieldLabel = field.fieldName as string;
		}

		return field;
	});
};

export function sanitizeCustomCss(css: string | undefined): string | undefined {
	if (!css) return undefined;

	const sanitized = sanitize(css, {
		allowedTags: [],
		allowedAttributes: {},
	});

	// Restore only the entities needed for valid CSS after tag stripping.
	// &gt; → > is needed for CSS child combinator selectors (div > p).
	// &amp; → & is needed for CSS values, but NOT when followed by lt;/gt;/amp;
	// to prevent cascading decode of double-encoded entities.
	// &lt; is never decoded — < is not valid in CSS and would enable tag injection.
	return sanitized.replace(/&gt;/g, '>').replace(/&amp;(?!(?:lt|gt|amp);)/g, '&');
}

/**
 * Validates that a URL uses a safe scheme.
 * Returns the normalized URL if valid, or null if invalid.
 */
export function validateSafeRedirectUrl(url: string | undefined): string | null {
	if (!url) return null;
	const trimmed = url.trim();
	if (!trimmed) return null;

	try {
		return tryToParseUrl(trimmed);
	} catch {
		return null;
	}
}

export function createDescriptionMetadata(description: string) {
	return description === ''
		? 'n8n form'
		: description.replace(/^\s*\n+|<\/?[^>]+(>|$)/g, '').slice(0, 150);
}

/**
 * Gets the field identifier to use based on node version.
 * For v2.4+, uses fieldName as the primary identifier.
 * For earlier versions, falls back to fieldLabel.
 */
function getFieldIdentifier(field: FormFieldsParameter[number], nodeVersion?: number): string {
	if (nodeVersion && nodeVersion >= 2.4 && field.fieldName) {
		return field.fieldName;
	}

	return field.fieldLabel ?? field.fieldName ?? '';
}

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
	customCss,
	nodeVersion,
	authToken,
	loggedInBanner,
	userClaimsSigned,
	canonicalFormUrl,
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
	customCss?: string;
	nodeVersion?: number;
	authToken?: string;
	loggedInBanner?: FormLoggedInBanner;
	userClaimsSigned?: string;
	canonicalFormUrl?: string;
}) {
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData: FormTriggerData = {
		testRun,
		formTitle,
		formDescription,
		formDescriptionMetadata: createDescriptionMetadata(formDescription),
		formSubmittedHeader,
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
		useResponseData,
		appendAttribution,
		buttonLabel,
		dangerousCustomCss: sanitizeCustomCss(customCss),
		authToken,
		loggedInBanner,
		userClaimsSigned,
		canonicalFormUrl,
	};

	if (redirectUrl) {
		const safeUrl = validateSafeRedirectUrl(redirectUrl);
		if (safeUrl) {
			formData.redirectUrl = safeUrl;
		}
	}

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect, placeholder, defaultValue } = field;
		const queryParam = getFieldIdentifier(field, nodeVersion);

		const input: FormField = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
			defaultValue: query[queryParam] ?? defaultValue ?? '',
			placeholder,
		};

		if (multiselect || (fieldType && ['radio', 'checkbox'].includes(fieldType))) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}_${input.id}`,
					label: e.option,
				})) ?? [];

			if (fieldType === 'radio') {
				input.radioSelect = 'radio';
			} else if (field.limitSelection === 'exact') {
				input.exactSelectedOptions = field.numberOfSelections;
			} else if (field.limitSelection === 'range') {
				input.minSelectedOptions = field.minSelections;
				input.maxSelectedOptions = field.maxSelections;
			}
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
		} else if (fieldType === 'html') {
			input.isHtml = true;
			input.html = field.html as string;
		} else if (fieldType === 'hiddenField') {
			input.isHidden = true;
			input.hiddenName = field.fieldName as string;
			input.hiddenValue =
				input.defaultValue === '' ? (field.fieldValue as string) : input.defaultValue;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date' | 'email';
		}

		formData.formFields.push(input);
	}

	return formData;
}

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
	oauthClaims?: Record<string, unknown>,
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

	if (oauthClaims) {
		const userOutputField = context.getNodeParameter('userOutputField', 'user') as string;
		if (userOutputField) {
			returnItem.json[userOutputField] = oauthClaims as IDataObject;
		}
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
	loggedInBanner,
	userClaimsSigned,
	canonicalFormUrl,
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
	loggedInBanner?: FormLoggedInBanner;
	userClaimsSigned?: string;
	canonicalFormUrl?: string;
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
		loggedInBanner,
		userClaimsSigned,
		canonicalFormUrl,
	});

	if (!isFormHtmlSandboxingDisabled()) {
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
	}
	res.render('form-trigger', data);
}

function buildLoggedInBanner(
	claims: Record<string, unknown>,
	canonicalFormUrl: string,
): FormLoggedInBanner {
	const pickString = (...candidates: Array<keyof typeof claims>): string | undefined => {
		for (const key of candidates) {
			const value = claims[key];
			if (typeof value === 'string' && value.length > 0) return value;
		}
		return undefined;
	};

	const displayName = pickString('name', 'preferred_username', 'email', 'sub') ?? 'User';
	const email = pickString('email');
	const separator = canonicalFormUrl.includes('?') ? '&' : '?';
	return {
		displayName,
		email,
		logoutUrl: `${canonicalFormUrl}${separator}reauth=1`,
	};
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

	let sessionClaims: Record<string, unknown> | undefined;
	let sessionJwtFromOauthExchange: string | undefined;

	// OAuth-login mode uses the form's own URL as the OAuth redirect_uri, so the
	// IDP redirects back here with `code` + `state` in the query string. Handle
	// that exchange first; on success, fall through to the normal GET render path
	// with the resulting claims attached.
	const oauthCode = typeof req.query?.code === 'string' ? req.query.code : undefined;
	const oauthState = typeof req.query?.state === 'string' ? req.query.state : undefined;
	const isOauthCallback =
		req.method === 'GET' &&
		oauthCode !== undefined &&
		oauthState !== undefined &&
		(context.getNodeParameter(authProperty, '') as string) === 'oauthLogin';

	try {
		if (options.ignoreBots && isbot(req.headers['user-agent'])) {
			throw new WebhookAuthorizationError(403);
		}

		if (isOauthCallback && oauthCode && oauthState) {
			const result = await context.helpers.exchangeWebhookOauthCode({
				code: oauthCode,
				state: oauthState,
			});
			sessionClaims = result.claims;
			sessionJwtFromOauthExchange = result.sessionJwt;
		} else if (node.typeVersion > 1) {
			const authResult = await validateWebhookAuthentication(context, authProperty);
			if (authResult && typeof authResult === 'object' && 'claims' in authResult) {
				const claims = (authResult as unknown as FormOauthSessionJwtPayload).claims;
				if (claims && typeof claims === 'object') {
					sessionClaims = claims;
				}
			}
		}
	} catch (error) {
		if (error instanceof WebhookOauthAuthorizationError) {
			// Browser GET → redirect to IDP; POST without valid session → 401 so the
			// form client can decide to reload (which restarts the redirect dance).
			if (req.method === 'GET') {
				res.redirect(302, error.redirectUrl);
			} else {
				res.status(401).send();
			}
			return { noWebhookResponse: true };
		}
		if (error instanceof WebhookAuthorizationError) {
			res.setHeader('WWW-Authenticate', 'Basic realm="Enter credentials"');
			res.status(401).send();
			return { noWebhookResponse: true };
		}
		// OAuth callback exchange failure (invalid state, token exchange failed, etc.) —
		// neutral error so the user can retry without leaking IDP details.
		if (isOauthCallback) {
			const baseUrl = req.originalUrl.split('?')[0] ?? req.originalUrl;
			if (!isFormHtmlSandboxingDisabled()) {
				res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
			}
			res.status(400).render('form-trigger-auth-error', {
				title: 'Sign-in failed',
				message: 'Could not complete sign-in. Please try again.',
				retryUrl: baseUrl,
			});
			return { noWebhookResponse: true };
		}
		throw error;
	}

	const mode = context.getMode() === 'manual' ? 'test' : 'production';
	const formFields = context.getNodeParameter('formFields.values', []) as FormFieldsParameter;

	for (const field of formFields) {
		if (field.fieldType === 'html') {
			let html = field.html ?? '';
			for (const resolvable of getResolvables(html)) {
				html = html.replace(resolvable, context.evaluateExpression(resolvable) as string);
			}
			field.html = html;
		}
	}

	const method = context.getRequestObject().method;

	validateResponseModeConfiguration(context);

	// Show the form on GET request. For OAuth-login mode, GET fires twice:
	// (a) the initial visit (no token, redirected to IDP above) and
	// (b) the IDP callback (`?code=&state=` already exchanged into sessionClaims
	//     in the auth block above) — both flow through this same render path.
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

		// OAuth login mode — refresh the session JWT so subsequent submissions get
		// a fresh exp window, build the banner, and pass the canonical form URL so
		// the rendered page can `history.replaceState` the visible URL.
		let loggedInBanner: FormLoggedInBanner | undefined;
		let userClaimsSigned: string | undefined;
		let canonicalFormUrl: string | undefined;
		if (sessionClaims) {
			canonicalFormUrl = req.originalUrl.split('?')[0] ?? req.originalUrl;
			const showBanner = context.getNodeParameter('showLoggedInBanner', true) as boolean;
			if (showBanner) {
				loggedInBanner = buildLoggedInBanner(sessionClaims, canonicalFormUrl);
			}
			// Prefer the JWT just minted by the OAuth exchange (fresh from the IDP);
			// otherwise re-sign with the current claims so each render refreshes exp.
			userClaimsSigned =
				sessionJwtFromOauthExchange ??
				signFormOauthJwt(
					{
						wf: context.getWorkflow().id ?? '',
						node: node.id,
						claims: sessionClaims,
					},
					Container.get(InstanceSettings).hmacSignatureSecret,
					FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
				);
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
			loggedInBanner,
			userClaimsSigned,
			canonicalFormUrl,
		});

		return {
			noWebhookResponse: true,
		};
	}

	let { useWorkflowTimezone } = options;

	if (useWorkflowTimezone === undefined && node.typeVersion > 2) {
		useWorkflowTimezone = true;
	}

	const returnItem = await prepareFormReturnItem(
		context,
		formFields,
		mode,
		useWorkflowTimezone,
		sessionClaims,
	);

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
