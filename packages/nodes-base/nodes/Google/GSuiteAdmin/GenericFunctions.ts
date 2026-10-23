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

// A fixedCollection always returns every field it declares, so entries arrive padded
// with defaults the user never filled in. The API stores those as real values (a blank
// shell, a 0% FTE), so they have to go before the request is sent.
const isUnset = (value: unknown) =>
	value === undefined || value === null || value === '' || value === false || value === 0;

const stripUnset = (entry: IDataObject): IDataObject =>
	Object.fromEntries(Object.entries(entry).filter(([, value]) => !isUnset(value)));

/**
 * Maps the shared writable User attributes (defined in `userExtraFields` in
 * UserDescription.ts) from a create/update collection onto the request body.
 * See https://developers.google.com/workspace/admin/directory/reference/rest/v1/users
 */
export function mapUserExtraFields(fields: IDataObject, body: IDataObject): void {
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

	// Single-object fixedCollections. A collection the user added and then emptied arrives
	// as `{}`, so the inner values can be missing.
	const genderValues = (fields.genderUi as IDataObject)?.genderValues as IDataObject | undefined;
	if (genderValues) {
		body.gender = stripUnset(genderValues);
	}
	const notesValues = (fields.notesUi as IDataObject)?.notesValues as IDataObject | undefined;
	if (notesValues) {
		body.notes = stripUnset(notesValues);
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
		['posixAccountsUi', 'posixAccountsValues', 'posixAccounts'],
		['sshPublicKeysUi', 'sshPublicKeysValues', 'sshPublicKeys'],
	];
	for (const [uiKey, valuesKey, bodyKey] of arrayMappings) {
		const entries = (fields[uiKey] as IDataObject)?.[valuesKey] as IDataObject[] | undefined;
		if (!Array.isArray(entries)) continue;

		// An empty array would clear the attribute on update, so leave the key off instead
		const mapped = entries.map(stripUnset).filter((entry) => Object.keys(entry).length > 0);
		if (mapped.length > 0) {
			body[bodyKey] = mapped;
		}
	}

	// languageType only drives which field the UI shows; the API doesn't know it, and it
	// rejects a languageCode next to a customLanguage. preference applies to a code only.
	if (Array.isArray(body.languages)) {
		const languages = (body.languages as IDataObject[])
			.map(({ languageType, ...rest }) => {
				if (languageType === 'custom') {
					delete rest.languageCode;
					delete rest.preference;
				} else {
					delete rest.customLanguage;
				}
				return rest;
			})
			// a row where neither side was filled in carries nothing the API can use
			.filter((entry) => entry.languageCode ?? entry.customLanguage);

		if (languages.length > 0) {
			body.languages = languages;
		} else {
			delete body.languages;
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
