import { DateTime } from 'luxon';
import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	buildTeamsPath,
	getTeamsCredentialType,
	microsoftApiRequest,
	type MicrosoftGraphPathSegment,
	rewriteForbiddenUnderSp,
	SERVICE_PRINCIPAL_AUTH,
} from '../../transport';

const ACCESS_POLICY_MESSAGE =
	'Microsoft Graph refused the app-only meeting request. Grant the OnlineMeetings.ReadWrite.All application permission and a Teams application access policy for the organizer (New-CsApplicationAccessPolicy, then Grant-CsApplicationAccessPolicy).';

const ACCESS_POLICY_DETAIL =
	'OnlineMeetings.Read.All is enough for Get. The permission needs admin consent, and policy changes can take up to 30 minutes to apply.';

const ORGANIZER_HINT = "Check that the 'Organizer' parameter is a user in the tenant";

const GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

function isServicePrincipal(this: IExecuteFunctions): boolean {
	return getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH;
}

export const MEETING_HINT = "Check that the 'Meeting' parameter is correctly set";

export function meetingHint(this: IExecuteFunctions): string {
	return isServicePrincipal.call(this)
		? "Check that the 'Meeting' and 'Organizer' parameters are correctly set"
		: "Check that the 'Meeting' parameter is correctly set";
}

export function throwIfOnlineMeetingUnsupported(this: IExecuteFunctions): void {
	if (isServicePrincipal.call(this)) {
		throw new NodeOperationError(
			this.getNode(),
			'This online meeting operation is not available with the Service Principal credential yet',
			{ description: 'Use an OAuth2 credential for this operation.' },
		);
	}
}

// Graph addresses app-only meetings by the organizer's object ID, not the principal name.
async function resolveOrganizer(this: IExecuteFunctions, i: number): Promise<string> {
	const raw = this.getNodeParameter('organizerId', i, '', { extractValue: true });
	const organizer = typeof raw === 'string' ? raw.trim() : '';
	if (!organizer) {
		throw new NodeOperationError(
			this.getNode(),
			'The Organizer is required with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph has no signed-in user. Select the user whose meetings the node should act on.',
				itemIndex: i,
			},
		);
	}
	if (GUID.test(organizer)) return organizer;

	const endpoint = buildTeamsPath.call(this, ['/v1.0/users/', { id: organizer }]);
	let user: IDataObject;
	try {
		user = (await microsoftApiRequest.call(
			this,
			'GET',
			endpoint,
			{},
			{ $select: 'id' },
		)) as IDataObject;
	} catch (error) {
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Organizer not found', {
				description: ORGANIZER_HINT,
				itemIndex: i,
			});
		}
		throw rewriteForbiddenUnderSp.call(
			this,
			error,
			"Resolving the organizer needs the User.Read.All application permission. Enter the organizer's object ID instead.",
			'Grant User.Read.All to the app registration with admin consent to look up a user principal name.',
		);
	}
	if (typeof user.id !== 'string' || user.id === '') {
		throw new NodeOperationError(this.getNode(), 'Organizer not found', {
			description: ORGANIZER_HINT,
			itemIndex: i,
		});
	}
	return user.id;
}

export async function meetingsPath(
	this: IExecuteFunctions,
	i: number,
	segments: MicrosoftGraphPathSegment[] = [],
): Promise<string> {
	const root: MicrosoftGraphPathSegment[] = isServicePrincipal.call(this)
		? ['/v1.0/users/', { id: await resolveOrganizer.call(this, i) }, '/onlineMeetings']
		: ['/v1.0/me/onlineMeetings'];
	return buildTeamsPath.call(this, [...root, ...segments]);
}

export function optionalText(this: IExecuteFunctions, value: unknown, label: string) {
	const text = value instanceof DateTime || value instanceof Date ? value.toJSON() : value;
	if (typeof text === 'object' && text !== null) {
		throw new NodeOperationError(this.getNode(), `The ${label} must be text`, {
			description: `Check that the '${label}' expression resolves to text`,
		});
	}
	return String(text ?? '').trim();
}

export function requiredText(this: IExecuteFunctions, name: string, i: number, label: string) {
	const value = optionalText.call(this, this.getNodeParameter(name, i), label);
	if (value) return value;
	throw new NodeOperationError(this.getNode(), `The ${label} must not be empty`, {
		description: `Check that the '${label}' parameter is correctly set`,
	});
}

export function toGraphUtc(this: IExecuteFunctions, value: unknown, label: string) {
	const parsed =
		value instanceof DateTime
			? value
			: value instanceof Date
				? DateTime.fromJSDate(value)
				: DateTime.fromISO(String(value ?? ''), { zone: this.getTimezone() });
	if (!parsed.isValid) {
		throw new NodeOperationError(this.getNode(), `The ${label} is not a valid date`, {
			description: `Check that the '${label}' parameter is a valid date and time`,
		});
	}
	return parsed.toUTC().toISO({ suppressMilliseconds: true });
}

// A 404 on the meetings collection (POST, or the join-URL search) can only be the organizer.
function rewriteAppOnlyError(
	this: IExecuteFunctions,
	error: unknown,
	method: IHttpRequestMethods,
	endpoint: string,
): unknown {
	if (!isServicePrincipal.call(this) || !(error instanceof NodeApiError)) return error;
	if (error.httpCode === '404' && (method === 'POST' || endpoint.endsWith('/onlineMeetings'))) {
		return new NodeOperationError(this.getNode(), 'Organizer not found', {
			description: ORGANIZER_HINT,
		});
	}
	return rewriteForbiddenUnderSp.call(this, error, ACCESS_POLICY_MESSAGE, ACCESS_POLICY_DETAIL);
}

export async function meetingRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	try {
		return await microsoftApiRequest.call(this, method, endpoint, body, qs, undefined, {
			Prefer: 'include-unknown-enum-members',
		});
	} catch (error) {
		throw rewriteAppOnlyError.call(this, error, method, endpoint);
	}
}
