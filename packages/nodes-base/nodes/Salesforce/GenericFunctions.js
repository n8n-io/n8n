import FormData from 'form-data';
import { DateTime } from 'luxon';
import { NodeApiError } from 'n8n-workflow';
const SALESFORCE_API_VERSION = 'v59.0';
function getOptions(method, endpoint, body, qs, instanceUrl) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}${endpoint}`,
        json: true,
    };
    if (!Object.keys(options.body).length) {
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
function assignOptions(options, option) {
    const { headers: extraHeaders, ...rest } = option;
    if (extraHeaders) {
        options.headers = { ...options.headers, ...extraHeaders };
    }
    Object.assign(options, rest);
}
/** Builds a `FormData` instance from the legacy `formData` option shape. */
function toFormData(fields) {
    const form = new FormData();
    for (const [key, field] of Object.entries(fields)) {
        if (typeof field === 'object' && field !== null && 'value' in field) {
            const { value, options } = field;
            form.append(key, value, options);
        }
        else {
            form.append(key, field);
        }
    }
    return form;
}
export async function salesforceApiRequest(method, endpoint, body = {}, qs = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2');
    try {
        if (authenticationMethod === 'jwt') {
            // https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm&type=5
            // The access token and instance URL are cached on the credential and reused
            // across requests; the credential's authenticate hook attaches the Bearer
            // header and resolves the relative URL against the cached instance URL.
            const credentialsType = 'salesforceJwtApi';
            const { formData, ...restOption } = option;
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                },
                method,
                body,
                qs,
                url: `/services/data/${SALESFORCE_API_VERSION}${uri || endpoint}`,
                json: true,
                // Return the full response and let non-401 error statuses through, so the
                // Salesforce error body is available here instead of being discarded when the
                // authenticated helper wraps the Axios error. 401 still throws so the
                // credential's token refresh runs.
                returnFullResponse: true,
                ignoreHttpStatusErrors: { ignore: true, except: [401] },
            };
            if (formData) {
                // The authenticated helper only understands a FormData body, not the legacy option.
                options.body = toFormData(formData);
            }
            else if (!Object.keys(options.body).length) {
                delete options.body;
            }
            assignOptions(options, restOption);
            if (formData) {
                // Drop the JSON Content-Type after merging caller options so form-data can
                // set the multipart boundary itself.
                delete options.headers['Content-Type'];
            }
            this.logger.debug(`Authentication for "Salesforce" node is using "jwt". Invoking URI ${options.url}`);
            const response = (await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, options));
            if (response.statusCode >= 300) {
                throw Object.assign(new Error(`${response.statusCode} - ${JSON.stringify(response.body)}`), { statusCode: response.statusCode, error: response.body });
            }
            return response.body;
        }
        else {
            // https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm&type=5
            const credentialsType = 'salesforceOAuth2Api';
            const credentials = await this.getCredentials(credentialsType);
            const options = getOptions.call(this, method, uri || endpoint, body, qs, credentials.oauthTokenData.instance_url);
            this.logger.debug(`Authentication for "Salesforce" node is using "OAuth2". Invoking URI ${options.uri}`);
            assignOptions(options, option);
            return await this.helpers.requestOAuth2.call(this, credentialsType, options);
        }
    }
    catch (error) {
        const salesforceError = error;
        // Salesforce REST errors arrive as an array on `error.error` — set by the OAuth2
        // legacy helper and by the JWT error reshaping above. `error.cause.response.data`
        // is a fallback for an Axios error still wrapped by the authenticated helper.
        const responseData = salesforceError.cause?.response?.data;
        const sfErrors = Array.isArray(salesforceError.error)
            ? salesforceError.error
            : Array.isArray(responseData)
                ? responseData
                : [];
        const allFields = sfErrors.flatMap((e) => e.fields ?? []).join(', ') || null;
        const primaryError = sfErrors[0];
        const nodeError = new NodeApiError(this.getNode(), error);
        nodeError.context = {
            ...nodeError.context,
            errorCode: primaryError?.errorCode ?? null,
            fields: allFields,
        };
        throw nodeError;
    }
}
export async function salesforceApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    do {
        responseData = await salesforceApiRequest.call(this, method, endpoint, body, query, uri);
        uri = `${endpoint}/${responseData.nextRecordsUrl?.split('/')?.pop()}`;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.nextRecordsUrl !== undefined && responseData.nextRecordsUrl !== null);
    return returnData;
}
/**
 * Owner fields accept two shapes for backward compatibility: a legacy `options`
 * field stored its value as a raw string, while the current `resourceLocator`
 * field stores `{ __rl, mode, value }`. This normalises both to the string id,
 * or `undefined` when empty/missing.
 */
export function getResourceLocatorValue(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object' && '__rl' in value) {
        const inner = value.value;
        if (inner === undefined || inner === null || inner === '')
            return undefined;
        return String(inner);
    }
    return undefined;
}
/**
 * Sorts the given options alphabetically
 *
 */
export function sortOptions(options) {
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
export function escapeSoqlString(value) {
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
export function validateSoqlFieldName(fieldName) {
    // Salesforce field names: alphanumeric, underscore, can have dots for relationships
    // Examples: Name, Account__c, Account.Name, Custom_Field__c, Account__r, MyObject__Share
    // Supports all Salesforce suffixes: __c, __r, __x, __e, __b, __mdt, __Share, __History, __Feed, etc.
    const validFieldPattern = /^[a-zA-Z][a-zA-Z0-9_]*(__[a-zA-Z]+)?(\.[a-zA-Z][a-zA-Z0-9_]*(__[a-zA-Z]+)?)*$/;
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
export function validateSoqlOperator(operation) {
    // Normalize whitespace: trim and replace multiple spaces with single space
    const normalized = operation.trim().replace(/\s+/g, ' ').toUpperCase();
    const validOperators = {
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
export function validateSoqlObjectName(objectName) {
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
// auto-coerced to unquoted SOQL numbers. String-typed Salesforce fields (e.g.
// external IDs) need quoted literals regardless of content. Older typeVersions
// keep the legacy coercion for backwards compatibility.
const NUMERIC_STRING_QUOTING_VERSION = 1.1;
export function getValue(value, nodeVersion = 1) {
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
        if (/^(LAST|NEXT)_N_(DAYS|WEEKS|MONTHS|QUARTERS|YEARS|FISCAL_QUARTERS|FISCAL_YEARS):\d+$/.test(upperValue)) {
            return upperValue;
        }
        // Check for N_DAYS_AGO, N_WEEKS_AGO, etc. patterns
        if (/^N_(DAYS|WEEKS|MONTHS|QUARTERS|YEARS|FISCAL_QUARTERS|FISCAL_YEARS)_AGO:\d+$/.test(upperValue)) {
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
        // (e.g. `AnnualRevenue > '0'`). Fixed in typeVersion 1.1.
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
export function getConditions(options, nodeVersion = 1) {
    const conditions = options.conditionsUi?.conditionValues;
    if (!Array.isArray(conditions) || conditions.length === 0) {
        return undefined;
    }
    const conditionStrings = conditions.map((condition) => {
        const field = validateSoqlFieldName(condition.field);
        const operator = validateSoqlOperator(condition.operation);
        const value = getValue(condition.value, nodeVersion);
        return `${field} ${operator} ${value}`;
    });
    return `WHERE ${conditionStrings.join(' AND ')}`;
}
export function getDefaultFields(sobject) {
    return {
        Account: 'id,name,type,LastModifiedDate',
        Lead: 'id,company,firstname,lastname,street,postalCode,city,email,status,LastModifiedDate',
        Contact: 'id,firstname,lastname,email,LastModifiedDate',
        Opportunity: 'id,accountId,amount,probability,type,LastModifiedDate',
        Case: 'id,accountId,contactId,priority,status,subject,type,LastModifiedDate',
        Task: 'id,subject,status,priority,LastModifiedDate',
        Attachment: 'id,name,LastModifiedDate',
        User: 'id,name,email,LastModifiedDate',
    }[sobject];
}
export function getQuery(options, sobject, returnAll, limit = 0, nodeVersion = 1) {
    const validSobject = validateSoqlObjectName(sobject);
    const fields = [];
    if (options.fields) {
        // options.fields is comma separated in standard Salesforce objects and array in custom Salesforce objects -- handle both cases
        if (typeof options.fields === 'string') {
            const fieldList = options.fields.split(',').map((f) => f.trim());
            fields.push.apply(fields, fieldList.map((f) => validateSoqlFieldName(f)));
        }
        else {
            fields.push.apply(fields, options.fields.map((f) => validateSoqlFieldName(f)));
        }
    }
    else {
        fields.push.apply(fields, (getDefaultFields(validSobject) || 'id,LastModifiedDate').split(','));
    }
    const conditions = getConditions(options, nodeVersion);
    let query = `SELECT ${fields.join(',')} FROM ${validSobject} ${conditions ? conditions : ''}`;
    if (!returnAll) {
        query = `SELECT ${fields.join(',')} FROM ${validSobject} ${conditions ? conditions : ''} LIMIT ${limit}`;
    }
    return query;
}
/**
 * Calculates the polling start date with safety margin to account for Salesforce indexing delays
 */
export function getPollStartDate(lastTimeChecked) {
    if (!lastTimeChecked) {
        return DateTime.now().toISO();
    }
    const safetyMarginMinutes = 15;
    return DateTime.fromISO(lastTimeChecked).minus({ minutes: safetyMarginMinutes }).toISO();
}
/**
 * Filters out already processed items and manages the processed IDs list
 */
export function filterAndManageProcessedItems(responseData, processedIds, changeType = 'Updated') {
    const processedIdsSet = new Set(processedIds);
    const newItems = [];
    const newItemIds = [];
    for (const item of responseData) {
        if (typeof item.Id !== 'string')
            continue;
        const itemKey = changeType === 'Updated' && typeof item.LastModifiedDate === 'string'
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
//# sourceMappingURL=GenericFunctions.js.map