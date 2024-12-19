import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { logRLC, responderOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [{ ...logRLC, name: 'id' }, responderOptions];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['executeResponder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const logId = this.getNodeParameter('id', i);
	const responderId = this.getNodeParameter('responder', i) as string;
	let body: IDataObject;
	let response;
	const qs: IDataObject = {};
	body = {
		responderId,
		objectId: logId,
		objectType: 'case_task_log',
	};
	response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action' as string, body);
	body = {
		query: [
			{
				_name: 'listAction',
			},
			{
				_name: 'filter',
				_and: [
					{
						_field: 'cortexId',
						_value: response.cortexId,
					},
					{
						_field: 'objectId',
						_value: response.objectId,
					},
					{
						_field: 'startDate',
						_value: response.startDate,
					},
				],
			},
		],
	};
	qs.name = 'log-actions';
	do {
		response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
	} while (response.status === 'Waiting' || response.status === 'InProgress');

	responseData = response;

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
