/**
 * Make an API request to Twake
 *
 */
export async function twakeApiRequest(method, resource, body, query, uri) {
    const options = {
        headers: {},
        method,
        body,
        qs: query,
        uri: uri || `https://plugins.twake.app/plugins/n8n${resource}`,
        json: true,
    };
    // if (authenticationMethod === 'cloud') {
    // } else {
    // 	const credentials = await this.getCredentials('twakeServerApi');
    // 	options.auth = { user: credentials!.publicId as string, pass: credentials!.privateApiKey as string };
    // 	options.uri = `${credentials!.hostUrl}/api/v1${resource}`;
    // }
    return await this.helpers.requestWithAuthentication.call(this, 'twakeCloudApi', options);
}
//# sourceMappingURL=GenericFunctions.js.map