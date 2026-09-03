import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { fetchMeetingByJoinUrl, readMeetingLocator } from './meetingLocator';
import { throwIfOnlineMeetingUnsupported } from './sharedGuard';
import { meetingRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';

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

	// Built outside the try so an invalid id surfaces as its own validation
	// error instead of being replaced by the not-found message below
	const endpoint = buildTeamsPath.call(this, ['/v1.0/me/onlineMeetings/', { id: value }]);

	try {
		return await microsoftApiRequest.call(this, 'GET', endpoint);
	} catch (error) {
		// Only a 404 means the meeting is gone; other statuses (403 from a missing
		// OnlineMeetings.ReadWrite consent, 429, 5xx) must surface as the real error.
		if (error?.httpCode !== '404') throw error;
		throw new NodeOperationError(
			this.getNode(),
			"The meeting you are trying to get doesn't exist",
			{
				description: "Check that the 'Meeting' parameter is correctly set",
			},
		);
	}
}
