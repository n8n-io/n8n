import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { LOCALHOST } from '@utils/constants';
import mysql2 from 'mysql2/promise';
import { createServer } from 'node:net';
export async function createPool(credentials, options) {
    const connectionOptions = {
        host: credentials.host,
        port: credentials.port,
        database: credentials.database,
        user: credentials.user,
        password: credentials.password,
        multipleStatements: true,
        supportBigNumbers: true,
        decimalNumbers: false,
    };
    if (credentials.ssl) {
        connectionOptions.ssl = {};
        if (credentials.caCertificate) {
            connectionOptions.ssl.ca = formatPemBlock(credentials.caCertificate);
        }
        if (credentials.clientCertificate || credentials.clientPrivateKey) {
            connectionOptions.ssl.cert = formatPemBlock(credentials.clientCertificate);
            connectionOptions.ssl.key = formatPemBlock(credentials.clientPrivateKey);
        }
    }
    if (options?.nodeVersion && options.nodeVersion >= 2.1) {
        connectionOptions.dateStrings = true;
    }
    if (options?.connectionLimit) {
        connectionOptions.connectionLimit = options.connectionLimit;
    }
    if (options?.connectTimeout) {
        connectionOptions.connectTimeout = options.connectTimeout;
    }
    if (options?.largeNumbersOutput === 'text') {
        connectionOptions.bigNumberStrings = true;
    }
    if (options?.decimalNumbers === true) {
        connectionOptions.decimalNumbers = true;
    }
    if (!credentials.sshTunnel) {
        return mysql2.createPool(connectionOptions);
    }
    else {
        if (credentials.sshAuthenticateWith === 'privateKey' && credentials.privateKey) {
            credentials.privateKey = formatPemBlock(credentials.privateKey);
        }
        const sshClient = await this.helpers.getSSHClient(credentials);
        // Find a free TCP port
        const localPort = await new Promise((resolve) => {
            const tempServer = createServer();
            tempServer.listen(0, LOCALHOST, () => {
                resolve(tempServer.address().port);
                tempServer.close();
            });
        });
        const stream = await new Promise((resolve, reject) => {
            sshClient.forwardOut(LOCALHOST, localPort, credentials.host, credentials.port, (err, clientChannel) => {
                if (err)
                    return reject(err);
                resolve(clientChannel);
            });
        });
        return mysql2.createPool({
            ...connectionOptions,
            stream,
        });
    }
}
//# sourceMappingURL=index.js.map