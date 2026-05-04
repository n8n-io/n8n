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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128496-createscantaskbymac.html" target="_blank" rel="noopener noreferrer">Create Scan Task by MAC</a>',
		name: 'createScanTaskByMacDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'MAC Addresses',
		name: 'macAddresses',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of MAC addresses of the endpoints to scan (e.g. "00:11:22:33:44:55, 00:11:22:33:44:56")',
	},
	{
		displayName: 'Scan Type',
		name: 'type',
		type: 'options',
		required: true,
		options: [
			{ name: 'Quick Scan', value: 1 },
			{ name: 'Full Scan', value: 2 },
			{ name: 'Memory Scan', value: 3 },
			{ name: 'Custom Scan', value: 4 },
		],
		default: 1,
		description: 'The type of scan to run',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the scan task. Auto-generated if not provided.',
			},
			{
				displayName: 'Custom Scan Settings (JSON)',
				name: 'customScanSettings',
				type: 'json',
				default: '{}',
				description: 'A custom scan settings object. Required when the scan type is "Custom Scan".',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Return Task ID',
				name: 'returnTaskId',
				type: 'boolean',
				default: false,
				description: 'Whether to return the ID of the newly created task instead of a boolean',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['createScanTaskByMac'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const type = this.getNodeParameter('type', i) as number;
	const options = this.getNodeParameter('options', i, {});

	const macAddressesRaw = this.getNodeParameter('macAddresses', i) as string;
	const macAddresses = macAddressesRaw
		.split(',')
		.map((m) => m.trim())
		.filter(Boolean);

	const params: IDataObject = { macAddresses, type };

	if (options.name) params.name = options.name;
	if (options.customScanSettings !== undefined) {
		const customScanSettings = processJsonInput(
			options.customScanSettings,
			'Custom Scan Settings',
		) as IDataObject;
		if (Object.keys(customScanSettings).length > 0) {
			params.customScanSettings = customScanSettings;
		}
	}
	if (options.returnTaskId !== undefined) params.returnTaskId = options.returnTaskId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'createScanTaskByMac',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
