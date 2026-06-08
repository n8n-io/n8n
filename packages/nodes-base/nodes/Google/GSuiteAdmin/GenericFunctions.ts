import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: uri || `https://www.googleapis.com/admin${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'gSuiteAdminOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Maps the shared writable User attributes (defined in `userExtraFields` in
 * UserDescription.ts) from a create/update collection onto the request body.
 * See https://developers.google.com/workspace/admin/directory/reference/rest/v1/users
 */
export function mapUserExtraFields(fields: IDataObject, body: IDataObject): void {
	if (fields.orgUnitPath) {
		body.orgUnitPath = fields.orgUnitPath;
	}
	if (fields.recoveryEmail) {
		body.recoveryEmail = fields.recoveryEmail;
	}
	if (fields.recoveryPhone) {
		body.recoveryPhone = fields.recoveryPhone;
	}
	if (fields.includeInGlobalAddressList !== undefined) {
		body.includeInGlobalAddressList = fields.includeInGlobalAddressList;
	}
	if (fields.ipWhitelisted !== undefined) {
		body.ipWhitelisted = fields.ipWhitelisted;
	}

	// Single-object fixedCollections
	if (fields.genderUi) {
		body.gender = (fields.genderUi as IDataObject).genderValues;
	}
	if (fields.notesUi) {
		body.notes = (fields.notesUi as IDataObject).notesValues;
	}

	// Array fixedCollections: unwrap the `*Values` wrapper into the API array
	const arrayMappings: Array<[string, string, string]> = [
		['organizationUi', 'organizationValues', 'organizations'],
		['addressesUi', 'addressesValues', 'addresses'],
		['relationsUi', 'relationsValues', 'relations'],
		['externalIdsUi', 'externalIdsValues', 'externalIds'],
		['languagesUi', 'languagesValues', 'languages'],
		['websitesUi', 'websitesValues', 'websites'],
		['imsUi', 'imsValues', 'ims'],
		['keywordsUi', 'keywordsValues', 'keywords'],
		['locationsUi', 'locationsValues', 'locations'],
	];
	for (const [uiKey, valuesKey, bodyKey] of arrayMappings) {
		if (fields[uiKey]) {
			body[bodyKey] = (fields[uiKey] as IDataObject)[valuesKey];
		}
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
