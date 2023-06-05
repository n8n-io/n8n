import type {
	ITriggerFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';

export async function pgTriggerFunction(
	this: ITriggerFunctions,
	db: pgPromise.IDatabase<{}, pg.IClient>,
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
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const nodeId = this.getNode().id.replace(/-/g, '_');
	let functionName =
		(additionalFields.functionName as string) || `n8n_trigger_function_${nodeId}()`;
	if (!functionName.includes('()')) {
		functionName = functionName.concat('()');
	}
	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${nodeId}`;
	const channelName = (additionalFields.channelName as string) || `n8n_channel_${nodeId}`;
	if (channelName.includes('-')) {
		throw new Error('Channel name cannot contain hyphens (-)');
	}
	const replaceIfExists = additionalFields.replaceIfExists || false;
	try {
		if (replaceIfExists || !(additionalFields.triggerName || additionalFields.functionName)) {
			await db.any(functionReplace, [functionName, channelName, whichData]);
			await db.any(dropIfExist, [triggerName, target, whichData]);
		} else {
			await db.any(functionExists, [functionName, channelName, whichData]);
		}
		await db.any(trigger, [target, functionName, firesOn, triggerName]);
	} catch (err) {
		if (err.message.includes('near "-"')) {
			throw new Error('Names cannot contain hyphens (-)');
		}
		throw new Error(err as string);
	}
}

export async function initDB(this: ITriggerFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('postgres');
	const pgp = pgPromise({
		// prevent spam in console "WARNING: Creating a duplicate database object for the same connection."
		noWarnings: true,
	});
	const config: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (credentials.allowUnauthorizedCerts === true) {
		config.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		config.sslmode = (credentials.ssl as string) || 'disable';
	}
	return pgp(config);
}

export async function searchSchema(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const db = await initDB.call(this);
	const schemaList = await db.any('SELECT schema_name FROM information_schema.schemata');
	const results: INodeListSearchItems[] = schemaList.map((s) => ({
		name: s.schema_name as string,
		value: s.schema_name as string,
	}));
	await db.$pool.end();
	return { results };
}

export async function searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const schema = this.getNodeParameter('schema', 0) as IDataObject;
	const db = await initDB.call(this);
	let tableList = [];
	try {
		tableList = await db.any(
			'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
			[schema.value],
		);
	} catch (error) {
		throw new Error(error as string);
	}
	const results: INodeListSearchItems[] = tableList.map((s) => ({
		name: s.table_name as string,
		value: s.table_name as string,
	}));
	await db.$pool.end();
	return { results };
}

export async function dropTriggerFunction(
	this: ITriggerFunctions,
	db: pgPromise.IDatabase<{}, pg.IClient>,
): Promise<void> {
	const schema = this.getNodeParameter('schema', undefined, { extractValue: true }) as string;
	const tableName = this.getNodeParameter('tableName', undefined, {
		extractValue: true,
	}) as string;
	const target = `${schema}."${tableName}"`;
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const nodeId = this.getNode().id.replace(/-/g, '_');
	let functionName =
		(additionalFields.functionName as string) || `n8n_trigger_function_${nodeId}()`;
	if (!functionName.includes('()')) {
		functionName = functionName.concat('()');
	}
	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${nodeId}`;
	try {
		await db.any('DROP FUNCTION IF EXISTS $1:raw CASCADE', [functionName]);
		await db.any('DROP TRIGGER IF EXISTS $1:raw ON $2:raw CASCADE', [triggerName, target]);
	} catch (error) {
		throw new Error(error as string);
	}
}
