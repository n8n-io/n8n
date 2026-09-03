import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { fetchMeetingByJoinUrl, readMeetingLocator } from './meetingLocator';
import { MEETING_HINT, meetingRequest, throwIfOnlineMeetingUnsupported } from './shared';
import { meetingRLC } from '../../descriptions';
import { buildTeamsPath, rewriteNotFound, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [meetingRLC];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['get'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0&tabs=http
	throwIfOnlineMeetingUnsupported.call(this);

	const { mode, value } = readMeetingLocator.call(this, i);
	if (mode === 'url') {
		return await fetchMeetingByJoinUrl.call(this, value);
	}

	const endpoint = buildTeamsPath.call(this, ['/v1.0/me/onlineMeetings/', { id: value }]);
	try {
		return await meetingRequest.call(this, 'GET', endpoint);
	} catch (error) {
		rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to get doesn't exist",
			MEETING_HINT,
		);
	}
}
