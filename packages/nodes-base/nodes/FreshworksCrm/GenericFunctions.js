import omit from 'lodash/omit';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export async function freshworksCrmApiRequest(method, endpoint, body = {}, qs = {}) {
    const { domain } = await this.getCredentials('freshworksCrmApi');
    const options = {
        method,
        body,
        qs,
        uri: `https://${domain}.myfreshworks.com/crm/sales/api${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        const credentialsType = 'freshworksCrmApi';
        return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function getAllItemsViewId({ fromLoadOptions } = { fromLoadOptions: false }) {
    let resource = this.getNodeParameter('resource', 0);
    let keyword = 'All';
    if (resource === 'account' || fromLoadOptions) {
        resource = 'sales_account'; // adjust resource to endpoint
    }
    if (resource === 'deal') {
        keyword = 'My Deals'; // no 'All Deals' available
    }
    const response = (await freshworksCrmApiRequest.call(this, 'GET', `/${resource}s/filters`));
    const view = response.filters.find((v) => v.name.includes(keyword));
    if (!view) {
        throw new NodeOperationError(this.getNode(), 'Failed to get all items view');
    }
    return view.id.toString();
}
export async function freshworksCrmApiRequestAllItems(method, endpoint, body = {}, qs = {}) {
    const returnData = [];
    let response;
    qs.page = 1;
    do {
        response = await freshworksCrmApiRequest.call(this, method, endpoint, body, qs);
        const key = Object.keys(response)[0];
        returnData.push(...response[key]);
        qs.page++;
    } while (response.meta.total_pages && qs.page <= response.meta.total_pages);
    return returnData;
}
export async function handleListing(method, endpoint, body = {}, qs = {}) {
    const returnAll = this.getNodeParameter('returnAll', 0);
    if (returnAll) {
        return await freshworksCrmApiRequestAllItems.call(this, method, endpoint, body, qs);
    }
    const responseData = await freshworksCrmApiRequestAllItems.call(this, method, endpoint, body, qs);
    const limit = this.getNodeParameter('limit', 0);
    if (limit)
        return responseData.slice(0, limit);
    return responseData;
}
/**
 * Load resources for options, except users.
 *
 * See: https://developers.freshworks.com/crm/api/#admin_configuration
 */
export async function loadResource(resource) {
    const response = (await freshworksCrmApiRequest.call(this, 'GET', `/selector/${resource}`));
    const key = Object.keys(response)[0];
    return response[key].map(({ name, id }) => ({ name, value: id }));
}
export function adjustAttendees(attendees) {
    return attendees.map((attendee) => {
        if (attendee.type === 'contact') {
            return {
                attendee_type: 'Contact',
                attendee_id: attendee.contactId.toString(),
            };
        }
        else if (attendee.type === 'user') {
            return {
                attendee_type: 'FdMultitenant::User',
                attendee_id: attendee.userId.toString(),
            };
        }
    });
}
// /**
//  * Adjust attendee data from n8n UI to the format expected by Freshworks CRM API.
//  */
// export function adjustAttendees(additionalFields: IDataObject & Attendees) {
// 	if (!additionalFields?.appointment_attendees_attributes) return additionalFields;
// 	return {
// 		...omit(additionalFields, ['appointment_attendees_attributes']),
// 		appointment_attendees_attributes: additionalFields.appointment_attendees_attributes.map(attendeeId => {
// 			return { type: 'user', id: attendeeId };
// 		}),
// 	};
// }
/**
 * Adjust account data from n8n UI to the format expected by Freshworks CRM API.
 */
export function adjustAccounts(additionalFields) {
    if (!additionalFields?.sales_accounts)
        return additionalFields;
    const adjusted = additionalFields.sales_accounts.map((accountId) => {
        return { id: accountId, is_primary: false };
    });
    adjusted[0].is_primary = true;
    return {
        ...omit(additionalFields, ['sales_accounts']),
        sales_accounts: adjusted,
    };
}
export function throwOnEmptyUpdate(resource) {
    throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
}
export function throwOnEmptyFilter() {
    throw new NodeOperationError(this.getNode(), 'Please select at least one filter.');
}
//# sourceMappingURL=GenericFunctions.js.map