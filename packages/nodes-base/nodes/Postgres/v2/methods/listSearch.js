import { configurePostgres } from '../../transport';
export async function schemaSearch() {
    const credentials = await this.getCredentials('postgres');
    const options = { nodeVersion: this.getNode().typeVersion };
    const { db } = await configurePostgres.call(this, credentials, options);
    const response = await db.any('SELECT schema_name FROM information_schema.schemata ORDER BY schema_name');
    return {
        results: response.map((schema) => ({
            name: schema.schema_name,
            value: schema.schema_name,
        })),
    };
}
export async function tableSearch() {
    const credentials = await this.getCredentials('postgres');
    const options = { nodeVersion: this.getNode().typeVersion };
    const { db } = await configurePostgres.call(this, credentials, options);
    const schema = this.getNodeParameter('schema', 0, {
        extractValue: true,
    });
    const response = await db.any('SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name', [schema]);
    return {
        results: response.map((table) => ({
            name: table.table_name,
            value: table.table_name,
        })),
    };
}
//# sourceMappingURL=listSearch.js.map