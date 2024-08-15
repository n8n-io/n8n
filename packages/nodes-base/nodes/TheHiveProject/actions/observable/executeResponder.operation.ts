import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { observableRLC, responderOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

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

	const observableId = this.getNodeParameter('id', i, '', {
		extractValue: true,
	}) as string;
	const responderId = this.getNodeParameter('responder', i) as string;
	let body: IDataObject;

	responseData = [];
	body = {
		responderId,
		objectId: observableId,
		objectType: 'case_artifact',
	};
	const response = await theHiveApiRequest.call(
		this,
		'POST',
		'/connector/cortex/action' as string,
		body,
	);
	body = {};
	const qs: IDataObject = {};
	qs.name = 'log-actions';
	let observableAction;
	do {
		observableAction = await theHiveApiRequest.call(
			this,
			'GET',
			`/connector/cortex/action/case_artifact/${observableId}`,
			body,
			qs,
		);

		observableAction = observableAction.find(
			(action: any) => action._createdAt == response._createdAt,
		);
	} while (observableAction.status === 'Waiting' || observableAction.status === 'InProgress');

	responseData = observableAction;

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
