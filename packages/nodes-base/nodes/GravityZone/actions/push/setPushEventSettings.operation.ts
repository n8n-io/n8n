import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135319-setpusheventsettings.html" target="_blank" rel="noopener noreferrer">Set Push Event Settings</a>',
		name: 'setPushEventSettingsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		default: 1,
		options: [
			{ name: 'Disabled', value: 0 },
			{ name: 'Enabled', value: 1 },
		],
		description: 'Whether to enable or disable the push event service',
	},
	{
		displayName: 'Service Type',
		name: 'serviceType',
		type: 'options',
		required: true,
		default: 'jsonRPC',
		options: [
			{ name: 'Azure Sentinel', value: 'azuresentinel' },
			{ name: 'CEF', value: 'cef' },
			{ name: 'JSON-RPC', value: 'jsonRPC' },
			{ name: 'QRadar', value: 'qradar' },
			{ name: 'Splunk', value: 'splunk' },
		],
		description: 'Type of the web service',
	},
	{
		displayName: 'Service Settings (JSON)',
		name: 'serviceSettingsJson',
		type: 'json',
		required: true,
		default: '{}',
		description: 'A service settings object',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	{
		displayName: 'Subscribe to Event Types',
		name: 'subscribeToEventTypes',
		type: 'multiOptions',
		required: true,
		default: [],
		options: [
			{ name: 'Advanced Threat Control (ATC)', value: 'avc' },
			{ name: 'Antiexploit Event', value: 'antiexploit' },
			{ name: 'Antimalware', value: 'av' },
			{ name: 'Antiphishing', value: 'aph' },
			{ name: 'Cloud AD Integration', value: 'adcloud' },
			{ name: 'Data Protection', value: 'dp' },
			{ name: 'Endpoint Moved In', value: 'endpoint-moved-in' },
			{ name: 'Endpoint Moved Out', value: 'endpoint-moved-out' },
			{ name: 'Exchange Malware Detection', value: 'exchange-malware' },
			{ name: 'Exchange User Credentials', value: 'exchange-user-credentials' },
			{ name: 'Firewall', value: 'fw' },
			{ name: 'Hardware ID Change', value: 'hwid-change' },
			{ name: 'Install Agent', value: 'install' },
			{ name: 'Network Attack Defense Event', value: 'network-monitor' },
			{ name: 'New Extended Incident', value: 'new-extended-incident' },
			{ name: 'New Incident', value: 'new-incident' },
			{ name: 'Outdated Update Server', value: 'supa-update-status' },
			{ name: 'Overloaded Security Server', value: 'sva-load' },
			{ name: 'Product Modules Status', value: 'modules' },
			{ name: 'Product Registration', value: 'registration' },
			{ name: 'Ransomware Activity Detection', value: 'ransomware-mitigation' },
			{ name: 'Sandbox Analyzer Detection', value: 'network-sandboxing' },
			{
				name: 'Security Container Update Available',
				value: 'security-container-update-available',
			},
			{ name: 'Security Server Status', value: 'sva' },
			{ name: 'Task Status', value: 'task-status' },
			{ name: 'Troubleshooting Activity', value: 'troubleshooting-activity' },
			{ name: 'Uninstall Agent', value: 'uninstall' },
			{ name: 'User Control/Content Control', value: 'uc' },
		],
		description: 'List of event types to be sent to the web service',
	},
];

const displayOptions = {
	show: { category: ['push'], action: ['setPushEventSettings'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const status = this.getNodeParameter('status', i) as number;
	const serviceType = this.getNodeParameter('serviceType', i) as string;
	const serviceSettings = processJsonInput(
		this.getNodeParameter('serviceSettingsJson', i),
		'Service Settings',
	) as IDataObject;

	const selectedEventTypes = this.getNodeParameter('subscribeToEventTypes', i) as string[];
	const subscribeToEventTypes: IDataObject = {};
	for (const eventType of selectedEventTypes) {
		subscribeToEventTypes[eventType] = true;
	}

	const responseData = await gravityZoneApiRequest.call(this, 'push', 'setPushEventSettings', {
		status,
		serviceType,
		serviceSettings,
		subscribeToEventTypes,
	});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
