import { IPollFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import moment from 'moment';

import { venafiApiRequest } from './GenericFunctions';

export class VenafiTlsProtectDatacenterTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Datacenter Trigger',
		name: 'venafiTlsProtectDatacenterTrigger',
		icon: 'file:../venafi.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Venafi events occur',
		defaults: {
			name: 'Venafi TLS Protect Datacenter​',
		},
		credentials: [
			{
				name: 'venafiTlsProtectDatacenterApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'Certificate Expired',
						value: 'certificateExpired',
					},
				],
				required: true,
				default: 'certificateExpired',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');

		const qs: IDataObject = {};

		const now = moment().format();

		qs.ValidToGreater = webhookData.lastTimeChecked ?? now;

		qs.ValidToLess = now;

		const { Certificates: certificates } = await venafiApiRequest.call(
			this,
			'GET',
			'/vedsdk/certificates',
			{},
			qs,
		);

		webhookData.lastTimeChecked = qs.ValidToLess;

		if (Array.isArray(certificates) && certificates.length !== 0) {
			return [this.helpers.returnJsonArray(certificates)];
		}

		return null;
	}
}
