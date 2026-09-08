import { OperationalError, UserError } from 'n8n-workflow';
import { configurePostgres } from './transport';
const postgresIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const triggerEvents = ['INSERT', 'UPDATE', 'DELETE'];
export function validatePostgresIdentifier(name, parameterName) {
    if (typeof name !== 'string' || !postgresIdentifierRegex.test(name)) {
        throw new UserError(`${parameterName} must start with a letter or underscore and contain only letters, digits, and underscores`, { level: 'warning' });
    }
}
function getTriggerEvent(firesOn) {
    if (triggerEvents.includes(firesOn)) {
        return firesOn;
    }
    throw new UserError('Event must be Insert, Update, or Delete', { level: 'warning' });
}
export function prepareNames(id, mode, additionalFields) {
    let suffix = id.replace(/-/g, '_');
    if (mode === 'manual') {
        suffix = `${suffix}_manual`;
    }
    let functionName = additionalFields.functionName || `n8n_trigger_function_${suffix}`;
    if (typeof functionName === 'string' && functionName.endsWith('()')) {
        functionName = functionName.slice(0, -2);
    }
    const triggerName = additionalFields.triggerName || `n8n_trigger_${suffix}`;
    const channelName = additionalFields.channelName || `n8n_channel_${suffix}`;
    validatePostgresIdentifier(functionName, 'Function name');
    validatePostgresIdentifier(triggerName, 'Trigger name');
    validatePostgresIdentifier(channelName, 'Channel name');
    return { functionName, triggerName, channelName };
}
export async function pgTriggerFunction(db, additionalFields, functionName, triggerName, channelName) {
    const schema = this.getNodeParameter('schema', 'public', { extractValue: true });
    const tableName = this.getNodeParameter('tableName', undefined, {
        extractValue: true,
    });
    const firesOn = getTriggerEvent(this.getNodeParameter('firesOn', 0));
    const rowRecord = firesOn === 'DELETE' ? 'OLD' : 'NEW';
    // Identifiers use :name (double-quote escaped); the channel is bound as a text
    // value to pg_notify, and the event/row-record are validated keywords.
    const functionBody = `$1:name() RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify($2, row_to_json(${rowRecord})::text); return null; end; $BODY$`;
    const functionReplace = `CREATE OR REPLACE FUNCTION ${functionBody};`;
    const functionExists = `CREATE FUNCTION ${functionBody}`;
    const dropIfExist = 'DROP TRIGGER IF EXISTS $1:name ON $2:name.$3:name';
    const trigger = `CREATE TRIGGER $3:name AFTER ${firesOn} ON $1:name.$2:name FOR EACH ROW EXECUTE FUNCTION $4:name()`;
    const replaceIfExists = additionalFields.replaceIfExists ?? false;
    if (replaceIfExists || !(additionalFields.triggerName ?? additionalFields.functionName)) {
        await db.any(functionReplace, [functionName, channelName]);
        await db.any(dropIfExist, [triggerName, schema, tableName]);
    }
    else {
        await db.any(functionExists, [functionName, channelName]);
    }
    await db.any(trigger, [schema, tableName, triggerName, functionName]);
}
export async function initDB() {
    const credentials = await this.getCredentials('postgres');
    const options = this.getNodeParameter('options', {});
    return await configurePostgres.call(this, credentials, options);
}
export async function searchSchema() {
    const { db } = await initDB.call(this);
    const schemaList = await db.any('SELECT schema_name FROM information_schema.schemata');
    const results = schemaList.map((s) => ({
        name: s.schema_name,
        value: s.schema_name,
    }));
    return { results };
}
export async function searchTables() {
    const schema = this.getNodeParameter('schema', 0);
    const { db } = await initDB.call(this);
    let tableList = [];
    try {
        tableList = await db.any('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', [schema.value]);
    }
    catch (error) {
        throw new OperationalError(error);
    }
    const results = tableList.map((s) => ({
        name: s.table_name,
        value: s.table_name,
    }));
    return { results };
}
//# sourceMappingURL=PostgresTrigger.functions.js.map