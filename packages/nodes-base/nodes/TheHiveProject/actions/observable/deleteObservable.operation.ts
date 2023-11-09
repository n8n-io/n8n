import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { theHiveApiRequest } from '../../transport';
import { observableRLC } from '../../descriptions';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [observableRLC];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['deleteObservable'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const observableId = this.getNodeParameter('observableId', i, '', {
		extractValue: true,
	}) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/observable/${observableId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
