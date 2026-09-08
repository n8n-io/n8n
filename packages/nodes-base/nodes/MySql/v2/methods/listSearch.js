import { createPool } from '../transport';
export async function searchTables(filter) {
    const credentials = await this.getCredentials('mySql');
    const nodeOptions = this.getNodeParameter('options', 0);
    const pool = await createPool.call(this, credentials, nodeOptions);
    try {
        const connection = await pool.getConnection();
        let query = 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ?';
        const values = [credentials.database];
        if (filter) {
            query += ' AND TABLE_NAME LIKE ?';
            values.push(`%${filter}%`);
        }
        const formatedQuery = connection.format(query, values);
        const response = (await connection.query(formatedQuery))[0];
        connection.release();
        const results = response.map((table) => ({
            name: table.table_name || table.TABLE_NAME,
            value: table.table_name || table.TABLE_NAME,
        }));
        return { results };
    }
    finally {
        await pool.end();
    }
}
//# sourceMappingURL=listSearch.js.map