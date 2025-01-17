import { ApplicationError } from 'n8n-workflow';
import type {
	ITriggerFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';

import { configurePostgres } from './transport';
import type { PgpDatabase, PostgresNodeCredentials } from './v2/helpers/interfaces';

export function prepareNames(id: string, mode: string, additionalFields: IDataObject) {
	let suffix = id.replace(/-/g, '_');

	if (mode === 'manual') {
		suffix = `${suffix}_manual`;
	}

	let functionName =
		(additionalFields.functionName as string) || `n8n_trigger_function_${suffix}()`;

	if (!(functionName.includes('(') && functionName.includes(')'))) {
		functionName = `${functionName}()`;
	}

	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${suffix}`;
	const channelName = (additionalFields.channelName as string) || `n8n_channel_${suffix}`;

	if (channelName.includes('-')) {
		throw new ApplicationError('Channel name cannot contain hyphens (-)', { level: 'warning' });
	}

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

	const target = `${schema}."${tableName}"`;

	const firesOn = this.getNodeParameter('firesOn', 0) as string;

	const functionReplace =
		"CREATE OR REPLACE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json($3:raw)::text); return null; end; $BODY$;";

	const dropIfExist = 'DROP TRIGGER IF EXISTS $1:raw ON $2:raw';

	const functionExists =
		"CREATE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json($3:raw)::text); return null; end; $BODY$";

	const trigger =
		'CREATE TRIGGER $4:raw AFTER $3:raw ON $1:raw FOR EACH ROW EXECUTE FUNCTION $2:raw';

	const whichData = firesOn === 'DELETE' ? 'old' : 'new';

	if (channelName.includes('-')) {
		throw new ApplicationError('Channel name cannot contain hyphens (-)', { level: 'warning' });
	}

	const replaceIfExists = additionalFields.replaceIfExists ?? false;

	try {
		if (replaceIfExists || !(additionalFields.triggerName ?? additionalFields.functionName)) {
			await db.any(functionReplace, [functionName, channelName, whichData]);
			await db.any(dropIfExist, [triggerName, target, whichData]);
		} else {
			await db.any(functionExists, [functionName, channelName, whichData]);
		}
		await db.any(trigger, [target, functionName, firesOn, triggerName]);
	} catch (error) {
		if ((error as Error).message.includes('near "-"')) {
			throw new ApplicationError('Names cannot contain hyphens (-)', { level: 'warning' });
		}
		throw error;
	}
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
		throw new ApplicationError(error as string);
	}
	const results: INodeListSearchItems[] = (tableList as IDataObject[]).map((s) => ({
		name: s.table_name as string,
		value: s.table_name as string,
	}));
	return { results };
}
