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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-317161-updateincidentnote.html" target="_blank" rel="noopener noreferrer">Update Incident Note</a>',
		name: 'updateIncidentNoteDocsNotice',
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
		description: 'The ID of the target incident',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		required: true,
		default: '',
		description:
			'The text to be included in the note. If the incident already has a note, it will be overwritten.',
	},
];

const displayOptions = { show: { category: ['incidents'], action: ['updateIncidentNote'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const type = this.getNodeParameter('type', i) as string;
	const incidentId = this.getNodeParameter('incidentId', i) as string;
	const note = this.getNodeParameter('note', i) as string;

	const params: IDataObject = { type, incidentId, note };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'updateIncidentNote',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
