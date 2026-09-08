import { apiRequest } from '../../../transport';
export async function createTicket(index) {
    const id = this.getNodeParameter('customerId', index);
    const subject = this.getNodeParameter('subject', index);
    const { assetId, issueType, status, contactId } = this.getNodeParameter('additionalFields', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'tickets';
    let body = {};
    body = {
        asset_id: assetId,
        //due_date: dueDate,
        problem_type: issueType,
        status,
        contact_id: contactId,
    };
    body.customer_id = id;
    body.subject = subject;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.ticket);
}
//# sourceMappingURL=execute.js.map