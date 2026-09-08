export async function wufooApiRequest(method, resource, body = {}, qs = {}, option = {}) {
    const credentials = await this.getCredentials('wufooApi');
    let options = {
        method,
        form: body,
        body,
        qs,
        uri: `https://${credentials.subdomain}.wufoo.com/api/v3/${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0 || method === 'PUT') {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'wufooApi', options);
}
//# sourceMappingURL=GenericFunctions.js.map