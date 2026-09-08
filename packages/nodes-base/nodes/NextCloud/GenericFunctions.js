import { NodeOperationError, } from 'n8n-workflow';
/**
 * Make an API request to NextCloud
 *
 */
export async function nextCloudApiRequest(method, endpoint, body, headers, encoding, query, useWebDavEndpoint = true) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    let credentials;
    if (authenticationMethod === 'accessToken') {
        credentials = await this.getCredentials('nextCloudApi');
    }
    else {
        credentials = await this.getCredentials('nextCloudOAuth2Api');
    }
    // Validate webDavUrl to catch credential corruption (empty, malformed, or no hostname etc.)
    const webDavUrl = credentials.webDavUrl ?? '';
    if (!URL.canParse(webDavUrl) || !/^https?:\/\//.test(webDavUrl)) {
        throw new NodeOperationError(this.getNode(), `Invalid WebDAV URL in credentials: "${webDavUrl}". The URL must start with https:// or http://. Please check your Nextcloud credentials.`);
    }
    const options = {
        headers,
        method,
        body,
        qs: query ?? {},
        uri: '',
        json: false,
    };
    if (encoding === null) {
        options.encoding = null;
    }
    // Preserve the existing WebDAV path behavior: endpoints may start with '/', producing '//'.
    // For non-WebDAV requests, strip the WebDAV suffix while preserving any subpath prefix.
    options.uri = useWebDavEndpoint
        ? `${webDavUrl}/${encodeURI(endpoint)}`
        : `${webDavUrl.replace(/\/remote\.php\/webdav\/?$/, '')}/${encodeURI(endpoint)}`;
    const credentialType = authenticationMethod === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api';
    const response = await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    if (typeof response === 'string' && response.includes('<b>Fatal error</b>')) {
        throw new NodeOperationError(this.getNode(), "NextCloud responded with a 'Fatal error', check description for more details", {
            description: `Server response:\n${response}`,
        });
    }
    return response;
}
//# sourceMappingURL=GenericFunctions.js.map