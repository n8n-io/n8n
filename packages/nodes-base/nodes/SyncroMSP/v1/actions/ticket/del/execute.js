import { apiRequest } from '../../../transport';
export async function deleteTicket(index) {
    const id = this.getNodeParameter('ticketId', index);
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `tickets/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map