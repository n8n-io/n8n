import { type IDataObject, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { odataStringLiteral } from '@utils/microsoft/odata';

import { meetingRequest } from './shared';

const isLocator = (value: unknown): value is { mode: unknown; value: unknown } =>
	typeof value === 'object' && value !== null && 'mode' in value && 'value' in value;

const asText = (value: unknown) =>
	typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

export function readMeetingLocator(
	this: IExecuteFunctions,
	i: number,
): { mode: string; value: string } {
	const raw = this.getNodeParameter('meetingId', i);
	const locator = isLocator(raw) ? raw : { mode: 'id', value: raw };
	return { mode: String(locator.mode), value: asText(locator.value) };
}

export async function fetchMeetingByJoinUrl(
	this: IExecuteFunctions,
	joinWebUrl: string,
): Promise<IDataObject> {
	if (!joinWebUrl) {
		throw new NodeOperationError(this.getNode(), 'The meeting join URL is empty', {
			description: "Enter the join URL in the 'Meeting' parameter and try again",
		});
	}
	const response = await meetingRequest.call(
		this,
		'GET',
		'/v1.0/me/onlineMeetings',
		{},
		{
			$filter: `JoinWebUrl eq ${odataStringLiteral(joinWebUrl)}`,
		},
	);
	const meeting = response?.value?.[0];
	if (!meeting) {
		throw new NodeOperationError(this.getNode(), 'No meeting was found for the provided join URL', {
			description: "Check that the 'Meeting' parameter is correctly set",
		});
	}
	return meeting;
}

export async function resolveMeetingId(this: IExecuteFunctions, i: number): Promise<string> {
	const { mode, value } = readMeetingLocator.call(this, i);
	if (mode !== 'url') return value;
	const meeting = await fetchMeetingByJoinUrl.call(this, value);
	return asText(meeting.id);
}
