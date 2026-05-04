import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140032-assignmaintenancewindows.html" target="_blank" rel="noopener noreferrer">Assign Maintenance Windows</a>',
		name: 'assignMaintenanceWindowsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the policy to assign the maintenance windows to',
	},
	{
		displayName: 'Maintenance Window IDs',
		name: 'maintenanceWindowIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of maintenance window IDs to assign to the policy (e.g. "id1, id2, id3")',
	},
];

const displayOptions = {
	show: { category: ['maintenance_windows'], action: ['assignMaintenanceWindows'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const policyId = this.getNodeParameter('policyId', i) as string;

	const maintenanceWindowIdsRaw = this.getNodeParameter('maintenanceWindowIds', i) as string;
	const maintenanceWindowIds = maintenanceWindowIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = {
		policyId,
		maintenanceWindowIds,
	};

	const responseData = await gravityZoneApiRequest.call(
		this,
		'maintenanceWindows',
		'assignMaintenanceWindows',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
