export async function theHiveApiRequest(method, resource, body = {}, query = {}, uri, option = {}) {
    const credentials = await this.getCredentials('theHiveProjectApi');
    let options = {
        method,
        qs: query,
        url: uri || `${credentials.url}/api${resource}`,
        body,
        skipSslCertificateValidation: credentials.allowUnauthorizedCerts,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        options = Object.assign({}, options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(query).length === 0) {
        delete options.qs;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'theHiveProjectApi', options);
}
//# sourceMappingURL=requestApi.js.map