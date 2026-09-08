import moment from 'moment-timezone';
import { NodeApiError } from 'n8n-workflow';
export async function onfleetApiRequest(method, resource, body = {}, qs, uri) {
    const credentials = await this.getCredentials('onfleetApi');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'n8n-onfleet',
        },
        auth: {
            user: credentials.apiKey,
            pass: '',
        },
        method,
        body,
        qs,
        uri: uri || `https://onfleet.com/api/v2/${resource}`,
        json: true,
    };
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function onfleetApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await onfleetApiRequest.call(this, method, endpoint, body, query);
        query.lastId = responseData.lastId;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.lastId !== undefined);
    return returnData;
}
export const resourceLoaders = {
    async getTeams() {
        try {
            const teams = (await onfleetApiRequest.call(this, 'GET', 'teams'));
            return teams.map(({ name = '', id: value = '' }) => ({
                name,
                value,
            }));
        }
        catch (error) {
            return [];
        }
    },
    async getWorkers() {
        try {
            const workers = (await onfleetApiRequest.call(this, 'GET', 'workers'));
            return workers.map(({ name = '', id: value = '' }) => ({
                name,
                value,
            }));
        }
        catch (error) {
            return [];
        }
    },
    async getAdmins() {
        try {
            const admins = (await onfleetApiRequest.call(this, 'GET', 'admins'));
            return admins.map(({ name = '', id: value = '' }) => ({
                name,
                value,
            }));
        }
        catch (error) {
            return [];
        }
    },
    async getHubs() {
        try {
            const hubs = (await onfleetApiRequest.call(this, 'GET', 'hubs'));
            return hubs.map(({ name = '', id: value = '' }) => ({
                name,
                value,
            }));
        }
        catch (error) {
            return [];
        }
    },
    async getTimezones() {
        const returnData = [];
        for (const timezone of moment.tz.names()) {
            returnData.push({
                name: timezone,
                value: timezone,
            });
        }
        return returnData;
    },
};
//# sourceMappingURL=GenericFunctions.js.map