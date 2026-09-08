import { apiRequest } from '../../../transport';
export async function addCustomer(index) {
    const email = this.getNodeParameter('email', index);
    const { address, getSms, businessName, lastname, firstName, invoiceCcEmails, noEmail, notes, notificationEmail, phone, referredBy, } = this.getNodeParameter('additionalFields', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'customers';
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
        lastname,
        no_email: noEmail,
        notes,
        notification_email: notificationEmail,
        phone,
        referred_by: referredBy,
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.customer);
}
//# sourceMappingURL=execute.js.map