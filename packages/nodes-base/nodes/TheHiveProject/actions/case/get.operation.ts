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
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	const qs: IDataObject = {};

	const body = {
		query: [
			{
				_name: 'getCase',
				idOrName: caseId,
			},
			{
				_name: 'page',
				from: 0,
				to: 10,
				extraData: ['attachmentCount'],
			},
		],
	};

	qs.name = `get-case-${caseId}`;

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
