import { DateTime } from 'luxon';
import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { bucketRLC, groupRLC, memberRLC, planRLC } from '../../descriptions';
import {
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
	validateTaskBodyIdsUnderSp,
} from '../../transport';

// SP-shown By-ID copy of an RLC: app-only has no group-scoped list to depend on, so
// drop list mode + `loadOptionsDependsOn` and default to By-ID, mirroring task:getAll.
const byIdUnderSp = (rlc: INodeProperties): INodeProperties => ({
	...rlc,
	default: { mode: 'id', value: '' },
	modes: (rlc.modes ?? []).filter((mode) => mode.name === 'id'),
	typeOptions: undefined,
	displayOptions: {
		show: {
			'/authentication': [SERVICE_PRINCIPAL_AUTH],
		},
	},
});

const properties: INodeProperties[] = [
	// OAuth2 pickers: list mode with group/plan dependency — hidden under SP.
	{
		...groupRLC,
		displayOptions: { hide: { ...SP_HIDE } },
	},
	{
		...planRLC,
		displayOptions: { hide: { ...SP_HIDE } },
	},
	{
		...bucketRLC,
		displayOptions: { hide: { ...SP_HIDE } },
	},
	// SP pickers: By-ID plan + bucket (group is not needed once By-ID). `groupRLC` is
	// hidden under SP above.
	byIdUnderSp(planRLC),
	byIdUnderSp(bucketRLC),
	{
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. new task',
		description: 'Title of the task',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [
			{
				...memberRLC,
				displayName: 'Assigned To',
				name: 'assignedTo',
				description: 'Who the task should be assigned to',
				typeOptions: {
					loadOptionsDependsOn: ['groupId.value'],
				},
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'string',
				validateType: 'dateTime',
				default: '',
				description:
					'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Percent Complete',
				name: 'percentComplete',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				placeholder: 'e.g. 75',
				description:
					'Percentage of task completion. When set to 100, the task is considered completed.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/planner-post-tasks?view=graph-rest-1.0&tabs=http

	const planId = this.getNodeParameter('planId', i, '', { extractValue: true }) as string;
	const bucketId = this.getNodeParameter('bucketId', i, '', { extractValue: true }) as string;

	validateTaskBodyIdsUnderSp.call(this, { planId, bucketId });

	const title = this.getNodeParameter('title', i) as string;
	const options = this.getNodeParameter('options', i);

	const body: IDataObject = {
		planId,
		bucketId,
		title,
	};

	if (options.assignedTo) {
		options.assignedTo = this.getNodeParameter('options.assignedTo', i, '', {
			extractValue: true,
		}) as string;
	}

	if (options.dueDateTime && options.dueDateTime instanceof DateTime) {
		options.dueDateTime = options.dueDateTime.toISO();
	}

	Object.assign(body, options);

	if (body.assignedTo) {
		body.assignments = {
			[body.assignedTo as string]: {
				'@odata.type': 'microsoft.graph.plannerAssignment',
				orderHint: ' !',
			},
		};
		delete body.assignedTo;
	}

	return await microsoftApiRequest.call(this, 'POST', '/v1.0/planner/tasks', body);
}
