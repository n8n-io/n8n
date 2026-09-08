export async function azureCosmosDbApiRequest(method, endpoint, body = {}, qs, headers, returnFullResponse = false) {
    const credentialsType = 'microsoftAzureCosmosDbSharedKeyApi';
    const credentials = await this.getCredentials(credentialsType);
    const baseUrl = `https://${credentials.account}.documents.azure.com/dbs/${credentials.database}`;
    const options = {
        method,
        url: `${baseUrl}${endpoint}`,
        json: true,
        headers,
        body,
        qs,
        returnFullResponse,
    };
    return await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, options);
}
//# sourceMappingURL=index.js.map