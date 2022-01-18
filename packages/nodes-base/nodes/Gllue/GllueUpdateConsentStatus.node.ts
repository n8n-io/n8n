import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';

const services = require('./services');


export class GllueUpdateConsentStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue UpdateConsent Status Node',
		name: 'gllue_update_consent_status',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'Update Candidate Consent Status in Gllue',
		defaults: {
			name: 'Gllue',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},
			{
				name: 'HasuraApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Candidate ID',
				name: 'candidate_id',
				type: 'string',
				required: true,
				default:'',
				description:'Contract ID',
			},
			{
				displayName: 'Consent Status',
				name: 'consent_status',
				type: 'string',
				required: true,
				default:'',
				description:'Consent status to set to the candidate',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const candidateId = this.getNodeParameter('candidate_id', 0) as string;
		const status = this.getNodeParameter('consent_status', 0) as string;

		const candidateData = await services.getCandidateById(candidateId);
		if (services.shouldUpdateConsentStatus(candidateData.consent_status, status)){
			const updateData : IDataObject = {consent_status: status};
			responseData = await services.updateCandidateById(candidateId, updateData);
		}

		return [this.helpers.returnJsonArray({})];
	}
}
