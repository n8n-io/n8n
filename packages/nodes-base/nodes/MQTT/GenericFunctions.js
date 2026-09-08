import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { connect } from 'mqtt';
import { OperationalError, randomString } from 'n8n-workflow';
export const createClient = async (credentials) => {
    const { protocol, host, port, clean, clientId, username, password } = credentials;
    const clientOptions = {
        protocol,
        host,
        port,
        clean,
        clientId: clientId || `mqttjs_${randomString(8).toLowerCase()}`,
    };
    if (username && password) {
        clientOptions.username = username;
        clientOptions.password = password;
    }
    if (credentials.ssl) {
        clientOptions.ca = formatPemBlock(credentials.ca);
        clientOptions.cert = formatPemBlock(credentials.cert);
        clientOptions.key = formatPemBlock(credentials.key);
        clientOptions.rejectUnauthorized = credentials.rejectUnauthorized;
    }
    return await new Promise((resolve, reject) => {
        const client = connect(clientOptions);
        const onConnect = () => {
            client.removeListener('connect', onConnect);
            client.removeListener('error', onError);
            resolve(client);
        };
        const onError = (error) => {
            client.removeListener('connect', onConnect);
            client.removeListener('error', onError);
            // mqtt client has an automatic reconnect mechanism that will
            // keep trying to reconnect until it succeeds unless we
            // explicitly close the client
            client.end();
            reject(new OperationalError(error.message));
        };
        client.once('connect', onConnect);
        client.once('error', onError);
    });
};
//# sourceMappingURL=GenericFunctions.js.map