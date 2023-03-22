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

export async function pgTriggerFunction(
	this: ITriggerFunctions,
	db: pgPromise.IDatabase<{}, pg.IClient>,
): Promise<void> {
	const tableName = this.getNodeParameter('tableName', 0) as INodeParameterResourceLocator;
	const schema = this.getNodeParameter('schema', 0) as INodeParameterResourceLocator;
	const target = `${schema.value as string}."${tableName.value as string}"`;
	const firesOn = this.getNodeParameter('firesOn', 0) as string;
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const nodeId = this.getNode().id.replace(/-/g, '_');
	let functionName =
		(additionalFields.functionName as string) || `n8n_trigger_function_${nodeId}()`;
	if (!functionName.includes('()')) {
		functionName = functionName.concat('()');
	}
	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${nodeId}`;
	const channelName = (additionalFields.channelName as string) || `n8n_channel_${nodeId}`;
	const replaceIfExists = additionalFields.replaceIfExists || false;
	try {
		if (replaceIfExists) {
			await db.any(
				"CREATE OR REPLACE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json(new)::text); return null; end; $BODY$;",
				[functionName, channelName],
			);
			await db.any('DROP TRIGGER IF EXISTS $1:raw ON $2:raw', [triggerName, target]);
			await db.any(
				'CREATE TRIGGER $4:raw AFTER $3:raw ON $1:raw FOR EACH ROW EXECUTE FUNCTION $2:raw',
				[target, functionName, firesOn, triggerName],
			);
		} else {
			await db.any(
				"CREATE FUNCTION $1:raw RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('$2:raw', row_to_json(new)::text); return null; end; $BODY$;",
				[functionName, channelName],
			);
			await db.any(
				'CREATE TRIGGER $4:raw AFTER $3:raw ON $1:raw FOR EACH ROW EXECUTE FUNCTION $2:raw',
				[target, functionName, firesOn, triggerName],
			);
		}
	} catch (err) {
		throw new Error(err as string);
	}
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
): Promise<void> {
	const schema = this.getNodeParameter('schema', 0, { extractValue: true }) as IDataObject;
	const tableName = this.getNodeParameter('tableName', 0, { extractValue: true }) as IDataObject;
	const target = `${schema.value as string}."${tableName.value as string}"`;
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const nodeId = this.getNode().id.replace(/-/g, '_');
	let functionName =
		(additionalFields.functionName as string) || `n8n_trigger_function_${nodeId}()`;
	if (!functionName.includes('()')) {
		functionName = functionName.concat('()');
	}
	const triggerName = (additionalFields.triggerName as string) || `n8n_trigger_${nodeId}`;
	try {
		await db.any('DROP TRIGGER IF EXISTS $1:raw ON $2:raw', [triggerName, target]);
		await db.any('DROP FUNCTION IF EXISTS $1:raw', [functionName]);
	} catch (error) {
		throw new Error(error as string);
	}
}
