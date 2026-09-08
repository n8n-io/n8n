import { NodeApiError } from 'n8n-workflow';
export async function sendErrorPostReceive(data, response) {
    if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
        throw new NodeApiError(this.getNode(), response);
    }
    return data;
}
//# sourceMappingURL=GenericFunctions.js.map