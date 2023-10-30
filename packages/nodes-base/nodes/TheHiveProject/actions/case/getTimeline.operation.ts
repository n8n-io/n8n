import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { theHiveApiRequest } from '../../transport';
import { caseRLC } from '../../descriptions';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [caseRLC];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['getTimeline'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	responseData = await theHiveApiRequest.call(this, 'GET', `/v1/case/${caseId}/timeline`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
