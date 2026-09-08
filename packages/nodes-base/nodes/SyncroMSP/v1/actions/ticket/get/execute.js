import { apiRequest } from '../../../transport';
export async function getTicket(index) {
    const id = this.getNodeParameter('ticketId', index);
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `tickets/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.ticket);
}
//# sourceMappingURL=execute.js.map