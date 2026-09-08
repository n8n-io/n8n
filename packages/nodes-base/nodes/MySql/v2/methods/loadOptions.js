import { escapeSqlIdentifier } from '../helpers/utils';
import { createPool } from '../transport';
export async function getColumns() {
    const credentials = await this.getCredentials('mySql');
    const nodeOptions = this.getNodeParameter('options', 0);
    const pool = await createPool.call(this, credentials, nodeOptions);
    try {
        const connection = await pool.getConnection();
        const table = this.getNodeParameter('table', 0, {
            extractValue: true,
        });
        const columns = (await connection.query(`SHOW COLUMNS FROM ${escapeSqlIdentifier(table)} FROM ${escapeSqlIdentifier(credentials.database)}`))[0];
        connection.release();
        return (columns || []).map((column) => ({
            name: column.Field,
            value: column.Field,
            // eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
            description: `type: ${column.Type.toUpperCase()}, nullable: ${column.Null}`,
        }));
    }
    finally {
        await pool.end();
    }
}
export async function getColumnsMultiOptions() {
    const returnData = await getColumns.call(this);
    const returnAll = { name: '*', value: '*', description: 'All columns' };
    return [returnAll, ...returnData];
}
export async function getColumnsWithoutColumnToMatchOn() {
    const columnToMatchOn = this.getNodeParameter('columnToMatchOn');
    const returnData = await getColumns.call(this);
    return returnData.filter((column) => column.value !== columnToMatchOn);
}
//# sourceMappingURL=loadOptions.js.map