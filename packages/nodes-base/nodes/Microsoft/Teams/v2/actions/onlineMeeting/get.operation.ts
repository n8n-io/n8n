import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { fetchMeetingByJoinUrl, readMeetingLocator } from './meetingLocator';
import { meetingHint, meetingRequest, meetingsPath } from './shared';
import { meetingRLC } from '../../descriptions';
import { rewriteNotFound } from '../../transport';

const properties: INodeProperties[] = [meetingRLC];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0&tabs=http
	const { mode, value } = readMeetingLocator.call(this, i);
	if (mode === 'url') {
		return await fetchMeetingByJoinUrl.call(this, i, value);
	}

	const endpoint = await meetingsPath.call(this, i, ['/', { id: value }]);
	try {
		return await meetingRequest.call(this, 'GET', endpoint);
	} catch (error) {
		throw rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to get doesn't exist",
			meetingHint.call(this),
		);
	}
}
