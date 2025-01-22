import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { observableRLC, responderOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [{ ...observableRLC, name: 'id' }, responderOptions];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['executeResponder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const observableId = this.getNodeParameter('id', i);
	const responderId = this.getNodeParameter('responder', i) as string;
	let body: IDataObject;
	let response;
	responseData = [];
	body = {
		responderId,
		objectId: observableId,
		objectType: 'case_artifact',
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
	const qs: IDataObject = {};
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
