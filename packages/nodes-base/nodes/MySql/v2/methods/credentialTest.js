import { createPool } from '../transport';
export async function mysqlConnectionTest(credential) {
    const credentials = credential.data;
    const pool = await createPool.call(this, credentials);
    try {
        const connection = await pool.getConnection();
        connection.release();
    }
    catch (error) {
        return {
            status: 'Error',
            message: error.message,
        };
    }
    finally {
        await pool.end();
    }
    return {
        status: 'OK',
        message: 'Connection successful!',
    };
}
//# sourceMappingURL=credentialTest.js.map