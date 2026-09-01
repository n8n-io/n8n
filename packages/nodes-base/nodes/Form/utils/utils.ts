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
	CredentialCheckResult,
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
	buildCredentialConnectionsRequiredResponse,
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
	/** Workflow the token was minted for. */
	wfid?: string;
	/** Execution the token was minted for, when one was already running. */
	eid?: string;
};

/** Binding claims tying a form auth token to the run that minted it. */
export type FormUserAuthTokenBinding = {
	workflowId?: string;
	executionId?: string;
};

function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === 'string';
}

function isFormUserAuthClaims(value: unknown): value is FormUserAuthClaims {
	if (typeof value !== 'object' || value === null) return false;
	const c = value as Record<string, unknown>;
	return (
		typeof c.sub === 'string' &&
		typeof c.email === 'string' &&
		typeof c.firstName === 'string' &&
		typeof c.lastName === 'string' &&
		typeof c.nid === 'string' &&
		typeof c.wid === 'string' &&
		isOptionalString(c.wfid) &&
		isOptionalString(c.eid)
	);
}

function userFromFormUserAuthClaims(claims: FormUserAuthClaims): IUser {
	return {
		id: claims.sub,
		email: claims.email,
		firstName: claims.firstName,
		lastName: claims.lastName,
	};
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
	hasAuthenticatedSubmitter,
	hostNavigationPath,
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
	hasAuthenticatedSubmitter?: boolean;
	hostNavigationPath?: string;
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
		// Only set for forms that can be gated, so the rest never ship the client handling.
		hasAuthenticatedSubmitter: hasAuthenticatedSubmitter || undefined,
		hostNavigationPath: hostNavigationPath || undefined,
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
	hasAuthenticatedSubmitter,
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
	hasAuthenticatedSubmitter?: boolean;
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

	// A follow-up page the shell navigated its frame to is the shell's inner render
	// just like the flagged page-1 request — it must render the readiness listener
	// and leave the submit button's enabled state to the shell's connect panel.
	const inShell = isHostedInFormShell(context.getRequestObject(), shellInner);

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
		shellInner: inShell,
		hasAuthenticatedSubmitter,
		hostNavigationPath: getHostNavigationPath(context, inShell),
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

/**
 * True when this render is the hosting shell's frame — either the shell's own
 * inner render (flagged in the URL) or a follow-up page the shell navigated its
 * frame to. Only then may the form hand its page navigations to the host.
 *
 * A follow-up page is recognised by the `n8nShellHosted` flag the shell appends
 * to every URL it moves its frame to. Being told outright, rather than inferred
 * from `Sec-Fetch-*`, keeps delegation working where those headers never arrive
 * (a proxy that strips them) and keeps a same-origin frame that is *not* the
 * shell from being treated as one.
 *
 * Where those headers do arrive they still have to agree — a same-origin frame —
 * so a top-level document, or a form embedded on someone else's site, keeps
 * navigating itself even with the flag in its URL.
 *
 * Nothing rests on the flag being unguessable: a frame that sets it on itself
 * gains only the ability to ask its own parent to move it, and the shell accepts
 * that ask for this form's own pages alone.
 */
function isHostedInFormShell(req: Request, shellInner?: boolean): boolean {
	if (shellInner) return true;
	const secFetchDest = req.headers?.['sec-fetch-dest'];
	const secFetchSite = req.headers?.['sec-fetch-site'];
	return (
		req.query?.n8nShellHosted === '1' &&
		(secFetchDest === undefined || secFetchDest === 'iframe') &&
		(secFetchSite === undefined || secFetchSite === 'same-origin')
	);
}

/**
 * The path prefix this render may ask the hosting shell to navigate to, or
 * `undefined` when the render isn't in the shell's frame and so keeps navigating
 * itself.
 */
export function getHostNavigationPath(
	context: IWebhookFunctions,
	shellInner?: boolean,
): string | undefined {
	if (!isHostedInFormShell(context.getRequestObject(), shellInner)) return undefined;
	return getFormWaitingBasePath(context) ?? undefined;
}

export const isFormConnected = (nodes: NodeTypeAndVersion[]) => {
	return nodes.some(
		(n) =>
			n.type === FORM_NODE_TYPE || (n.type === WAIT_NODE_TYPE && n.parameters?.resume === 'form'),
	);
};

/**
 * Submit-time credential readiness gate, shared by the trigger's POST and the
 * Form node's POST. Answers 428 with the missing-credential list when the
 * submitter's required accounts aren't all connected, 503 when the check itself
 * fails. Returns true when a response was sent and the submission must not
 * proceed. A no-op (`undefined` readiness) outside the dynamic-credentials flow.
 */
export async function respondIfCredentialsNotReady(
	context: IWebhookFunctions,
	res: Response,
): Promise<boolean> {
	let readiness: CredentialCheckResult | undefined;
	try {
		readiness = await context.checkTriggerCredentialStatus();
	} catch (error) {
		// Fail closed. Throwing here is swallowed by the webhook layer, which then
		// enqueues the execution anyway — exactly the doomed run we're preventing.
		context.logger.error('Form submit credential readiness check failed', { error });
		res.status(503).json({ status: 'credential_readiness_check_failed' });
		return true;
	}

	if (readiness && !readiness.readyToExecute) {
		// 428, matching the webhook trigger's gate (webhook-helpers.ts) so all
		// trigger paths answer an unconnected credential the same way.
		res.status(428).json(buildCredentialConnectionsRequiredResponse(readiness));
		return true;
	}

	return false;
}

/**
 * Generate a form auth token for n8nUserAuth. The token embeds the user info
 * in a signed JWT so the POST handler can authenticate the submission without
 * relying on the `n8n-auth` cookie (cookies aren't sent on fetch requests from
 * the sandboxed form page because the document has a null origin and the
 * cookie is `SameSite=Lax`).
 *
 * The `nid` and `wid` claims bind the token to a specific node + webhook,
 * preventing replay across forms. `wfid`/`eid` additionally bind it to the
 * workflow and — for tokens minted while a run is in progress — that run, which
 * is what lets the same token be accepted as the form page auth cookie. Signed
 * with HS256 using the instance's hmac signature secret.
 */
export function generateFormUserAuthToken(
	node: INode,
	user: IUser,
	binding: FormUserAuthTokenBinding,
): string {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	const payload: FormUserAuthClaims = {
		sub: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		nid: node.id,
		wid: node.webhookId ?? '',
		...(binding.workflowId ? { wfid: binding.workflowId } : {}),
		...(binding.executionId ? { eid: binding.executionId } : {}),
	};
	return jwt.sign(payload, secret, {
		algorithm: 'HS256',
		expiresIn: FORM_USER_AUTH_TOKEN_TTL_SECONDS,
	});
}

/**
 * Verify a form auth token issued by `generateFormUserAuthToken` and presented
 * in the `x-auth-token` header. Returns the encoded user on success or `null` on
 * any failure (bad format, expired, wrong signature, wrong node, wrong
 * execution). The caller decides how to surface the failure.
 *
 * A token carrying an `eid` is only accepted for that execution. Tokens minted
 * before a run existed carry none and stay valid for the node they name.
 */
export function verifyFormUserAuthToken(
	token: string,
	node: INode,
	executionId?: string,
): IUser | null {
	const claims = decodeFormUserAuthClaims(token);
	if (!claims) return null;
	if (claims.nid !== node.id) return null;
	if (claims.wid !== (node.webhookId ?? '')) return null;
	if (claims.eid !== undefined && claims.eid !== executionId) return null;
	return userFromFormUserAuthClaims(claims);
}

function decodeFormUserAuthClaims(token: string): FormUserAuthClaims | null {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	let claims: unknown;
	try {
		claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
	} catch {
		return null;
	}
	return isFormUserAuthClaims(claims) ? claims : null;
}

/**
 * Verify a form auth token presented as the form page auth cookie. Unlike the
 * `x-auth-token` variant this is not bound to a single node: the cookie rides
 * along a navigation to whichever node serves the next page of the same form,
 * so it is bound to the workflow (`wfid`) and, once a run exists, to that run
 * (`eid`). Tokens predating those claims are not accepted here.
 */
function verifyFormPageAuthCookie(
	token: string,
	workflowId: string | undefined,
	executionId: string | undefined,
): IUser | null {
	const claims = decodeFormUserAuthClaims(token);
	if (!claims) return null;
	if (!claims.wfid || !workflowId || claims.wfid !== workflowId) return null;
	if (claims.eid !== undefined && claims.eid !== executionId) return null;
	return userFromFormUserAuthClaims(claims);
}

function trimTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Carries the OAuth2 access token across the single same-site redirect from the
// provider callback to the clean form URL, so `code`/`state` never reach the
// sandboxed form page. The token is otherwise already embedded in the form HTML
// (the page sends it back as `x-auth-token` on POST), so this is not a new exposure.
const FORM_OAUTH_COOKIE_NAME = 'n8n-form-oauth';

/**
 * Derive `secure` from the request scheme (honouring x-forwarded-proto, as
 * buildAbsoluteFormUrl does) rather than config, so form cookies are actually
 * sent back over http in dev while staying Secure over https.
 */
function isSecureRequest(req: Request): boolean {
	const forwardedProto = req.headers['x-forwarded-proto'];
	const proto = (typeof forwardedProto === 'string' ? forwardedProto.trim() : '') || req.protocol;
	return proto === 'https';
}

function formOAuthCookieOptions(req: Request, resourceUrl: string) {
	return {
		httpOnly: true,
		sameSite: 'lax' as const, // must be Lax: sent on our own top-level 302 → GET
		secure: isSecureRequest(req),
		path: new URL(resourceUrl).pathname, // scope the bearer token to this form
	};
}

function setFormOAuthToken(res: Response, req: Request, resourceUrl: string, token: string): void {
	res.cookie(FORM_OAUTH_COOKIE_NAME, token, {
		...formOAuthCookieOptions(req, resourceUrl),
		maxAge: 60_000, // one redirect hop; short by design
	});
}

/**
 * Decode a cookie value, or `null` when it isn't valid percent-encoding. A value
 * we can't read is treated as no cookie at all — the caller's other checks still
 * get their turn — rather than throwing out of the request.
 */
function decodeCookieValue(value: string): string | null {
	try {
		return decodeURIComponent(value.trim());
	} catch {
		return null;
	}
}

function readFormOAuthToken(req: Request): string | null {
	const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-form-oauth=([^;]+)/);
	return match ? decodeCookieValue(match[1]) : null;
}

function clearFormOAuthToken(res: Response, req: Request, resourceUrl: string): void {
	res.clearCookie(FORM_OAUTH_COOKIE_NAME, formOAuthCookieOptions(req, resourceUrl));
}

// Carries the submitter's identity to the follow-up pages of a multi-page form.
// Those pages are reached by a navigation, which can present neither the
// `x-auth-token` header nor — from a sandboxed, opaque-origin form document —
// the `n8n-auth` session cookie.
//
// The name carries the token's binding, so forms open in other tabs don't
// overwrite each other's cookie: pages of a run use the run's id, and the
// trigger — rendered before any run exists — uses the workflow's. Duplicated in
// `packages/cli/src/constants.ts` (prefix only); keep both sides in step.
const FORM_AUTH_COOKIE_PREFIX = 'n8n-form-auth';

function getFormAuthCookieName(binding: FormUserAuthTokenBinding): string {
	return binding.executionId
		? `${FORM_AUTH_COOKIE_PREFIX}-ex-${binding.executionId}`
		: `${FORM_AUTH_COOKIE_PREFIX}-wf-${binding.workflowId ?? ''}`;
}

/**
 * Value of the request's cookie with exactly this name, or `null`. Parses the
 * raw header (the webhook path may bypass cookie-parser) by splitting rather
 * than a regex, since the name embeds a workflow or execution id.
 */
function readCookieValue(req: Request, name: string): string | null {
	for (const part of (req.headers.cookie ?? '').split(';')) {
		const separator = part.indexOf('=');
		if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
		return decodeCookieValue(part.slice(separator + 1));
	}
	return null;
}

/**
 * Path the form-waiting endpoint is served under, or `null` when it can't be
 * derived. It is configurable and the instance may sit behind a path prefix, so
 * derive it rather than assume it: `$execution.resumeFormUrl` is
 * `<formWaitingBaseUrl>/<executionId>`, and dropping the last segment leaves the
 * base path.
 */
function getFormWaitingBasePath(context: IWebhookFunctions): string | null {
	try {
		const resumeFormUrl = context.evaluateExpression('{{ $execution.resumeFormUrl }}') as string;
		const { pathname } = new URL(resumeFormUrl);
		return pathname.slice(0, pathname.lastIndexOf('/')) || null;
	} catch {
		return null;
	}
}

/**
 * Hand the follow-up pages of a multi-page form their own auth token, scoped to
 * the form-waiting path. Re-set on every page render, so a long form's later
 * pages get a token that is still within its TTL.
 */
export function setFormAuthCookie(
	context: IWebhookFunctions,
	token: string,
	binding: FormUserAuthTokenBinding,
): void {
	const req = context.getRequestObject();
	context.getResponseObject().cookie(getFormAuthCookieName(binding), token, {
		httpOnly: true,
		// Lax, and only ever sent on a navigation the shell (or the top-level page)
		// initiates from the real origin.
		sameSite: 'lax',
		secure: isSecureRequest(req),
		// Nothing narrower is derivable when the base path is unknown; the cookie is
		// httpOnly and expires with the token either way.
		path: getFormWaitingBasePath(context) ?? '/',
		maxAge: FORM_USER_AUTH_TOKEN_TTL_SECONDS * 1000,
	});
}

/**
 * Resolve the submitter from the form page auth cookie, or `null` when it is
 * absent or doesn't verify for the workflow/execution being served.
 */
function readFormAuthCookieUser(context: IWebhookFunctions): IUser | null {
	const req = context.getRequestObject();
	const workflowId = context.getWorkflow().id;
	const executionId = context.getExecutionId();
	if (!workflowId) return null;
	// The run's own cookie first; the trigger's workflow-scoped one covers the
	// first hop into the run, made before the run existed.
	const candidateNames = [
		getFormAuthCookieName({ workflowId, executionId }),
		getFormAuthCookieName({ workflowId }),
	];
	for (const name of candidateNames) {
		const token = readCookieValue(req, name);
		if (!token) continue;
		const user = verifyFormPageAuthCookie(token, workflowId, executionId);
		if (user) return user;
	}
	return null;
}

/**
 * True when the request also carries a session that belongs to someone other
 * than the form cookie's user — a sign-out and sign-in as a different person in
 * the same browser. The live session wins: the form cookie is dropped and the
 * request re-authenticates through the normal path. An unusable session cookie
 * names nobody, so it leaves the form cookie alone.
 */
async function isSessionForDifferentUser(
	context: IWebhookFunctions,
	formCookieUser: IUser,
): Promise<boolean> {
	const req = context.getRequestObject();
	const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)n8n-auth=([^;]+)/);
	if (!match) return false;
	try {
		const sessionUser = await context.validateCookieAuth(match[1].trim());
		return sessionUser.id !== formCookieUser.id;
	} catch {
		return false;
	}
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
	runOAuth2Flow: boolean = false,
): Promise<{ user: IUser; token: string | null } | null> {
	const req = context.getRequestObject();

	if (runOAuth2Flow) {
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
		const user = verifyFormUserAuthToken(formToken, context.getNode(), context.getExecutionId());
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
 * A page is reached by navigating to it, which cannot carry an `x-auth-token`
 * header, so a GET is authenticated from the form page auth cookie first. Every
 * other request — and any GET whose cookie is missing, doesn't verify, or names
 * someone other than the session on the same request — falls through to the
 * session cookie / `x-auth-token` checks, unchanged.
 *
 * Form pages never take the OAuth2 branch: the OAuth2 token's audience is the
 * trigger's URL, which a page's own resource URL is not.
 *
 * Returns `{ authedUser }` on success, `{ responded: true }` after sending a
 * 302/401 on failure, or `{}` if the trigger doesn't require auth.
 */
export async function validateFormPageAuth(
	context: IWebhookFunctions,
	triggerAuthentication: string,
): Promise<{ authedUser?: IUser; responded?: boolean }> {
	if (triggerAuthentication !== 'n8nUserAuth') return {};

	if (context.getRequestObject().method === 'GET') {
		const cookieUser = readFormAuthCookieUser(context);
		if (cookieUser && !(await isSessionForDifferentUser(context, cookieUser))) {
			return { authedUser: cookieUser };
		}
	}

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
	formWaitingPath,
}: {
	res: Response;
	req: Request;
	formTitle: string;
	resourceUrl: string;
	credentials: CredentialCheckStatus[];
	submitterEmail?: string;
	formWaitingPath?: string;
}) {
	// The iframe loads the same form via a real URL (so the form's relative POST
	// works exactly as it does top-level today) flagged as the inner render.
	const inner = new URL(buildAbsoluteFormUrl(req));
	inner.searchParams.set('n8nShellInner', '1');

	res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
	res.render('form-shell', {
		formTitle,
		iframeSrc: `${inner.pathname}${inner.search}`,
		resourceUrl,
		// The only paths the shell will move its frame to on the form's request.
		formWaitingPath,
		...buildFormShellViewModel(credentials, submitterEmail),
	});
}

export type FormShellCredentialRow = {
	id: string;
	name: string;
	type: string;
	status: CredentialCheckStatus['status'];
	connected: boolean;
	/** Letter tile, used whenever the provider icon doesn't resolve. */
	initial: string;
	iconUrl?: string;
	authorizationUrl?: string;
	revokeUrl?: string;
	resolverId?: string;
	account?: string;
	usedBy?: string;
};

export type FormShellViewModel = {
	credentials: FormShellCredentialRow[];
	total: number;
	connectedCount: number;
	useDialog: boolean;
	allConnected: boolean;
	summaryText: string;
	footerText: string;
	submitterEmail?: string;
};

/** Submitter-facing copy talks about accounts, never credentials — and never `account(s)`. */
const accountsLabel = (count: number) => (count === 1 ? 'account' : 'accounts');

/**
 * The one-line state of the connect panel for two or more accounts. Mirrored by
 * the shell's client-side `summaryText()`, which re-renders it in place as rows
 * connect (a reload would bounce the submitter back through consent).
 */
export function formShellSummaryText(total: number, connectedCount: number): string {
	const remaining = total - connectedCount;
	if (remaining <= 0) return `All ${total} accounts connected · ready to submit`;
	if (connectedCount === 0) return `${total} accounts needed to submit this form`;
	return `${remaining} more ${accountsLabel(remaining)} needed to submit this form`;
}

/**
 * View model for `form-shell.handlebars`. Two shapes: a single required account
 * gets its own row with a Connect button that opens the OAuth popup directly;
 * two or more collapse behind a summary line plus the "Connect your accounts"
 * dialog.
 */
export function buildFormShellViewModel(
	credentials: CredentialCheckStatus[],
	submitterEmail?: string,
): FormShellViewModel {
	const initialOf = (name: string) => (name.trim().charAt(0) || '?').toUpperCase();
	const rows: FormShellCredentialRow[] = credentials.map((c) => ({
		id: c.credentialId,
		name: c.credentialName,
		type: c.credentialType,
		status: c.status,
		connected: c.status === 'configured',
		initial: initialOf(c.credentialName),
		iconUrl: c.iconUrl,
		authorizationUrl: c.authorizationUrl,
		revokeUrl: c.revokeUrl,
		resolverId: c.resolverId,
		// The connected identity shown as "Connected as …". For the system (n8n)
		// resolver this is the submitter themselves; surfacing the exact OAuth
		// provider account (when it differs) is a backend-enrichment follow-up.
		account: c.status === 'configured' ? submitterEmail : undefined,
		// `usedBy` (owning node) comes from the backend-enrichment follow-up.
		usedBy: undefined,
	}));

	const total = rows.length;
	const connectedCount = rows.filter((r) => r.connected).length;

	return {
		credentials: rows,
		total,
		connectedCount,
		// Design: one account connects directly from its row; two or more collapse.
		useDialog: total >= 2,
		allConnected: total > 0 && connectedCount === total,
		summaryText: formShellSummaryText(total, connectedCount),
		footerText: `${connectedCount} of ${total} ${accountsLabel(total)} connected`,
		submitterEmail,
	};
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
			const { user, token } = (await authenticateFormUserOrRespond(context, true)) ?? {};
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

		// A multi-page form hops to `/form-waiting/<execution>` by navigating, which
		// carries neither the `x-auth-token` header nor — from the hosting shell's
		// opaque-origin frame — the `n8n-auth` session cookie. Give the follow-up pages
		// their own path-scoped token so they can authenticate the same submitter.
		if (authentication === 'n8nUserAuth' && authedUser && hasNextPage) {
			const binding = { workflowId: context.getWorkflow().id };
			setFormAuthCookie(context, generateFormUserAuthToken(node, authedUser, binding), binding);
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
		if (authentication === 'n8nUserAuth' && authedUser && oAuth2Token && !shellInner) {
			// Must name the endpoint actually being served (test vs production) — the
			// OAuth2 token is bound to that resource, same as in the auth path above.
			const resourceUrl = trimTrailingSlash(context.getWebhookResourceUrl('default') ?? '');
			if (resourceUrl) {
				await context.establishTriggerIdentity(oAuth2Token, resourceUrl);
				const credentialStatus = await context.checkTriggerCredentialStatus();
				// Gate on "needs end-user accounts", NOT on readiness: a fully connected
				// submitter must keep the panel — which accounts the form uses, which
				// identity, and Disconnect — otherwise it would vanish on the reload right
				// after connecting. Forms with no end-user accounts fall through to the
				// plain render below, unchanged.
				if (credentialStatus?.credentials.length) {
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
						formWaitingPath: getFormWaitingBasePath(context) ?? undefined,
					});
					return { noWebhookResponse: true };
				}
			}
		}

		let authToken: string | undefined;
		if (node.typeVersion > 1) {
			if (authentication === 'n8nUserAuth' && authedUser) {
				// Cookies aren't sent on POST from the sandboxed form page (null origin +
				// SameSite=Lax), so the POST re-authenticates off this token.
				authToken = oAuth2Token;
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
			hasAuthenticatedSubmitter: authentication === 'n8nUserAuth',
		});

		return {
			noWebhookResponse: true,
		};
	}

	// Submit-time readiness gate, and the only real enforcement: the hosting shell's
	// disabled submit button is UX, re-enablable by author script inside the form's
	// iframe. It also works off the state at render time, so a required credential can
	// be revoked — or the page simply left open — between render and submit. Re-check
	// here, after identity establishment and before the execution is enqueued, so a
	// stale page can't spawn a run that dies at credential resolution. The Form node
	// runs the same gate on its own POST (Form.node.ts); the Wait node shares
	// `formWebhook`, so scope this call site to the trigger.
	if (node.type === FORM_TRIGGER_NODE_TYPE) {
		if (await respondIfCredentialsNotReady(context, res)) {
			return { noWebhookResponse: true };
		}
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
