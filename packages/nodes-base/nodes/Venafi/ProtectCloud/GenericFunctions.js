import * as nacl_factory from 'js-nacl';
import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
export async function venafiApiRequest(method, resource, body = {}, qs = {}, option = {}) {
    const operation = this.getNodeParameter('operation', 0);
    const credentials = await this.getCredentials('venafiTlsProtectCloudApi');
    const region = credentials.region ?? 'cloud';
    const options = {
        headers: {
            Accept: 'application/json',
            'content-type': 'application/json',
        },
        method,
        body,
        qs,
        uri: `https://api.venafi.${region}${resource}`,
        json: true,
    };
    if (Object.keys(option).length) {
        Object.assign(options, option);
    }
    // For cert download we don't need any headers
    // If we remove for everything the key fetch fails
    if (operation === 'download') {
        // We need content-type for keystore
        if (!resource.endsWith('keystore')) {
            delete options.headers.Accept;
            delete options.headers['content-type'];
        }
    }
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, 'venafiTlsProtectCloudApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function venafiApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await venafiApiRequest.call(this, method, endpoint, body, query);
        endpoint = get(responseData, '_links[0].Next');
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData._links?.[0].Next);
    return returnData;
}
export async function encryptPassphrase(certificateId, passphrase, storePassphrase) {
    let dekHash = '';
    const dekResponse = await venafiApiRequest.call(this, 'GET', `/outagedetection/v1/certificates/${certificateId}`);
    if (dekResponse.dekHash) {
        dekHash = dekResponse.dekHash;
    }
    let pubKey = '';
    const pubKeyResponse = await venafiApiRequest.call(this, 'GET', `/v1/edgeencryptionkeys/${dekHash}`);
    if (pubKeyResponse.key) {
        pubKey = pubKeyResponse.key;
    }
    let encryptedKeyPass = '';
    let encryptedKeyStorePass = '';
    const promise = async () => {
        return await new Promise((resolve, reject) => {
            nacl_factory.instantiate((nacl) => {
                try {
                    const passphraseUTF8 = nacl.encode_utf8(passphrase);
                    const keyPassBuffer = nacl.crypto_box_seal(passphraseUTF8, Buffer.from(pubKey, 'base64'));
                    encryptedKeyPass = Buffer.from(keyPassBuffer).toString('base64');
                    const storePassphraseUTF8 = nacl.encode_utf8(storePassphrase);
                    const keyStorePassBuffer = nacl.crypto_box_seal(storePassphraseUTF8, Buffer.from(pubKey, 'base64'));
                    encryptedKeyStorePass = Buffer.from(keyStorePassBuffer).toString('base64');
                    return resolve([encryptedKeyPass, encryptedKeyStorePass]);
                }
                catch (error) {
                    return reject(error);
                }
            });
        });
    };
    return await promise();
}
//# sourceMappingURL=GenericFunctions.js.map