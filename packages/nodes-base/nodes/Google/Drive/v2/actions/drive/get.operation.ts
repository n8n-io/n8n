import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { sharedDriveRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...sharedDriveRLC,
		description: 'The shared drive to get',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Use Domain Admin Access',
				name: 'useDomainAdminAccess',
				type: 'boolean',
				default: false,
				description:
					'Whether to issue the request as a domain administrator; if set to true, then the requester will be granted access if they are an administrator of the domain to which the shared drive belongs',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['drive'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', i);

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const qs: IDataObject = {};

	Object.assign(qs, options);

	const response = await googleApiRequest.call(this, 'GET', `/drive/v3/drives/${driveId}`, {}, qs);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	returnData.push(...executionData);

	return returnData;
}
