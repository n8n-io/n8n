import { configureOracleDB } from '../transport';
export async function oracleDBConnectionTest(credential) {
    const credentials = credential.data;
    let pool;
    try {
        pool = await configureOracleDB.call(this, credentials, {});
        const conn = await pool.getConnection();
        await conn.close();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            status: 'Error',
            message,
        };
    }
    return {
        status: 'OK',
        message: 'Connection successful!',
    };
}
//# sourceMappingURL=credentialTest.js.map