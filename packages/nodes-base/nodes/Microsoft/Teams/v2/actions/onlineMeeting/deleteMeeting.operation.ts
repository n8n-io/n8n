import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { resolveMeetingId } from './meetingLocator';
import { meetingHint, meetingRequest, meetingsPath } from './shared';
import { meetingRLC } from '../../descriptions';
import { rewriteNotFound } from '../../transport';

const properties: INodeProperties[] = [meetingRLC];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['deleteMeeting'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-delete?view=graph-rest-1.0&tabs=http
	const meetingId = await resolveMeetingId.call(this, i);
	const endpoint = await meetingsPath.call(this, i, ['/', { id: meetingId }]);

	try {
		await meetingRequest.call(this, 'DELETE', endpoint);
		return { success: true };
	} catch (error) {
		throw rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to delete doesn't exist",
			meetingHint.call(this),
		);
	}
}
