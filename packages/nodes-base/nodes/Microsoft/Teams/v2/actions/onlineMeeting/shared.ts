import { DateTime } from 'luxon';
import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getTeamsCredentialType,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../../transport';

export const MEETING_HINT = "Check that the 'Meeting' parameter is correctly set";

export const SERVICE_PRINCIPAL_UNSUPPORTED =
	'Online meeting operations run on the signed-in user. Use an OAuth2 credential instead.';

export function throwIfOnlineMeetingUnsupported(this: IExecuteFunctions): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Online meetings are not available with the Service Principal credential',
			{ description: SERVICE_PRINCIPAL_UNSUPPORTED },
		);
	}
}

export function requiredText(this: IExecuteFunctions, name: string, i: number, label: string) {
	const value = String(this.getNodeParameter(name, i) ?? '').trim();
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

export async function meetingRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	return await microsoftApiRequest.call(this, method, endpoint, body, qs, undefined, {
		Prefer: 'include-unknown-enum-members',
	});
}
