import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData, processJsonInput } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135298-createpackage.html" target="_blank" rel="noopener noreferrer">Create Package</a>',
		name: 'createPackageDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Package Name',
		name: 'packageName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the package',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Deployment Options (JSON)',
				name: 'deploymentOptions',
				type: 'json',
				default: '{}',
				description: 'A deployment options object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the package',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{ name: 'English (United States)', value: 'en_US' },
					{ name: 'French (France)', value: 'fr_FR' },
					{ name: 'German (Germany)', value: 'de_DE' },
					{ name: 'Italian (Italy)', value: 'it_IT' },
					{ name: 'Polish (Poland)', value: 'pl_PL' },
					{ name: 'Portuguese (Brazil)', value: 'pt_BR' },
					{ name: 'Romanian (Romania)', value: 'ro_RO' },
					{ name: 'Russian (Russia)', value: 'ru_RU' },
					{ name: 'Spanish (Spain)', value: 'es_ES' },
				],
				default: 'en_US',
				description: 'The language of the package',
			},
			{
				displayName: 'Modules (JSON)',
				name: 'modules',
				type: 'json',
				default: '{}',
				description: 'A modules to enable object',
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
					{ name: 'PHASR Standalone', value: 5 },
				],
				default: 0,
				description: 'The operation mode of the security agent',
			},
			{
				displayName: 'Roles (JSON)',
				name: 'roles',
				type: 'json',
				default: '{}',
				description: 'A roles to enable object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Scan Mode (JSON)',
				name: 'scanMode',
				type: 'json',
				default: '{}',
				description: 'A scan mode settings object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Settings (JSON)',
				name: 'settings',
				type: 'json',
				default: '{}',
				description: 'An additional package settings object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	},
];

const displayOptions = {
	show: { category: ['packages'], action: ['createPackage'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const packageName = this.getNodeParameter('packageName', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { packageName };

	if (options.description !== undefined && options.description !== '')
		params.description = options.description;
	if (options.language !== undefined && options.language !== '') params.language = options.language;
	if (options.modules !== undefined) {
		params.modules = processJsonInput(options.modules, 'Modules') as IDataObject;
	}
	if (options.scanMode !== undefined) {
		params.scanMode = processJsonInput(options.scanMode, 'Scan Mode') as IDataObject;
	}
	if (options.settings !== undefined) {
		params.settings = processJsonInput(options.settings, 'Settings') as IDataObject;
	}
	if (options.roles !== undefined) {
		params.roles = processJsonInput(options.roles, 'Roles') as IDataObject;
	}
	if (options.deploymentOptions !== undefined) {
		params.deploymentOptions = processJsonInput(
			options.deploymentOptions,
			'Deployment Options',
		) as IDataObject;
	}
	if (options.productType !== undefined) params.productType = options.productType;

	const responseData = await gravityZoneApiRequest.call(this, 'packages', 'createPackage', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
