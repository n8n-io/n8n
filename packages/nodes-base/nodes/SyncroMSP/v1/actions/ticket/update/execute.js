import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../../../transport';
export async function updateTicket(index) {
    const id = this.getNodeParameter('ticketId', index);
    const { assetId, customerId, dueDate, issueType, status, subject, ticketType, contactId } = this.getNodeParameter('updateFields', index);
    const qs = {};
    const requestMethod = 'PUT';
    const endpoint = `tickets/${id}`;
    let body = {};
    body = {
        ...(assetId && { asset_id: assetId }),
        ...(customerId && { customer_id: customerId }),
        ...(dueDate && { due_date: dueDate }),
        ...(issueType && { problem_type: issueType }),
        ...(status && { status }),
        ...(subject && { subject }),
        ...(ticketType && { ticket_type: ticketType }),
        ...(contactId && { contact_id: contactId }),
    };
    if (!Object.keys(body).length) {
        throw new NodeOperationError(this.getNode(), 'At least one update fields has to be defined', {
            itemIndex: index,
        });
    }
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.ticket);
}
//# sourceMappingURL=execute.js.map