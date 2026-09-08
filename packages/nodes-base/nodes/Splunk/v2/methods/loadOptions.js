import { splunkApiJsonRequest } from '../transport';
export async function getRoles() {
    const endpoint = '/services/authorization/roles';
    const responseData = await splunkApiJsonRequest.call(this, 'GET', endpoint);
    return responseData.map((entry) => ({
        name: entry.id,
        value: entry.id,
    }));
}
//# sourceMappingURL=loadOptions.js.map