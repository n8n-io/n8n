import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { rm } from 'fs/promises';
import isbot from 'isbot';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import { getHtmlSandboxCSP, InstanceSettings, isFormHtmlSandboxingDisabled } from 'n8n-core';
import type {
	INode,
	INodeExecutionData,
	IUser,
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
import { WebhookAuthorizationError } from '../../Webhook/error';
import {
	generateFormPostBasicAuthToken,
	isIpAllowed,
	validateWebhookAuthentication,
} from '../../Webhook/utils';
import { FORM_TRIGGER_AUTHENTICATION_PROPERTY } from '../interfaces';
import type { FormTriggerData, FormField } from '../interfaces';

/**
 * Time-to-live for the form auth token embedded in n8nUserAuth forms.
 * Long enough for users to fill out a form, short enough to limit damage
 * if the token leaks (e.g. via malicious HTML in form fields).
 */
const FORM_USER_AUTH_TOKEN_TTL_SECONDS = 60 * 60;

type FormUserAuthClaims = {
	sub: string;
	email: string;
	firstName: string;
	lastName: string;
	nid: string;
	wid: string;
};

function isFormUserAuthClaims(value: unknown): value is FormUserAuthClaims {
	if (typeof value !== 'object' || value === null) return false;
	const c = value as Record<string, unknown>;
	return (
		typeof c.sub === 'string' &&
		typeof c.email === 'string' &&
		typeof c.firstName === 'string' &&
		typeof c.lastName === 'string' &&
		typeof c.nid === 'string' &&
		typeof c.wid === 'string'
	);
}

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
	authedUser?: IUser,
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

	if (authedUser) {
		returnItem.json.user = {
			id: authedUser.id,
			email: authedUser.email,
			firstName: authedUser.firstName,
			lastName: authedUser.lastName,
		};
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

/**
 * Build the absolute URL the user originally requested, honouring
 * `x-forwarded-*` headers so it survives behind a reverse proxy. The full URL
 * is required so the post-signin redirect uses `window.location.href = redirect`
 * in SigninView.vue (the `router.push` branch only handles SPA routes, and the
 * public form is served outside the Vue app).
 *
 * Security note: `x-forwarded-host` / `x-forwarded-proto` are attacker-controlled
 * unless the deployer puts a trusted proxy in front (recommended). The redirect
 * value flows through SigninView.vue's `isRedirectSafe()`, which enforces a
 * same-origin check (`url.origin === window.location.origin`). So a spoofed
 * Host header can at worst break the post-signin redirect for that user — it
 * cannot redirect to an attacker-controlled origin.
 */
function buildAbsoluteFormUrl(req: Request): string {
	const headerValue = (name: string) => {
		const raw = req.headers[name];
		return typeof raw === 'string' ? raw.trim() : undefined;
	};
	const protocol = headerValue('x-forwarded-proto') ?? req.protocol ?? 'http';
	const host = headerValue('x-forwarded-host') ?? req.headers.host ?? '';
	return `${protocol}://${host}${req.originalUrl}`;
}

export const isFormConnected = (nodes: NodeTypeAndVersion[]) => {
	return nodes.some(
		(n) =>
			n.type === FORM_NODE_TYPE || (n.type === WAIT_NODE_TYPE && n.parameters?.resume === 'form'),
	);
};

/**
 * Generate a form auth token for n8nUserAuth. The token embeds the user info
 * in a signed JWT so the POST handler can authenticate the submission without
 * relying on the `n8n-auth` cookie (cookies aren't sent on fetch requests from
 * the sandboxed form page because the document has a null origin and the
 * cookie is `SameSite=Lax`).
 *
 * The `nid` and `wid` claims bind the token to a specific node + webhook,
 * preventing replay across forms. Signed with HS256 using the instance's
 * hmac signature secret.
 */
export function generateFormUserAuthToken(node: INode, user: IUser): string {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	const payload: FormUserAuthClaims = {
		sub: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		nid: node.id,
		wid: node.webhookId ?? '',
	};
	return jwt.sign(payload, secret, {
		algorithm: 'HS256',
		expiresIn: FORM_USER_AUTH_TOKEN_TTL_SECONDS,
	});
}

/**
 * Verify a form auth token issued by `generateFormUserAuthToken`. Returns the
 * encoded user on success or `null` on any failure (bad format, expired,
 * wrong signature, wrong node). The caller decides how to surface the failure.
 */
export function verifyFormUserAuthToken(token: string, node: INode): IUser | null {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	let claims: unknown;
	try {
		claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
	} catch {
		return null;
	}
	if (!isFormUserAuthClaims(claims)) return null;
	if (claims.nid !== node.id) return null;
	if (claims.wid !== (node.webhookId ?? '')) return null;
	return {
		id: claims.sub,
		email: claims.email,
		firstName: claims.firstName,
		lastName: claims.lastName,
	};
}

/**
 * Authenticate an `n8nUserAuth` request via:
 * 1. the `n8n-auth` cookie (sent on top-level GET when the user is logged in), or
 * 2. the `x-auth-token` form auth token (used on POST and multi-step page
 *    navigations from the sandboxed form page that can't send cookies).
 *
 * On success returns the user. On failure sends the appropriate response
 * (302 to `/signin` on GET, 401 on POST) and returns `null` — the caller
 * must abort with `noWebhookResponse`.
 */
async function authenticateFormUserOrRespond(context: IWebhookFunctions): Promise<IUser | null> {
	const req = context.getRequestObject();

	// Parse the raw Cookie header rather than `req.cookies` because the webhook
	// path may bypass cookie-parser middleware in some deployments.
	const cookieMatch = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-auth=([^;]+)/);
	if (cookieMatch) {
		try {
			return await context.validateCookieAuth(cookieMatch[1].trim());
		} catch {}
	}

	const formToken = req.headers['x-auth-token'];
	if (typeof formToken === 'string' && formToken) {
		const user = verifyFormUserAuthToken(formToken, context.getNode());
		if (user) return user;
	}

	const res = context.getResponseObject();
	if (req.method === 'GET') {
		res.writeHead(302, {
			Location: `/signin?redirect=${encodeURIComponent(buildAbsoluteFormUrl(req))}`,
		});
		res.end();
	} else {
		res.setHeader('WWW-Authenticate', 'Basic realm="Enter credentials"');
		res.status(401).send();
	}
	return null;
}

/**
 * Multi-step Form/Wait nodes inherit `authentication` from the upstream
 * Form Trigger. This wrapper short-circuits when n8nUserAuth isn't in use.
 *
 * Returns `{ authedUser }` on success, `{ responded: true }` after sending a
 * 302/401 on failure, or `{}` if the trigger doesn't require auth.
 */
export async function validateFormPageAuth(
	context: IWebhookFunctions,
	triggerAuthentication: string,
): Promise<{ authedUser?: IUser; responded?: boolean }> {
	if (triggerAuthentication !== 'n8nUserAuth') return {};
	const user = await authenticateFormUserOrRespond(context);
	return user ? { authedUser: user } : { responded: true };
}

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
		includeUserInOutput?: boolean;
	};
	const res = context.getResponseObject();
	const req = context.getRequestObject();

	// Check IP allowlist first (before bot detection and authentication)
	if (!isIpAllowed(options.ipWhitelist, req.ips, req.ip)) {
		res.writeHead(403);
		res.end('IP is not allowed to access this form!');
		return { noWebhookResponse: true };
	}

	if (options.ignoreBots && isbot(req.headers['user-agent'])) {
		res.setHeader('WWW-Authenticate', 'Basic realm="Enter credentials"');
		res.status(401).send();
		return { noWebhookResponse: true };
	}

	const authentication = context.getNodeParameter(authProperty, 'none') as string;
	let authedUser: IUser | undefined;
	if (node.typeVersion > 1) {
		if (authentication === 'n8nUserAuth') {
			const user = await authenticateFormUserOrRespond(context);
			if (!user) return { noWebhookResponse: true };
			authedUser = user;
		} else {
			try {
				await validateWebhookAuthentication(context, authProperty);
			} catch (error) {
				if (error instanceof WebhookAuthorizationError) {
					res.setHeader('WWW-Authenticate', 'Basic realm="Enter credentials"');
					res.status(401).send();
					return { noWebhookResponse: true };
				}
				throw error;
			}
		}
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
			if (authentication === 'n8nUserAuth' && authedUser) {
				// Cookies aren't sent on POST from the sandboxed form page
				// (null origin + SameSite=Lax). Embed an HMAC token so the
				// POST handler can re-authenticate the user.
				authToken = generateFormUserAuthToken(node, authedUser);
			} else {
				authToken = await generateFormPostBasicAuthToken(context, authProperty);
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

	const userForOutput = options.includeUserInOutput === false ? undefined : authedUser;
	const returnItem = await prepareFormReturnItem(
		context,
		formFields,
		mode,
		useWorkflowTimezone,
		userForOutput,
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
