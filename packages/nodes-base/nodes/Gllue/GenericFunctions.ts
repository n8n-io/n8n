import {IDataObject} from 'n8n-workflow';
import {CONSENT_STATUS_CONSENTED, CONSENT_STATUS_SENT } from './constants';
import {buildOptionWithUri, getResponseByUri, gllueUrlBuilder, UrlParams} from './helpers';


export function shouldUpdateConsentStatus(currentStatus: string|undefined, newStatus: string): boolean {
	const newStatusIsNotNull = newStatus !== undefined && newStatus !== '';

	return newStatusIsNotNull && newStatus !== currentStatus && currentStatus !== CONSENT_STATUS_CONSENTED;
}

// tslint:disable-next-line:no-any
export type N8nRequest = (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;

export class Gllue {
 	apiHost = '';
 	token = '';
 	request: N8nRequest;
 	operation = 'simple_list_with_ids';

 	constructor(apiHost: string, token: string, request: N8nRequest) {
 		this.apiHost = apiHost;
 		this.token = token;
 		this.request = request;
 	}

 	async getDetail(resource: string, resourceId: number, fields?: string) {
 		const query = `id__eq=${resourceId}`;
 		const urlParams = new UrlParams(query, fields, this.token);
 		const uriGenerated = gllueUrlBuilder(this.apiHost, resource, this.operation, urlParams);

 		return await getResponseByUri(uriGenerated, this.request);
 	}
}

export class GllueCandidateListEndpoint extends Gllue {
	resource = 'candidate';

	async get(resourceId: number, fields?: string) {
		let response = await this.getDetail(this.resource, resourceId, fields);
		if (response !== undefined && Object.keys(response).includes('result') && response.result.candidate !== undefined){
			response = response.result.candidate;
		}
		return response;
	}

}

export class GllueCandidateCreateEndpoint extends Gllue {
	resource = 'candidate';
	operation = 'add';

	async post(payload: IDataObject){
		const urlParams = new UrlParams('', '', this.token);
		const urlGenerated = gllueUrlBuilder(this.apiHost, this.resource, this.operation, urlParams);

		const options = buildOptionWithUri(urlGenerated, 'POST', payload);
		return await this.request(options)
	}
}


