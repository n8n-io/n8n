import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { Request, Response } from 'express';
import { rm } from 'fs/promises';
import isbot from 'isbot';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import { getHtmlSandboxCSP, InstanceSettings, isFormHtmlSandboxingDisabled } from 'n8n-core';
import type {
	CredentialCheckStatus,
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
	UnexpectedError,
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

export const getNodeReference = (nodeName: string) => `$(${JSON.stringify(nodeName)})`;

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

export function isFormOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2 === 'true';
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
	shellInner,
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
	shellInner?: boolean;
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
		// Only set inside the hosting shell, so the plain form's render data is unchanged.
		shellInner: shellInner || undefined,
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
		if (field.fieldType === 'text' || field.fieldType === 'email') {
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

	if (context.getNodeParameter('options.showHeaders', false)) {
		returnItem.json.headers = context.getHeaderData();
	}

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
	shellInner,
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
	shellInner?: boolean;
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
			const triggerRef = getNodeReference(trigger.name);
			const triggerQueryParameters = context.evaluateExpression(
				`{{ ${triggerRef}.first().json.formQueryParameters }}`,
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
		shellInner,
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

function trimTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Carries the OAuth2 access token across the single same-site redirect from the
// provider callback to the clean form URL, so `code`/`state` never reach the
// sandboxed form page. The token is otherwise already embedded in the form HTML
// (the page sends it back as `x-auth-token` on POST), so this is not a new exposure.
const FORM_OAUTH_COOKIE_NAME = 'n8n-form-oauth';

function formOAuthCookieOptions(req: Request, resourceUrl: string) {
	// Derive `secure` from the request scheme (honouring x-forwarded-proto, as
	// buildAbsoluteFormUrl does) rather than config, so the cookie is actually sent
	// back on the follow-up GET over http in dev while staying Secure over https.
	const forwardedProto = req.headers['x-forwarded-proto'];
	const proto = (typeof forwardedProto === 'string' ? forwardedProto.trim() : '') || req.protocol;
	return {
		httpOnly: true,
		sameSite: 'lax' as const, // must be Lax: sent on our own top-level 302 → GET
		secure: proto === 'https',
		path: new URL(resourceUrl).pathname, // scope the bearer token to this form
	};
}

function setFormOAuthToken(res: Response, req: Request, resourceUrl: string, token: string): void {
	res.cookie(FORM_OAUTH_COOKIE_NAME, token, {
		...formOAuthCookieOptions(req, resourceUrl),
		maxAge: 60_000, // one redirect hop; short by design
	});
}

function readFormOAuthToken(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-form-oauth=([^;]+)/);
	return match ? decodeURIComponent(match[1].trim()) : null;
}

function clearFormOAuthToken(res: Response, req: Request, resourceUrl: string): void {
	res.clearCookie(FORM_OAUTH_COOKIE_NAME, formOAuthCookieOptions(req, resourceUrl));
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
async function authenticateFormUserOrRespond(
	context: IWebhookFunctions,
	oauth2Enabled: boolean = false,
): Promise<{ user: IUser; token: string | null } | null> {
	const req = context.getRequestObject();

	if (oauth2Enabled) {
		const res = context.getResponseObject();
		const url = context.getWebhookResourceUrl('default');
		if (!url) {
			throw new UnexpectedError('Webhook URL not found for the node');
		}
		const resourceUrl = trimTrailingSlash(url);
		if (req.method === 'GET') {
			const { code, state } = req.query;

			if (typeof req.query.error === 'string') {
				// The provider returned an error (e.g. the user denied consent). Restarting the
				// flow here would loop straight back to the same denial, so stop and report.
				context.logger.warn('Form OAuth2 authorization was denied or failed', {
					error: req.query.error,
					error_description: req.query.error_description,
				});
				res.status(403).send('Access denied');
				res.end();
				return null;
			}

			// handle OAuth2 callback from the provider (code + state query params)
			if (typeof code === 'string' && typeof state === 'string') {
				try {
					const authorizationResult = await context.completeN8nOAuth2Flow(code, state);
					if (authorizationResult.valid) {
						// TODO: exchange the OAuth2 token to a specficly scoped token.
						// Don't render the form here: the callback URL still carries `code`/`state`,
						// which must never reach the sandboxed form page. Stash the token in a
						// one-hop cookie and redirect to the clean resource URL — the follow-up GET
						// (below) picks up the cookie and renders the form.
						setFormOAuthToken(res, req, resourceUrl, authorizationResult.token);
						// Re-append the original query params (dropped by the first provider
						// redirect, stashed against this flow's `state` on the fresh GET) so the
						// follow-up GET restores field prefill and `formQueryParameters`.
						const preservedQuery = authorizationResult.metadata?.query;
						res.writeHead(302, {
							Location: preservedQuery ? `${resourceUrl}?${preservedQuery}` : resourceUrl,
						});
						res.end();
						return null;
					}
					// We fall through to the redirect below to restart the OAuth2 flow if the callback is invalid.
					context.logger.warn('Form OAuth2 flow failed, restarting', {
						reason: authorizationResult.reason,
					});
				} catch (error) {
					// Ignore errors and fall through to the redirect below
					context.logger.warn('Form OAuth2 flow failed, restarting', {
						error,
					});
				}
			} else {
				// Not a provider callback. If we just completed the flow, the token rides in a
				// one-hop cookie set on the redirect above. Consume it once and render.
				const cookieToken = readFormOAuthToken(req);
				if (cookieToken) {
					clearFormOAuthToken(res, req, resourceUrl);
					const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
					if (validation.valid) {
						return { user: validation.user, token: cookieToken };
					}
					// Stale/invalid cookie — fall through to restart the OAuth2 flow.
				}
			}

			// Stash the original query params against this flow's OAuth `state` so we can
			// restore them after the bounce. Only on a genuine fresh GET — a callback
			// fall-through (invalid completion) carries `code`/`state`, which we must not
			// preserve as the form's query, and whose original query was consumed with the
			// now-invalid state, so a restart begins clean.
			const isCallback = typeof code === 'string' && typeof state === 'string';
			const originalQuery = isCallback ? '' : req.originalUrl.split('?').slice(1).join('?');

			try {
				// start authentication flow by redirecting to the OAuth2 provider's authorization URL
				const authorizationUrl = await context.beginN8nOAuth2Flow(
					resourceUrl,
					originalQuery ? { query: originalQuery } : undefined,
				);
				res.writeHead(302, {
					Location: authorizationUrl,
				});
				res.end();
			} catch (error) {
				// Can't build the authorization URL — nothing to redirect to, so abort.
				context.logger.warn('Form OAuth2 flow failed', {
					error,
				});
				throw new UnexpectedError('Form OAuth2 flow failed');
			}
			return null;
		} else {
			// For POST requests, the OAuth2 flow is not applicable. We fall through to the cookie and token checks below.
			const formToken = req.headers['x-auth-token'];
			if (typeof formToken === 'string' && formToken) {
				const validation = await context.validateN8nOAuth2Token(formToken, resourceUrl);
				if (validation.valid) {
					await context.establishTriggerIdentity(formToken, resourceUrl); // seeds the run
					return {
						user: validation.user,
						token: null,
					};
				}
			}
			res.status(401).send();
			return null;
		}
	}

	// Parse the raw Cookie header rather than `req.cookies` because the webhook
	// path may bypass cookie-parser middleware in some deployments.
	const cookieMatch = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-auth=([^;]+)/);
	if (cookieMatch) {
		try {
			return {
				user: await context.validateCookieAuth(cookieMatch[1].trim()),
				token: null,
			};
		} catch {}
	}

	const formToken = req.headers['x-auth-token'];
	if (typeof formToken === 'string' && formToken) {
		const user = verifyFormUserAuthToken(formToken, context.getNode());
		if (user) return { user, token: null };
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
	const { user } = (await authenticateFormUserOrRespond(context, false)) ?? {};
	return user ? { authedUser: user } : { responded: true };
}

/**
 * Render the trusted hosting shell: an n8n-controlled page on the real origin
 * that shows the author's form inside a sandboxed (null-origin) iframe with a
 * credential-connect panel beside it. The form's submit stays disabled while any
 * required credential is missing; enforcement is server-side on POST regardless.
 *
 * The shell holds the connect panel — with the real per-credential authorize
 * links — OUTSIDE the author-scriptable iframe DOM (the security win over
 * connecting inside the form). It carries a live session, so it refuses framing.
 */
function renderFormShell({
	res,
	req,
	formTitle,
	resourceUrl,
	credentials,
	submitterEmail,
}: {
	res: Response;
	req: Request;
	formTitle: string;
	resourceUrl: string;
	credentials: CredentialCheckStatus[];
	submitterEmail?: string;
}) {
	// The iframe loads the same form via a real URL (so the form's relative POST
	// works exactly as it does top-level today) flagged as the inner render.
	const inner = new URL(buildAbsoluteFormUrl(req));
	inner.searchParams.set('n8nShellInner', '1');

	const initialOf = (name: string) => (name.trim().charAt(0) || '?').toUpperCase();
	const rows = credentials.map((c) => ({
		id: c.credentialId,
		name: c.credentialName,
		type: c.credentialType,
		status: c.status,
		connected: c.status === 'configured',
		initial: initialOf(c.credentialName),
		authorizationUrl: c.authorizationUrl,
		revokeUrl: c.revokeUrl,
		resolverId: c.resolverId,
		// The connected identity shown as "Connected as …". For the system (n8n)
		// resolver this is the submitter themselves; surfacing the exact OAuth
		// provider account (when it differs) is a backend-enrichment follow-up.
		account: c.status === 'configured' ? submitterEmail : undefined,
		// `usedBy` (owning node) comes from the backend-enrichment follow-up.
		usedBy: undefined as string | undefined,
	}));

	const total = rows.length;
	const connectedCount = rows.filter((r) => r.connected).length;
	// Design: 1–2 credentials render inline; 3+ collapse into a strip + dialog.
	const useDialog = total >= 3;

	res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
	res.render('form-shell', {
		formTitle,
		iframeSrc: `${inner.pathname}${inner.search}`,
		resourceUrl,
		credentials: rows,
		total,
		connectedCount,
		useDialog,
		submitterEmail,
		iconStack: rows.slice(0, 3).map((r) => r.initial),
		moreCount: total > 3 ? total - 3 : 0,
	});
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
	let oAuth2Token: string | undefined;
	if (node.typeVersion > 1) {
		if (authentication === 'n8nUserAuth') {
			const { user, token } =
				(await authenticateFormUserOrRespond(context, isFormOAuth2Enabled())) ?? {};
			if (!user) return { noWebhookResponse: true };
			authedUser = user;
			oAuth2Token = token ?? undefined;
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

		// The inner render is the form loaded inside the hosting-shell iframe. Honor the
		// flag only for iframe navigations (per Sec-Fetch-Dest, absent on older browsers)
		// so a hand-typed URL can't skip the connect UI; the POST gate enforces regardless.
		const secFetchDest = req.headers?.['sec-fetch-dest'];
		const shellInner =
			req.query.n8nShellInner === '1' && (secFetchDest === undefined || secFetchDest === 'iframe');

		// Connect-before-submit: when the workflow needs the submitter's own
		// (private) credentials, establish their identity from the OAuth2 token and
		// check readiness server-side. If anything is still missing — and we're not
		// already rendering the inner iframe — wrap the form in the hosting shell
		// (form + connect panel, submit disabled). No-op unless OAuth2 form auth and
		// the dynamic-credentials module are both active.
		if (
			authentication === 'n8nUserAuth' &&
			authedUser &&
			isFormOAuth2Enabled() &&
			oAuth2Token &&
			!shellInner
		) {
			// Must name the endpoint actually being served (test vs production) — the
			// OAuth2 token is bound to that resource, same as in the auth path above.
			const resourceUrl = trimTrailingSlash(context.getWebhookResourceUrl('default') ?? '');
			if (resourceUrl) {
				await context.establishTriggerIdentity(oAuth2Token, resourceUrl);
				const credentialStatus = await context.checkTriggerCredentialStatus();
				if (credentialStatus && !credentialStatus.readyToExecute) {
					// Hand the OAuth2 token to the same-site iframe GET via the one-hop
					// cookie the OAuth2 flow already uses, so the inner form authenticates
					// without re-running the provider redirect inside the frame.
					setFormOAuthToken(res, req, resourceUrl, oAuth2Token);
					// Pass ALL required credentials (connected + missing) so the card shows
					// each one's state and the "{n} of {m} connected" progress.
					renderFormShell({
						res,
						req,
						formTitle,
						resourceUrl,
						credentials: credentialStatus.credentials,
						submitterEmail: authedUser?.email,
					});
					return { noWebhookResponse: true };
				}
			}
		}

		let authToken: string | undefined;
		if (node.typeVersion > 1) {
			if (authentication === 'n8nUserAuth' && authedUser) {
				if (!isFormOAuth2Enabled()) {
					// Cookies aren't sent on POST from the sandboxed form page
					// (null origin + SameSite=Lax). Embed an HMAC token so the
					// POST handler can re-authenticate the user.
					authToken = generateFormUserAuthToken(node, authedUser);
				} else {
					authToken = oAuth2Token;
				}
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
			shellInner,
		});

		return {
			noWebhookResponse: true,
		};
	}

	let { useWorkflowTimezone } = options;

	if (useWorkflowTimezone === undefined && node.typeVersion > 2) {
		useWorkflowTimezone = true;
	}

	// Fail-closed submit gate: the shell panel / disabled button is UX only — this
	// server-side re-check is the real guarantee (author script in the iframe can
	// re-enable the button). Identity was established during POST authentication;
	// reject if any required credential is still missing (also covers a credential
	// revoked while the form was open — TOCTOU).
	const submitGate = await context.checkTriggerCredentialStatus();
	if (submitGate && !submitGate.readyToExecute) {
		res.status(409).json({ message: 'Required credentials are not connected yet' });
		return { noWebhookResponse: true };
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

type ExpressionResolutionContext = Pick<IWebhookFunctions, 'evaluateExpression'>;

export function resolveRawData(context: ExpressionResolutionContext, rawData: string) {
	if (!rawData) return rawData;

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
		const getJsonOutput = () =>
			context.getNodeParameter(options.fieldsParameterName, '', {
				rawExpressions: true,
			}) as string;

		fields = parseJsonFormFields(context, getJsonOutput, options.mode);
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

type ParseJsonFormFieldsCtx = Pick<IWebhookFunctions, 'evaluateExpression' | 'getNode'>;

/**
 * @throws {NodeOperationError} if the JSON is invalid or cannot be parsed into form fields
 */
export function parseJsonFormFields(
	context: ParseJsonFormFieldsCtx,
	getJsonOutput: () => string,
	mode?: 'test' | 'production',
) {
	try {
		const jsonOutput = getJsonOutput();

		return tryToParseJsonToFormFields(resolveRawData(context, jsonOutput));
	} catch (e) {
		const error = ensureError(e);
		throw new NodeOperationError(context.getNode(), error.message, {
			description: error.message,
			type: mode === 'test' ? 'manual-form-test' : undefined,
		});
	}
}
