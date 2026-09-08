import { apiRequest } from '../../../transport';
export async function updateContact(index) {
    const id = this.getNodeParameter('contactId', index);
    const { address, customerId, email, name, notes, phone } = this.getNodeParameter('updateFields', index);
    const qs = {};
    const requestMethod = 'PUT';
    const endpoint = `contacts/${id}`;
    let body = {};
    let addressData = address;
    if (addressData) {
        addressData = addressData.addressFields;
        addressData.address1 = addressData.address;
    }
    body = {
        ...addressData,
        contact_id: id,
        customer_id: customerId,
        email,
        name,
        notes,
        phone,
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map