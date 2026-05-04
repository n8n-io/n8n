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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135321-sendtestpushevent.html" target="_blank" rel="noopener noreferrer">Send Test Push Event</a>',
		name: 'sendTestPushEventDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'options',
		required: true,
		default: 'av',
		options: [
			{ name: 'Advanced Threat Control (ATC)', value: 'avc' },
			{ name: 'Antiexploit Event', value: 'antiexploit' },
			{ name: 'Antimalware', value: 'av' },
			{ name: 'Antiphishing', value: 'aph' },
			{ name: 'Cloud AD Integration', value: 'adcloud' },
			{ name: 'Data Protection', value: 'dp' },
			{ name: 'Device Control', value: 'device-control' },
			{ name: 'Endpoint Moved In', value: 'endpoint-moved-in' },
			{ name: 'Endpoint Moved Out', value: 'endpoint-moved-out' },
			{ name: 'Exchange Malware Detection', value: 'exchange-malware' },
			{ name: 'Exchange User Credentials', value: 'exchange-user-credentials' },
			{ name: 'Firewall', value: 'fw' },
			{ name: 'Hardware ID Change', value: 'hwid-change' },
			{ name: 'Hyper Detect Event', value: 'hd' },
			{ name: 'Install Agent', value: 'install' },
			{ name: 'Network Attack Defense Event', value: 'network-monitor' },
			{ name: 'New Incident', value: 'new-incident' },
			{ name: 'Outdated Update Server', value: 'supa-update-status' },
			{ name: 'Overloaded Security Server', value: 'sva-load' },
			{ name: 'Partner Change', value: 'partner-changed' },
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
		description: 'The type of event to send a test for',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Data (JSON)',
				name: 'dataJson',
				type: 'json',
				default: '{}',
				description: 'An object to overwrite data in the returned test event example',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	},
];

const displayOptions = {
	show: { category: ['push'], action: ['sendTestPushEvent'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const eventType = this.getNodeParameter('eventType', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { eventType };

	if (options.dataJson !== undefined) {
		params.data = processJsonInput(options.dataJson, 'Data') as IDataObject;
	}

	const responseData = await gravityZoneApiRequest.call(this, 'push', 'sendTestPushEvent', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
