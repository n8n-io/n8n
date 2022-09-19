import {
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import moment from 'moment';

import {
	venafiApiRequest,
} from './GenericFunctions';

export class VenafiTppTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Datacenter Trigger',
		name: 'venafiTppTrigger',
		icon: 'file:venafi.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when Toggl events occure',
		defaults: {
			name: 'Venafi TLS Protect Datacenter​',
			color: '#000000',
		},
		credentials: [
			{
				name: 'venafiTppApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Certificate Expired',
						value: 'certificateExpired',
					},
					{
						name: 'Policy Changed',
						value: 'policyChanged',
					},
				],
				required: true,
				default: 'certificateExpired',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {

		const webhookData = this.getWorkflowStaticData('node');

		const event = this.getNodeParameter('event') as string;

		//TODO
		// Handle Policy Changed event

		const qs: IDataObject = {};

		const now = moment().format();

		qs.ValidToGreater = webhookData.lastTimeChecked || now;

		qs.ValidToLess = now;

		const { Certificates: certificates } = await venafiApiRequest.call(this, 'GET', '/vedsdk/certificates', {}, qs);

		webhookData.lastTimeChecked = qs.ValidToLess;

		if (Array.isArray(certificates) && certificates.length !== 0) {
			return [this.helpers.returnJsonArray(certificates)];
		}

		return null;
	}

}
