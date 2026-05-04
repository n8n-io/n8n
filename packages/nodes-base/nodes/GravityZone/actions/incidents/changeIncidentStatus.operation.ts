import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-317162-changeincidentstatus.html" target="_blank" rel="noopener noreferrer">Change Incident Status</a>',
		name: 'changeIncidentStatusDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'incidents',
		options: [
			{ name: 'Incidents', value: 'incidents' },
			{ name: 'Extended Incidents', value: 'extendedIncidents' },
		],
		description: 'The type of the target incident',
	},
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the incident to update',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		default: 1,
		options: [
			{ name: 'Open', value: 1 },
			{ name: 'Investigating', value: 2 },
			{ name: 'Closed', value: 3 },
			{ name: 'False Positive', value: 4 },
		],
		description: 'The new status of the incident',
	},
];

const displayOptions = { show: { category: ['incidents'], action: ['changeIncidentStatus'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const type = this.getNodeParameter('type', i) as string;
	const incidentId = this.getNodeParameter('incidentId', i) as string;
	const status = this.getNodeParameter('status', i) as number;

	const params: IDataObject = { type, incidentId, status };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'changeIncidentStatus',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
