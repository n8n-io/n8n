import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';

import { returnAllAndLimit } from '../common.description';
import { And, Id, Parent, prepareRangeQuery } from '../../helpers/utils';
import type { BodyWithQuery } from '../../helpers/interfaces';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the task',
	},
	...returnAllAndLimit,
];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const credentials = await this.getCredentials('theHiveApi');

	const returnAll = this.getNodeParameter('returnAll', i);

	const version = credentials.apiVersion;

	const taskId = this.getNodeParameter('taskId', i) as string;

	let endpoint;

	let method;

	let body: IDataObject = {};

	const qs: IDataObject = {};

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	if (version === 'v1') {
		endpoint = '/v1/query';

		method = 'POST';

		body = {
			query: [
				{
					_name: 'getTask',
					idOrName: taskId,
				},
				{
					_name: 'logs',
				},
			],
		};

		if (limit !== undefined) {
			prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
		}

		qs.name = 'case-task-logs';
	} else {
		method = 'POST';

		endpoint = '/case/task/log/_search';

		if (limit !== undefined) {
			qs.range = `0-${limit}`;
		}

		body.query = And(Parent('task', Id(taskId)));
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
