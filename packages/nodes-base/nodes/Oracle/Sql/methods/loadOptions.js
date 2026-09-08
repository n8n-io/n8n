import { getColumnMetaData } from '../helpers/utils';
import { configureOracleDB } from '../transport';
export async function getColumns() {
    const credentials = await this.getCredentials('oracleDBApi');
    const options = { nodeVersion: this.getNode().typeVersion };
    const pool = await configureOracleDB.call(this, credentials, options);
    const schema = this.getNodeParameter('schema', 0, {
        extractValue: true,
    });
    const table = this.getNodeParameter('table', 0, {
        extractValue: true,
    });
    const columns = await getColumnMetaData(this.getNode(), pool, schema, table);
    return columns.map((column) => ({
        name: column.columnName,
        value: column.columnName,
        description: `Type: ${column.dataType.toUpperCase()}, Nullable: ${column.isNullable}`,
    }));
}
export async function getColumnsMultiOptions() {
    const returnData = await getColumns.call(this);
    const returnAll = { name: '*', value: '*', description: 'All columns' };
    return [returnAll, ...returnData];
}
//# sourceMappingURL=loadOptions.js.map