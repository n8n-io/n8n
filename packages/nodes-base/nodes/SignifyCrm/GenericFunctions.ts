import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	responseData: {
		data?: Array<{ status: string; message: string }>;
	},
) {
	if (responseData?.data?.[0].status === 'error') {
		throw new NodeOperationError(this.getNode(), responseData as Error);
	}
}

// Token cache implementation
interface TokenCache {
    token: string;
    expiresAt: number;
}

const tokenCacheMap: Record<string, TokenCache> = {};

const TOKEN_SAFETY_BUFFER_MS = 5 * 60 * 1000;

export async function signifyCrmApiLogin(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
): Promise<string> {

	const credentials = await this.getCredentials('signifyCrmApi');
	const now = Date.now();
    const userKey = `${credentials.siteUrl}_${credentials.username}`;

	const cached = tokenCacheMap[userKey];
	if (cached && cached.expiresAt > now) {
		return cached.token;
	}

	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: `${credentials.siteUrl}/rest_api/v1/rest/login`,
		body: {
			'Api-Key': credentials.apiKey,
			login_name: credentials.username,
			login_password: credentials.password,
		},
		json: true,
	});

	// Parse the response
	const responseBody = JSON.parse(response.data);

	// Extract token and expiration details
	const token = responseBody.token;
	const expiresAt = (responseBody.token_expires_in * 1000) - TOKEN_SAFETY_BUFFER_MS;
	
	// Cache the token with expiration
	tokenCacheMap[userKey] = { token, expiresAt };

	return token;
}

export async function signifyCrmApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
    const credentials = await this.getCredentials('signifyCrmApi');
	const token = await signifyCrmApiLogin.call(this);

    const options = {
		method,
		url: `${credentials.siteUrl}/rest_api/v1/rest${endpoint}`,
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: {
			'Api-Key': credentials.apiKey,
			...body,
		},
		qs,
		json: true,
	};

	return this.helpers.httpRequest(options);
}

/**
 * Fetches the current user's ID from the /get_user_id endpoint.
 */
export async function signifyCrmGetUserId(
    this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
): Promise<string> {
    const credentials = await this.getCredentials('signifyCrmApi');
    const token       = await signifyCrmApiLogin.call(this);
  
    const response = await this.helpers.httpRequest({
      method:  'POST',
      url:     `${credentials.siteUrl}/rest_api/v1/rest/get_user_id`,
      headers: { Authorization: `Bearer ${token}` },
      body:    { 'Api-Key': credentials.apiKey },
      json:    true,
    });
  
    // here response.data is already the plain user ID string
    return response.data as string;
}


// ----------------------------------------
//               helpers
// ----------------------------------------

export const capitalizeInitial = (str: string) => str[0].toUpperCase() + str.slice(1);

export async function getPicklistOptions(
	this: ILoadOptionsFunctions,
	resource: string,
	targetField: string,
) {

    if (resource === 'contact') {

        const body = {
            module_name: 'Users',
            str_query: "users.deleted = '0' AND users.status = 'active'",
            str_order_by: '',
            offset: '0',
            select_fields: ["user_name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { user_name: { value: string } };
        }>;

        return entries.map(user => ({
            name:  user.name_value_list.user_name.value,
            value: user.id,
        }));

    } else if (resource === 'lead') {

        const body = {
            module_name: 'Campaigns',
            str_query: "campaigns.deleted = '0'",
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(lead => ({
            name:  lead.name_value_list.name.value,
            value: lead.id,
        }));
    } else if (resource === 'opportunity') {

        const body = {
            module_name: 'Accounts',
            str_query: "accounts.deleted = '0'",
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(account => ({
            name:  account.name_value_list.name.value,
            value: account.id,
        }));
    } else if (resource === 'currency') {

        const body = {
            module_name: 'mstr_Currency_s',
            str_query: "mstr_currency_s.deleted = '0'",
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(currency => ({
            name:  currency.name_value_list.name.value,
            value: currency.id,
        }));
    } else if (resource === 'case') {

        const body = {
            module_name: 'Contacts',
            str_query: "contacts.deleted = '0'",
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(contact => ({
            name:  contact.name_value_list.name.value,
            value: contact.id,
        }));
    } else if (resource === 'case_opportunity') {

        const body = {
            module_name: 'Opportunities',
            str_query: "opportunities.deleted = '0'",
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(contact => ({
            name:  contact.name_value_list.name.value,
            value: contact.id,
        }));
    } else if (resource === 'task') {

        const additionalFields = this.getNodeParameter('additionalFields', {}) as Record<string, any>;

        const module = additionalFields.relatedToFields.relatedToPair.parent_type as string | undefined;
        
        if (!module) {
            return [];
        }

        const moduleTableMap: Record<string, string> = {
            Accounts: 'accounts',
            Contacts: 'contacts',
            Opportunities: 'opportunities',
            Project: 'project',
            ProjectTask: 'project_task',
            Cases: 'cases',
            Leads: 'leads',
            Tickets: 'tickets',
            Prospects: 'prospects',
            Tasks: 'tasks',
            qt_Header_s: 'qt_header_s',
            so_Header_s: 'so_header_s',
            srvc_Order_s: 'srvc_order_s',
            po_Header_s: 'po_header_s',
        };
        
        const tableName = moduleTableMap[module] ?? module.toLowerCase();

        const body = {
            module_name: module,
            str_query: `${tableName}.deleted = '0'`,
            str_order_by: '',
            offset: '0',
            select_fields: ["name"],
            link_name_to_fields: [],
            max_results: '999',
            deleted: '',
            favorites: '',
        };

        const response = await signifyCrmApiRequest.call(
            this,
            'POST',
            '/get_entry_list',
            body,
        );

        const entries = (response.data.entry_list ?? []) as Array<{
            id: string;
            name_value_list: { name: { value: string } };
        }>;

        return entries.map(entry => ({
            name:  entry.name_value_list.name.value,
            value: entry.id,
        }));
    }

    return [];
}