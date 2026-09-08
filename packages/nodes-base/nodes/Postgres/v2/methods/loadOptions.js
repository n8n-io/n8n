import { configurePostgres } from '../../transport';
import { getTableSchema } from '../helpers/utils';
export async function getColumns() {
    const credentials = await this.getCredentials('postgres');
    const options = { nodeVersion: this.getNode().typeVersion };
    const { db } = await configurePostgres.call(this, credentials, options);
    const schema = this.getNodeParameter('schema', 0, {
        extractValue: true,
    });
    const table = this.getNodeParameter('table', 0, {
        extractValue: true,
    });
    const columns = await getTableSchema(db, schema, table);
    return columns.map((column) => ({
        name: column.column_name,
        value: column.column_name,
        description: `Type: ${column.data_type.toUpperCase()}, Nullable: ${column.is_nullable}`,
    }));
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