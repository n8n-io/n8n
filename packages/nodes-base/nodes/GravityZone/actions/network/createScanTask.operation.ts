import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128495-createscantask.html" target="_blank" rel="noopener noreferrer">Create Scan Task</a>',
		name: 'createScanTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Target IDs',
		name: 'targetIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of target endpoint or container IDs (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Scan Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 1,
		options: [
			{ name: 'Quick Scan', value: 1 },
			{ name: 'Full Scan', value: 2 },
			{ name: 'Memory Scan', value: 3 },
			{ name: 'Custom Scan', value: 4 },
		],
		description: 'Type of scan to perform',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Task Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name for the scan task. Auto-generated if not provided.',
			},
			{
				displayName: 'Custom Scan Settings (JSON)',
				name: 'customScanSettings',
				type: 'json',
				default: '{}',
				description: 'A custom scan settings object. Required when scan type is "Custom Scan".',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Return All Task IDs',
				name: 'returnAllTaskIds',
				type: 'boolean',
				default: false,
				description: 'Whether to return all task IDs created as a result of the request',
			},
		],
	},
];

const displayOptions = { show: { category: ['network'], action: ['createScanTask'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const type = this.getNodeParameter('type', i) as number;
	const options = this.getNodeParameter('options', i, {});

	const targetIdsStr = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { targetIds, type };

	if (options.name !== undefined && (options.name as string) !== '') params.name = options.name;
	if (options.customScanSettings !== undefined) {
		const customScanSettings = processJsonInput(
			options.customScanSettings,
			'Custom Scan Settings',
		) as IDataObject;
		if (Object.keys(customScanSettings).length > 0) {
			params.customScanSettings = customScanSettings;
		}
	}
	if (options.returnAllTaskIds !== undefined) params.returnAllTaskIds = options.returnAllTaskIds;

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'createScanTask', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
