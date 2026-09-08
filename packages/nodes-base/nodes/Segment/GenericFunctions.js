export async function segmentApiRequest(method, resource, body = {}, qs = {}, uri, _option = {}) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `https://api.segment.io/v1${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'segmentApi', options);
}
//# sourceMappingURL=GenericFunctions.js.map