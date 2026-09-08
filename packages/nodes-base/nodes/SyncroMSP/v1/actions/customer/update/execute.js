import { NodeApiError } from 'n8n-workflow';
import { apiRequest } from '../../../transport';
export async function updateCustomer(index) {
    const id = this.getNodeParameter('customerId', index);
    const { address, businessName, email, firstName, getSms, invoiceCcEmails, lastName, noEmail, notes, notificationEmail, phone, referredBy, } = this.getNodeParameter('updateFields', index);
    const qs = {};
    const requestMethod = 'PUT';
    const endpoint = `customers/${id}`;
    let body = {};
    let addressData = address;
    if (addressData) {
        addressData = addressData.addressFields;
        addressData.address_2 = addressData.address2;
    }
    body = {
        ...addressData,
        business_name: businessName,
        email,
        firstname: firstName,
        get_sms: getSms,
        invoice_cc_emails: (invoiceCcEmails || []).join(','),
        lastname: lastName,
        no_email: noEmail,
        notes,
        notification_email: notificationEmail,
        phone,
        referred_by: referredBy,
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    if (!responseData.customer) {
        throw new NodeApiError(this.getNode(), responseData, {
            httpCode: '404',
            message: 'Customer ID not found',
        });
    }
    return this.helpers.returnJsonArray(responseData.customer);
}
//# sourceMappingURL=execute.js.map