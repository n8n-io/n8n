import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError,} from 'n8n-workflow';
import { shouldUpdateConsentStatus } from './GenericFunctions';
import { generateTokenWithAESKey, getCurrentTimeStamp } from './helpers';
import { GllueCandidateService } from './services';

const services = require('./services');


export class GllueUpdateConsentStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Update Consent Status',
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

		const candidateId = this.getNodeParameter('candidate_id', 0) as number;
		const status = this.getNodeParameter('consent_status', 0) as string;
		let responseData : IDataObject = {status: false, data: candidateId};

		const credentials = await this.getCredentials('gllueApi') as IDataObject;
		const token = generateTokenWithAESKey(getCurrentTimeStamp(), credentials.apiUsername as string, credentials.apiAesKey as string);
		const candidateService = new GllueCandidateService(credentials.apiHost as string, token, this.helpers.request);

		const candidateData = await candidateService.getCandidateById(candidateId, 'id,name,englishName,gllueext_consent_status');
		if (candidateData == undefined){
			throw new NodeOperationError(this.getNode(), `No candidate found [ID=${candidateId}]`);
		}
		if (shouldUpdateConsentStatus(candidateData.gllueext_consent_status as string, status)){
			const updateData = {id: candidateId, gllueext_consent_status: status};
			responseData = await candidateService.createOrUpdate(updateData);
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
