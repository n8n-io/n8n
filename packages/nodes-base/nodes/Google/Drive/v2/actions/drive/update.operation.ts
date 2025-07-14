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
		description: 'The shared drive to update',
	},
	{
		displayName: 'Update Fields',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['drive'],
			},
		},
		options: [
			{
				displayName: 'Color RGB',
				name: 'colorRgb',
				type: 'color',
				default: '',
				description: 'The color of this shared drive as an RGB hex string',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The updated name of the shared drive',
			},
			{
				displayName: 'Restrictions',
				name: 'restrictions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Admin Managed Restrictions',
						name: 'adminManagedRestrictions',
						type: 'boolean',
						default: false,
						description:
							'Whether the options to copy, print, or download files inside this shared drive, should be disabled for readers and commenters. When this restriction is set to true, it will override the similarly named field to true for any file inside this shared drive.',
					},
					{
						displayName: 'Copy Requires Writer Permission',
						name: 'copyRequiresWriterPermission',
						type: 'boolean',
						default: false,
						description:
							'Whether the options to copy, print, or download files inside this shared drive, should be disabled for readers and commenters. When this restriction is set to true, it will override the similarly named field to true for any file inside this shared drive.',
					},
					{
						displayName: 'Domain Users Only',
						name: 'domainUsersOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether access to this shared drive and items inside this shared drive is restricted to users of the domain to which this shared drive belongs. This restriction may be overridden by other sharing policies controlled outside of this shared drive.',
					},
					{
						displayName: 'Drive Members Only',
						name: 'driveMembersOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether access to items inside this shared drive is restricted to its members',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['drive'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', i, {});

	const driveId = this.getNodeParameter('driveId', i, undefined, {
		extractValue: true,
	}) as string;

	const body: IDataObject = {};

	Object.assign(body, options);

	const response = await googleApiRequest.call(this, 'PATCH', `/drive/v3/drives/${driveId}`, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(response as IDataObject[]),
		{ itemData: { item: i } },
	);

	returnData.push(...executionData);

	return returnData;
}
