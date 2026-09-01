import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { resolveMeetingId } from './meetingLocator';
import { MEETING_HINT, meetingRequest, throwIfOnlineMeetingUnsupported } from './shared';
import { meetingRLC } from '../../descriptions';
import { buildTeamsPath, rewriteNotFound, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [meetingRLC];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['deleteMeeting'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-delete?view=graph-rest-1.0&tabs=http
	throwIfOnlineMeetingUnsupported.call(this);

	const meetingId = await resolveMeetingId.call(this, i);
	const endpoint = buildTeamsPath.call(this, ['/v1.0/me/onlineMeetings/', { id: meetingId }]);

	try {
		await meetingRequest.call(this, 'DELETE', endpoint);
		return { success: true };
	} catch (error) {
		rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to delete doesn't exist",
			MEETING_HINT,
		);
	}
}
