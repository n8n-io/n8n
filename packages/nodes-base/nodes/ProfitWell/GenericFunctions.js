import { NodeApiError } from 'n8n-workflow';
export async function profitWellApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        const credentials = await this.getCredentials('profitWellApi');
        let options = {
            headers: {
                Authorization: credentials.accessToken,
            },
            method,
            qs,
            body,
            uri: uri || `https://api.profitwell.com/v2${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function simplifyDailyMetrics(responseData) {
    const data = [];
    const keys = Object.keys(responseData);
    const dates = responseData[keys[0]].map((e) => e.date);
    for (const [index, date] of dates.entries()) {
        const element = {
            date,
        };
        for (const key of keys) {
            element[key] = responseData[key][index].value;
        }
        data.push(element);
    }
    return data;
}
export function simplifyMontlyMetrics(responseData) {
    const data = {};
    for (const key of Object.keys(responseData)) {
        for (const [index] of responseData[key].entries()) {
            data[key] = responseData[key][index].value;
            data.date = responseData[key][index].date;
        }
    }
    return data;
}
//# sourceMappingURL=GenericFunctions.js.map