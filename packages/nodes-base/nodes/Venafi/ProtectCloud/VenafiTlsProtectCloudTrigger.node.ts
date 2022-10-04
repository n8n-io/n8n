import { IPollFunctions } from 'n8n-core';

import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import moment from 'moment';

import { venafiApiRequest } from './GenericFunctions';

export class VenafiTlsProtectCloudTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Cloud Trigger',
		name: 'venafiTlsProtectCloudTrigger',
		icon: 'file:../venafi.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Venafi events occure',
		defaults: {
			name: 'Venafi TLS Protect Cloud​',
			color: '#000000',
		},
		credentials: [
			{
				name: 'venafiTlsProtectCloudApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'trigger On',
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
		const event = this.getNodeParameter('event') as string;

		const now = moment().format();

		const startDate = webhookData.lastTimeChecked || now;
		const endDate = now;

		const { certificates: certificates } = await venafiApiRequest.call(
			this,
			'POST',
			`/outagedetection/v1/certificatesearch`,
			{
				expression: {
					operands: [
						{
							operator: 'AND',
							operands: [
								{
									field: 'validityEnd',
									operator: 'LTE',
									values: [endDate],
								},
								{
									field: 'validityEnd',
									operator: 'GTE',
									values: [startDate],
								},
							],
						},
					],
				},
				ordering: {
					orders: [
						{
							field: 'certificatInstanceModificationDate',
							direction: 'DESC',
						},
					],
				},
			},
			{},
		);

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(certificates) && certificates.length) {
			return [this.helpers.returnJsonArray(certificates)];
		}

		return null;
	}
}
