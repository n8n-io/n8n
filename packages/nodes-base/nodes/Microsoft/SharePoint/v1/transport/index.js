export async function microsoftSharePointApiRequest(method, endpoint, body = {}, qs, headers, url) {
    // Legacy credentials may lack the subdomain (it only recently became required).
    const credentials = await this.getCredentials('microsoftSharePointOAuth2Api');
    const options = {
        method,
        url: url ?? `https://${(credentials.subdomain ?? '').trim()}.sharepoint.com/_api/v2.0${endpoint}`,
        json: true,
        headers,
        body,
        qs,
    };
    return await this.helpers.httpRequestWithAuthentication.call(this, 'microsoftSharePointOAuth2Api', options);
}
//# sourceMappingURL=index.js.map