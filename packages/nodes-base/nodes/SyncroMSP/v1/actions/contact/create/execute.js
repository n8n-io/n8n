import { apiRequest } from '../../../transport';
export async function createContact(index) {
    const id = this.getNodeParameter('customerId', index);
    const email = this.getNodeParameter('email', index);
    const { address, notes, phone, name } = this.getNodeParameter('additionalFields', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'contacts';
    let body = {};
    let addressData = address;
    if (addressData) {
        addressData = addressData.addressFields;
        addressData.address1 = addressData.address;
    }
    body = {
        ...addressData,
        customer_id: id,
        email,
        name,
        notes,
        phone,
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map