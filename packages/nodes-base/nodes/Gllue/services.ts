import {IDataObject, IExecuteFunctions} from 'n8n-workflow';

import {
	generateTokenWithAESKey,
	getCurrentTimeStamp,
	getResponseByUri,
	gllueUrlBuilder,
	prepareGllueApiUpdateData,
	UrlParams
} from './helpers';
import {CONSENT_STATUS_CONSENTED} from './constants';

export async function getGllueToken(this: IExecuteFunctions, credentials: IDataObject): Promise<string> {
	const timestamp = getCurrentTimeStamp();
	const token = generateTokenWithAESKey(timestamp, credentials.apiUsername as string, credentials.apiAesKey as string);
	return token;
}

export async function getCandidateById(this: IExecuteFunctions, candidateId: string) : Promise<IDataObject> {
	const credentials = await this.getCredentials('gllueApi') as IDataObject;
	const token = await getGllueToken.call(this, credentials);
	const urlParams = new UrlParams('id='+candidateId, '', token, 1);
	const uriGenerated = gllueUrlBuilder(credentials.apiHost as string, 'candidate', 'list', urlParams);
	const responseData = await getResponseByUri(uriGenerated, this.helpers.request);
	console.log(responseData);
	return responseData;
}

export async function updateCandidateById(this: IExecuteFunctions, candidateId: string, updateData: IDataObject) : Promise<IDataObject> {
	const credentials = await this.getCredentials('gllueApi') as IDataObject;
	const token = await getGllueToken.call(this, credentials);
	const body = prepareGllueApiUpdateData(candidateId, updateData);
	const urlParams : UrlParams = new UrlParams('','', token);
	const uriGenerated = gllueUrlBuilder(credentials.apiHost as string, 'candidate', 'create', urlParams);
	return getResponseByUri(uriGenerated, this.helpers.request,'POST', body);
}

export function shouldUpdateConsentStatus(currentStatus: string|undefined, newStatus: string): boolean {
	const newStatusIsNotNull = newStatus !== undefined && newStatus !== '';

	return newStatusIsNotNull && newStatus !== currentStatus && currentStatus !== CONSENT_STATUS_CONSENTED;
}
