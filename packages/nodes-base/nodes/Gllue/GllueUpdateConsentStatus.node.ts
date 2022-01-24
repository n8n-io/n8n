import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError,} from 'n8n-workflow';
import {generateTokenWithAESKey, getCurrentTimeStamp} from './helpers';

import {GllueCandidateService} from './services/gllue';


export class GllueUpdateConsentStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Update Consent Status',
		name: 'gllue_update_consent_status',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'Update Candidate Consent Status in Gllue',
		defaults: {
			name: 'Gllue Update Consent Status',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Candidate ID',
				name: 'candidateId',
				type: 'string',
				required: true,
				default: '',
				description: 'Candidate ID',
			},
			{
				displayName: 'Consent Status',
				name: 'consentStatus',
				type: 'options',
				required: true,
				default: 'sent',
				description: 'Consent status to set to the candidate',
				options: [
					{name: 'Sent', value: 'sent'},
					{name: 'Consented', value: 'consented'},
					{name: 'Initial', value: ' '},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const candidateId = this.getNodeParameter('candidateId', 0) as number;
		const status = this.getNodeParameter('consentStatus', 0) as string;
		let responseData: IDataObject = {status: false, data: candidateId};

		const credentials = await this.getCredentials('gllueApi') as IDataObject;
		const token = generateTokenWithAESKey(getCurrentTimeStamp(), credentials.apiUsername as string, credentials.apiAesKey as string);
		const candidateService = new GllueCandidateService(credentials.apiHost as string, token, this.helpers.request);
		const updateData = {id: candidateId, gllueext_consent_status: status};
		responseData = await candidateService.createOrUpdate(updateData);

		return [this.helpers.returnJsonArray(responseData)];
	}
}
