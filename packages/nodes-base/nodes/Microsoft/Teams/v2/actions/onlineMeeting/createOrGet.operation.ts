import {
	type IDataObject,
	type INodeProperties,
	type IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	meetingRequest,
	optionalText,
	requiredText,
	throwIfOnlineMeetingUnsupported,
	toGraphUtc,
} from './shared';
import { SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'External ID',
		name: 'externalId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. order-4711-kickoff',
		description:
			'Your own ID for the meeting. Running the node again with the same ID returns the existing meeting instead of creating another one.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'End Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description:
					'The date and time when the meeting ends. Must be later than Start Time, which must also be set. If left out, the meeting lasts one hour.',
			},
			{
				displayName: 'Start Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the meeting starts. Defaults to now.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'e.g. Quarterly Sync',
				description: 'The subject of the meeting',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['createOrGet'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-createorget?view=graph-rest-1.0&tabs=http
	throwIfOnlineMeetingUnsupported.call(this);

	const externalId = requiredText.call(this, 'externalId', i, 'External ID');
	const options = this.getNodeParameter('options', i);
	if (options.endDateTime && !options.startDateTime) {
		throw new NodeOperationError(this.getNode(), 'End Time requires a Start Time', {
			description:
				"Microsoft Graph rejects an End Time without a Start Time. Set 'Start Time' as well, or remove 'End Time' to use the default length",
		});
	}

	const body: IDataObject = { externalId };
	const subject = optionalText.call(this, options.subject, 'Subject');
	if (subject) {
		body.subject = subject;
	}
	if (options.startDateTime) {
		body.startDateTime = toGraphUtc.call(this, options.startDateTime, 'Start Time');
	}
	if (options.endDateTime) {
		body.endDateTime = toGraphUtc.call(this, options.endDateTime, 'End Time');
	}

	return await meetingRequest.call(this, 'POST', '/v1.0/me/onlineMeetings/createOrGet', body);
}
