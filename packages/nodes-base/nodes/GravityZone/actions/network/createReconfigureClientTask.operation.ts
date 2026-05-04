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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128497-createreconfigureclienttask.html" target="_blank" rel="noopener noreferrer">Create Reconfigure Client Task</a>',
		name: 'createReconfigureClientTaskDocsNotice',
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
			'A comma-separated list of endpoint or container IDs to reconfigure (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Scheduler (JSON)',
				name: 'scheduler',
				type: 'json',
				default: '{}',
				description: 'A scheduler object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Modules (JSON)',
				name: 'modules',
				type: 'json',
				default: '{}',
				description: 'A modules object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Scan Mode (JSON)',
				name: 'scanMode',
				type: 'json',
				default: '{}',
				description: 'A scan mode object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Roles (JSON)',
				name: 'roles',
				type: 'json',
				default: '{}',
				description: 'A roles object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Product Type',
				name: 'productType',
				type: 'options',
				options: [
					{ name: 'Detection and Prevention', value: 0 },
					{ name: 'EDR (Report Only)', value: 3 },
				],
				default: 0,
				description: 'Operation mode of the security agent',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['createReconfigureClientTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const targetIdsRaw = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { targetIds };

	if (options.scheduler !== undefined) {
		const scheduler = processJsonInput(options.scheduler, 'Scheduler') as IDataObject;
		if (Object.keys(scheduler).length > 0) params.scheduler = scheduler;
	}
	if (options.modules !== undefined) {
		const modules = processJsonInput(options.modules, 'Modules') as IDataObject;
		if (Object.keys(modules).length > 0) params.modules = modules;
	}
	if (options.scanMode !== undefined) {
		const scanMode = processJsonInput(options.scanMode, 'Scan Mode') as IDataObject;
		if (Object.keys(scanMode).length > 0) params.scanMode = scanMode;
	}
	if (options.roles !== undefined) {
		const roles = processJsonInput(options.roles, 'Roles') as IDataObject;
		if (Object.keys(roles).length > 0) params.roles = roles;
	}
	if (options.productType !== undefined) params.productType = options.productType;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'createReconfigureClientTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
