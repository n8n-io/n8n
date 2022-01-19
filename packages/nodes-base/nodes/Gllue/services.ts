import {IDataObject,} from 'n8n-workflow';
import {IExecuteFunctions,} from 'n8n-core';
import {Gllue, GllueCandidateCreateEndpoint, GllueCandidateListEndpoint, N8nRequest } from './GenericFunctions';
import { CONSENT_STATUS_CONSENTED } from './constants';
import { prepareGllueApiUpdateData } from './helpers';

export class GllueCandidateService {
	createEndpoint: GllueCandidateCreateEndpoint;
	listEndpoint: GllueCandidateListEndpoint;

	constructor(apiHost: string, token: string, request: N8nRequest) {
		this.createEndpoint = new GllueCandidateCreateEndpoint(apiHost, token, request);
		this.listEndpoint = new GllueCandidateListEndpoint(apiHost, token, request);
	}

	async getCandidateById(candidateId: number, fields?: string) : Promise<IDataObject> {
		return await this.listEndpoint.get(candidateId, fields);
	}

	async createOrUpdate(data: IDataObject, candidateId ? : string) : Promise<IDataObject> {
		return await this.createEndpoint.post(data);
	}

}
