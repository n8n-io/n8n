import { DateTime } from 'luxon';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodePropertyOptions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IRequestOptions,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type SalesforceApiError = {
	errorCode?: string;
	fields?: string[];
	message?: string;
};

type SalesforceApiErrorResponse = {
	error?: SalesforceApiError[];
};

const SALESFORCE_API_VERSION = 'v59.0';

function getOptions(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any,
	qs: IDataObject,
	instanceUrl: string,
): IRequestOptions {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}${endpoint}`,
		json: true,
	};

	if (!Object.keys(options.body as IDataObject).length) {
		delete options.body;
	}

	return options;
}

/**
 * Merges extra request options onto the base options. Unlike a plain
 * `Object.assign`, headers are merged rather than replaced, so a caller can add
 * a header (e.g. `Sforce-Query-Options`) without dropping the `Content-Type`
 * header the request builder already set.
 */
function assignOptions(options: IRequestOptions | IHttpRequestOptions, option: IDataObject): void {
	const { headers: extraHeaders, ...rest } = option;
	if (extraHeaders) {
		options.headers = { ...options.headers, ...(extraHeaders as IDataObject) };
	}
	Object.assign(options, rest);
}

export async function salesforceApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;
	try {
		if (authenticationMethod === 'jwt') {
			// https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm&type=5
			// The access token and instance URL are cached on the credential and reused
			// across requests; the credential's authenticate hook attaches the Bearer
			// header and resolves the relative URL against the cached instance URL.
			const credentialsType = 'salesforceJwtApi';
			const options: IHttpRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				method,
				body,
				qs,
				url: `/services/data/${SALESFORCE_API_VERSION}${uri || endpoint}`,
				json: true,
			};

			if (!Object.keys(options.body as IDataObject).length) {
				delete options.body;
			}

			assignOptions(options, option);
			this.logger.debug(
				`Authentication for "Salesforce" node is using "jwt". Invoking URI ${options.url}`,
			);
			return await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, options);
		} else {
			// https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm&type=5
			const credentialsType = 'salesforceOAuth2Api';
			const credentials = await this.getCredentials<{
				oauthTokenData: { instance_url: string };
			}>(credentialsType);
			const options = getOptions.call(
				this,
				method,
				uri || endpoint,
				body,
				qs,
				credentials.oauthTokenData.instance_url,
			);
			this.logger.debug(
				`Authentication for "Salesforce" node is using "OAuth2". Invoking URI ${options.uri}`,
			);
			assignOptions(options, option);

			return await this.helpers.requestOAuth2.call(this, credentialsType, options);
		}
	} catch (error) {
		const salesforceError = error as SalesforceApiErrorResponse & {
			cause?: { response?: { data?: unknown } };
		};

		// Salesforce REST errors arrive as an array on `error.error` (OAuth2 path via the
		// legacy request helper) or on the wrapped Axios error's response data under
		// `error.cause` (JWT path via the authenticated request helper).
		const responseData = salesforceError.cause?.response?.data;
		const sfErrors: SalesforceApiError[] = Array.isArray(salesforceError.error)
			? salesforceError.error
			: Array.isArray(responseData)
				? (responseData as SalesforceApiError[])
				: [];

		const allFields = sfErrors.flatMap((e) => e.fields ?? []).join(', ') || null;

		const primaryError = sfErrors[0];

		const nodeError = new NodeApiError(this.getNode(), error as JsonObject);
		nodeError.context = {
			...nodeError.context,
			errorCode: primaryError?.errorCode ?? null,
			fields: allFields,
		};

		throw nodeError;
	}
}

export async function salesforceApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		responseData = await salesforceApiRequest.call(this, method, endpoint, body, query, uri);
		uri = `${endpoint}/${responseData.nextRecordsUrl?.split('/')?.pop()}`;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextRecordsUrl !== undefined && responseData.nextRecordsUrl !== null);

	return returnData;
}

/**
 * Owner fields accept two shapes for backward compatibility: a legacy `options`
 * field stored its value as a raw string, while the current `resourceLocator`
 * field stores `{ __rl, mode, value }`. This normalises both to the string id,
 * or `undefined` when empty/missing.
 */
export function getResourceLocatorValue(value: unknown): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'string') return value;
	if (typeof value === 'object' && '__rl' in value) {
		const inner = (value as { value?: unknown }).value;
		if (inner === undefined || inner === null || inner === '') return undefined;
		return String(inner);
	}
	return undefined;
}

/**
 * Sorts the given options alphabetically
 *
 */
export function sortOptions(options: INodePropertyOptions[]): void {
	options.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});
}

/**
 * Escapes special characters in a string value for use in SOQL queries.
 * SOQL requires escaping: single quotes, backslashes, and certain control characters.
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_quotedstringescapes.htm
 */
export function escapeSoqlString(value: string): string {
	return value
		.replace(/\\/g, '\\\\') // Escape backslashes first
		.replace(/'/g, "\\'") // Escape single quotes
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\n/g, '\\n') // Escape newlines
		.replace(/\r/g, '\\r') // Escape carriage returns
		.replace(/\t/g, '\\t') // Escape tabs
		.replace(/\f/g, '\\f') // Escape form feeds
		.replace(/[\b]/g, '\\b'); // Escape backspaces
}

/**
 * Validates that a field name is a valid Salesforce field identifier.
 * Valid field names contain only alphanumeric characters, underscores, and can include
 * relationship traversal dots for related object fields.
 * @throws Error if the field name contains invalid characters
 */
export function validateSoqlFieldName(fieldName: string): string {
	// Salesforce field names: alphanumeric, underscore, can have dots for relationships
	// Examples: Name, Account__c, Account.Name, Custom_Field__c, Account__r, MyObject__Share
	// Supports all Salesforce suffixes: __c, __r, __x, __e, __b, __mdt, __Share, __History, __Feed, etc.
	const validFieldPattern =
		/^[a-zA-Z][a-zA-Z0-9_]*(__[a-zA-Z]+)?(\.[a-zA-Z][a-zA-Z0-9_]*(__[a-zA-Z]+)?)*$/;

	if (!validFieldPattern.test(fieldName)) {
		throw new Error(`Invalid SOQL field name: ${fieldName}`);
	}

	return fieldName;
}

/**
 * Validates and returns a valid SOQL comparison operator.
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_comparisonoperators.htm
 * @throws Error if the operator is invalid
 */
export function validateSoqlOperator(operation: string): string {
	// Normalize whitespace: trim and replace multiple spaces with single space
	const normalized = operation.trim().replace(/\s+/g, ' ').toUpperCase();

	const validOperators: Record<string, string> = {
		EQUAL: '=',
		'=': '=',
		'!=': '!=',
		'<>': '<>',
		'<': '<',
		'<=': '<=',
		'>': '>',
		'>=': '>=',
		LIKE: 'LIKE',
		'NOT LIKE': 'NOT LIKE',
		IN: 'IN',
		'NOT IN': 'NOT IN',
		INCLUDES: 'INCLUDES',
		EXCLUDES: 'EXCLUDES',
	};

	const validOperator = validOperators[normalized] || validOperators[operation];
	if (!validOperator) {
		throw new Error(`Invalid SOQL operator: ${operation}`);
	}

	return validOperator;
}

/**
 * Validates that an SObject name is a valid Salesforce object identifier.
 * Standard objects: Account, Contact, Lead, etc.
 * Custom objects: MyObject__c, Namespace__MyObject__c
 * External objects: MyObject__x
 * Platform events: MyEvent__e
 * Big objects: MyBigObject__b
 * Custom metadata types: MyMetadata__mdt
 * @throws Error if the object name contains invalid characters
 */
export function validateSoqlObjectName(objectName: string): string {
	// Salesforce object names: alphanumeric, underscore
	// Can have namespace prefix like Namespace__ObjectName__c
	// Standard objects: Account, Contact, Lead, etc.
	// Suffixes (__c, __mdt, __Share, __ChangeEvent, etc.) are validated as English letters only,
	// consistent with validateSoqlFieldName, to stay future-proof without enumerating every suffix.
	const validObjectPattern = /^[A-Za-z][A-Za-z0-9_]*(?:__[A-Za-z][A-Za-z0-9_]*)*$/;

	if (!validObjectPattern.test(objectName)) {
		throw new Error(`Invalid SOQL object name: ${objectName}`);
	}

	return objectName;
}

/**
 * Salesforce date literals that should not be quoted
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_dateformats.htm
 */
const SALESFORCE_DATE_LITERALS = new Set([
	'YESTERDAY',
	'TODAY',
	'TOMORROW',
	'LAST_WEEK',
	'THIS_WEEK',
	'NEXT_WEEK',
	'LAST_MONTH',
	'THIS_MONTH',
	'NEXT_MONTH',
	'LAST_90_DAYS',
	'NEXT_90_DAYS',
	'THIS_QUARTER',
	'LAST_QUARTER',
	'NEXT_QUARTER',
	'THIS_YEAR',
	'LAST_YEAR',
	'NEXT_YEAR',
	'THIS_FISCAL_QUARTER',
	'LAST_FISCAL_QUARTER',
	'NEXT_FISCAL_QUARTER',
	'THIS_FISCAL_YEAR',
	'LAST_FISCAL_YEAR',
	'NEXT_FISCAL_YEAR',
]);

// Salesforce node typeVersion at which numeric-looking strings stopped being
// auto-coerced to unquoted SOQL numbers. See NODE-5116: string-typed Salesforce
// fields (e.g. external IDs) need quoted literals regardless of content. Older
// typeVersions keep the legacy coercion for backwards compatibility.
const NUMERIC_STRING_QUOTING_VERSION = 1.1;

export function getValue(value: any, nodeVersion = 1): string | number | boolean {
	if (value === null || value === undefined) {
		return 'null';
	}

	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new Error('Invalid numeric value: must be a finite number');
		}
		return value;
	}

	// Handle arrays - convert to IN clause format with escaped values
	if (Array.isArray(value)) {
		const escapedValues = value.map((v) => {
			if (typeof v === 'string') {
				// Only escape strings, don't try to convert to numbers
				return `'${escapeSoqlString(v)}'`;
			}
			if (typeof v === 'number' && Number.isFinite(v)) {
				return v.toString();
			}
			if (typeof v === 'boolean') {
				return v.toString();
			}
			throw new Error('Array values must be strings, numbers, or booleans');
		});
		return `(${escapedValues.join(',')})`;
	}

	if (typeof value === 'string') {
		value = value.trim();
		// Check for Salesforce date literals (e.g., TODAY, LAST_N_DAYS:7)
		const upperValue = value.toUpperCase();
		if (SALESFORCE_DATE_LITERALS.has(upperValue)) {
			return upperValue;
		}

		// Check for LAST_N_DAYS, NEXT_N_DAYS, N_DAYS_AGO, etc. patterns
		if (
			/^(LAST|NEXT)_N_(DAYS|WEEKS|MONTHS|QUARTERS|YEARS|FISCAL_QUARTERS|FISCAL_YEARS):\d+$/.test(
				upperValue,
			)
		) {
			return upperValue;
		}

		// Check for N_DAYS_AGO, N_WEEKS_AGO, etc. patterns
		if (
			/^N_(DAYS|WEEKS|MONTHS|QUARTERS|YEARS|FISCAL_QUARTERS|FISCAL_YEARS)_AGO:\d+$/.test(upperValue)
		) {
			return upperValue;
		}

		// Check for Salesforce datetime format: YYYY-MM-DDTHH:mm:ss(.SSS)?(Z|[+-]HH:mm)
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/.test(value)) {
			const luxonValue = DateTime.fromISO(value);
			if (luxonValue.isValid) {
				return value;
			}
		}

		// Check for Salesforce date format: YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			const luxonValue = DateTime.fromISO(value);
			if (luxonValue.isValid) {
				return value;
			}
		}

		// Legacy behavior (typeVersion < 1.1): auto-coerce numeric strings to unquoted
		// SOQL numbers. Kept for existing workflows that rely on it for numeric SF fields
		// (e.g. `AnnualRevenue > '0'`). Fixed in typeVersion 1.1 — see NODE-5116.
		if (nodeVersion < NUMERIC_STRING_QUOTING_VERSION && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
			const numericValue = Number(value);
			if (Number.isFinite(numericValue)) {
				return numericValue;
			}
		}

		// All other strings are escaped and quoted. From typeVersion 1.1 onwards this
		// includes numeric-looking strings — the value input has no field-type info,
		// and string-typed Salesforce fields (e.g. external IDs) require quoted literals
		// regardless of content. Users wanting a numeric comparison must pass a number
		// via an expression.
		return `'${escapeSoqlString(value)}'`;
	}

	throw new Error(`Unsupported value type: ${typeof value}`);
}

export function getConditions(options: IDataObject, nodeVersion = 1): string | undefined {
	const conditions = (options.conditionsUi as IDataObject)?.conditionValues as IDataObject[];

	if (!Array.isArray(conditions) || conditions.length === 0) {
		return undefined;
	}

	const conditionStrings = conditions.map((condition: IDataObject) => {
		const field = validateSoqlFieldName(condition.field as string);
		const operator = validateSoqlOperator(condition.operation as string);
		const value = getValue(condition.value, nodeVersion);

		return `${field} ${operator} ${value}`;
	});

	return `WHERE ${conditionStrings.join(' AND ')}`;
}

export function getDefaultFields(sobject: string) {
	return (
		{
			Account: 'id,name,type,LastModifiedDate',
			Lead: 'id,company,firstname,lastname,street,postalCode,city,email,status,LastModifiedDate',
			Contact: 'id,firstname,lastname,email,LastModifiedDate',
			Opportunity: 'id,accountId,amount,probability,type,LastModifiedDate',
			Case: 'id,accountId,contactId,priority,status,subject,type,LastModifiedDate',
			Task: 'id,subject,status,priority,LastModifiedDate',
			Attachment: 'id,name,LastModifiedDate',
			User: 'id,name,email,LastModifiedDate',
		} as IDataObject
	)[sobject];
}

export function getQuery(
	options: IDataObject,
	sobject: string,
	returnAll: boolean,
	limit = 0,
	nodeVersion = 1,
) {
	const validSobject = validateSoqlObjectName(sobject);

	const fields: string[] = [];
	if (options.fields) {
		// options.fields is comma separated in standard Salesforce objects and array in custom Salesforce objects -- handle both cases
		if (typeof options.fields === 'string') {
			const fieldList = options.fields.split(',').map((f) => f.trim());
			fields.push.apply(
				fields,
				fieldList.map((f) => validateSoqlFieldName(f)),
			);
		} else {
			fields.push.apply(
				fields,
				(options.fields as string[]).map((f) => validateSoqlFieldName(f)),
			);
		}
	} else {
		fields.push.apply(
			fields,
			((getDefaultFields(validSobject) as string) || 'id,LastModifiedDate').split(','),
		);
	}
	const conditions = getConditions(options, nodeVersion);

	let query = `SELECT ${fields.join(',')} FROM ${validSobject} ${conditions ? conditions : ''}`;

	if (!returnAll) {
		query = `SELECT ${fields.join(',')} FROM ${validSobject} ${
			conditions ? conditions : ''
		} LIMIT ${limit}`;
	}

	return query;
}

/**
 * Calculates the polling start date with safety margin to account for Salesforce indexing delays
 */
export function getPollStartDate(lastTimeChecked: string | undefined): string {
	if (!lastTimeChecked) {
		return DateTime.now().toISO();
	}
	const safetyMarginMinutes = 15;
	return DateTime.fromISO(lastTimeChecked).minus({ minutes: safetyMarginMinutes }).toISO();
}

/**
 * Filters out already processed items and manages the processed IDs list
 */
export function filterAndManageProcessedItems(
	responseData: IDataObject[],
	processedIds: string[],
	changeType: 'Created' | 'Updated' = 'Updated',
): { newItems: IDataObject[]; updatedProcessedIds: string[] } {
	const processedIdsSet = new Set(processedIds);

	const newItems: IDataObject[] = [];
	const newItemIds: string[] = [];

	for (const item of responseData) {
		if (typeof item.Id !== 'string') continue;

		const itemKey =
			changeType === 'Updated' && typeof item.LastModifiedDate === 'string'
				? `${item.Id}_${item.LastModifiedDate}`
				: item.Id;

		if (!processedIdsSet.has(itemKey)) {
			newItems.push(item);
			newItemIds.push(itemKey);
		}
	}

	const remainingProcessedIds = Array.from(processedIdsSet);
	const updatedProcessedIds = remainingProcessedIds.concat(newItemIds);

	const MAX_IDS = 10000;
	const trimmedProcessedIds = updatedProcessedIds.slice(-MAX_IDS);

	return { newItems, updatedProcessedIds: trimmedProcessedIds };
}
