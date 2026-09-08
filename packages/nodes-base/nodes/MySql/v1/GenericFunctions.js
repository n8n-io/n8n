import mysql2 from 'mysql2/promise';
export async function createConnection(credentials) {
    const { ssl, caCertificate, clientCertificate, clientPrivateKey, ...baseCredentials } = credentials;
    if (ssl) {
        baseCredentials.ssl = {};
        if (caCertificate) {
            baseCredentials.ssl.ca = caCertificate;
        }
        if (clientCertificate || clientPrivateKey) {
            baseCredentials.ssl.cert = clientCertificate;
            baseCredentials.ssl.key = clientPrivateKey;
        }
    }
    return await mysql2.createConnection(baseCredentials);
}
export async function searchTables(tableName) {
    const credentials = await this.getCredentials('mySql');
    const connection = await createConnection(credentials);
    const sql = `SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = ?
AND table_name LIKE ?
ORDER  BY table_name`;
    const values = [credentials.database, `%${tableName ?? ''}%`];
    const [rows] = await connection.query(sql, values);
    const results = rows.map((table) => ({
        name: table.table_name || table.TABLE_NAME,
        value: table.table_name || table.TABLE_NAME,
    }));
    await connection.end();
    return { results };
}
//# sourceMappingURL=GenericFunctions.js.map