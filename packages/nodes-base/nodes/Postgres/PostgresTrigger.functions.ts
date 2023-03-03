import type {
	ITriggerFunctions,
	INodeParameterResourceLocator,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';
import { v4 as uuid } from 'uuid';
import type { IPostgresTrigger } from './PostgresInterface';

export async function pgTriggerFunction(
	this: ITriggerFunctions,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	triggers: IPostgresTrigger,
): Promise<IPostgresTrigger> {
	const tableName = this.getNodeParameter('tableName', 0) as INodeParameterResourceLocator;
	const schema = this.getNodeParameter('schema', 0) as INodeParameterResourceLocator;
	const target = (schema.value as string) + '.' + (tableName.value as string);
	const firesOn = this.getNodeParameter('firesOn', 0) as string;
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	let functionName =
		(additionalFields.functionName as string) ||
		`n8n_trigger_function_${uuid().replace(/-/g, '_')}()`;
	if (!functionName.includes('()')) {
		functionName = functionName.concat('()');
	}
	const triggerName =
		(additionalFields.triggerName as string) || `n8n_trigger_${uuid().replace(/-/g, '_')}`;
	const channelName =
		(additionalFields.channelName as string) || `n8n_channel_${uuid().replace(/-/g, '_')}`;
	const replaceIfExists = additionalFields.replaceIfExists || false;
	let createdTrigger: IPostgresTrigger;
	if (!triggers) {
		createdTrigger = {
			functionName,
			triggerName,
			channelName,
			target,
		};
	} else {
		createdTrigger = {
			functionName: triggers.functionName,
			triggerName: triggers.triggerName,
			channelName: triggers.channelName,
			target,
		};
	}
	try {
		if (replaceIfExists) {
			await db.any(
				"CREATE OR REPLACE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json(new)::text); return null; end; $BODY$;",
				[createdTrigger.functionName, createdTrigger.channelName],
			);
			await db.any('DROP TRIGGER IF EXISTS $1:raw ON $2:raw', [triggerName, target]);
			await db.any(
				'CREATE TRIGGER $4:raw AFTER $3:raw ON $1:raw FOR EACH ROW EXECUTE FUNCTION $2:raw',
				[target, createdTrigger.functionName, firesOn, createdTrigger.triggerName],
			);
		} else {
			await db.any(
				"CREATE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json(new)::text); return null; end; $BODY$;",
				[createdTrigger.functionName, createdTrigger.channelName],
			);
			await db.any(
				'CREATE TRIGGER $4:raw AFTER $3:raw ON $1:raw FOR EACH ROW EXECUTE FUNCTION $2:raw',
				[target, createdTrigger.functionName, firesOn, createdTrigger.triggerName],
			);
		}
	} catch (err) {
		throw new Error(err as string);
	}
	return createdTrigger;
}

export async function searchSchema(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('postgres');
	const pgp = pgPromise();

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
	const db = pgp(config);
	const schemaList = await db.any('SELECT schema_name FROM information_schema.schemata');
	const results: INodeListSearchItems[] = schemaList.map((s) => ({
		name: s.schema_name as string,
		value: s.schema_name as string,
	}));
	pgp.end();
	return { results };
}

export async function searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('postgres');
	const schema = this.getNodeParameter('schema', 0) as IDataObject;
	const pgp = pgPromise();

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
	const db = pgp(config);
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
	pgp.end();
	return { results };
}

export async function dropTriggerFunction(
	this: ITriggerFunctions,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	triggers: IPostgresTrigger,
): Promise<void> {
	try {
		await db.any('DROP TRIGGER IF EXISTS $1:raw ON $2:raw', [
			triggers.triggerName,
			triggers.target,
		]);
		await db.any('DROP FUNCTION IF EXISTS $1:raw', [triggers.functionName]);
	} catch (error) {
		throw new Error(error as string);
	}
}
