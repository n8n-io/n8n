import type {
	ITriggerFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';

import { configurePostgres } from './transport';
import type { PgpDatabase, PostgresNodeCredentials } from './v2/helpers/interfaces';

const postgresIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const triggerEvents = ['INSERT', 'UPDATE', 'DELETE'] as const;

type TriggerEvent = (typeof triggerEvents)[number];

export function validatePostgresIdentifier(
	name: unknown,
	parameterName: string,
): asserts name is string {
	if (typeof name !== 'string' || !postgresIdentifierRegex.test(name)) {
		throw new UserError(
			`${parameterName} must start with a letter or underscore and contain only letters, digits, and underscores`,
			{ level: 'warning' },
		);
	}
}

function getTriggerEvent(firesOn: string): TriggerEvent {
	if (triggerEvents.includes(firesOn as TriggerEvent)) {
		return firesOn as TriggerEvent;
	}

	throw new UserError('Event must be Insert, Update, or Delete', { level: 'warning' });
}

export function prepareNames(id: string, mode: string, additionalFields: IDataObject) {
	let suffix = id.replace(/-/g, '_');

	if (mode === 'manual') {
		suffix = `${suffix}_manual`;
	}

	let functionName = (additionalFields.functionName as string) || `n8n_trigger_function_${suffix}`;

	if (typeof functionName === 'string' && functionName.endsWith('()')) {
		functionName = functionName.slice(0, -2);
	}

	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${suffix}`;
	const channelName = (additionalFields.channelName as string) || `n8n_channel_${suffix}`;

	validatePostgresIdentifier(functionName, 'Function name');
	validatePostgresIdentifier(triggerName, 'Trigger name');
	validatePostgresIdentifier(channelName, 'Channel name');

	return { functionName, triggerName, channelName };
}

export async function pgTriggerFunction(
	this: ITriggerFunctions,
	db: PgpDatabase,
	additionalFields: IDataObject,
	functionName: string,
	triggerName: string,
	channelName: string,
): Promise<void> {
	const schema = this.getNodeParameter('schema', 'public', { extractValue: true }) as string;
	const tableName = this.getNodeParameter('tableName', undefined, {
		extractValue: true,
	}) as string;

	const firesOn = getTriggerEvent(this.getNodeParameter('firesOn', 0) as string);
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
	} else {
		await db.any(functionExists, [functionName, channelName]);
	}
	await db.any(trigger, [schema, tableName, triggerName, functionName]);
}

export async function initDB(this: ITriggerFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
	const options = this.getNodeParameter('options', {}) as {
		connectionTimeout?: number;
		delayClosingIdleConnection?: number;
	};
	return await configurePostgres.call(this, credentials, options);
}

export async function searchSchema(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const { db } = await initDB.call(this);
	const schemaList = await db.any('SELECT schema_name FROM information_schema.schemata');
	const results: INodeListSearchItems[] = (schemaList as IDataObject[]).map((s) => ({
		name: s.schema_name as string,
		value: s.schema_name as string,
	}));
	return { results };
}

export async function searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const schema = this.getNodeParameter('schema', 0) as IDataObject;
	const { db } = await initDB.call(this);
	let tableList = [];
	try {
		tableList = await db.any(
			'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
			[schema.value],
		);
	} catch (error) {
		throw new OperationalError(error as string);
	}
	const results: INodeListSearchItems[] = (tableList as IDataObject[]).map((s) => ({
		name: s.table_name as string,
		value: s.table_name as string,
	}));
	return { results };
}
