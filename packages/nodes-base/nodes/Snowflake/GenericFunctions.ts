import pick from 'lodash/pick';
import type snowflake from 'snowflake-sdk';

const commonConnectionFields = [
	'account',
	'database',
	'schema',
	'warehouse',
	'role',
	'clientSessionKeepAlive',
] as const;

export type SnowflakeCredential = Pick<
	snowflake.ConnectionOptions,
	(typeof commonConnectionFields)[number]
> &
	(
		| {
				authentication: 'password';
				username?: string;
				password?: string;
		  }
		| {
				authentication: 'keyPair';
				privateKey: string;
		  }
	);

export const getConnectionOptions = (credential: SnowflakeCredential) => {
	const connectionOptions: snowflake.ConnectionOptions = pick(credential, commonConnectionFields);
	if (credential.authentication === 'keyPair') {
		connectionOptions.authenticator = 'SNOWFLAKE_JWT';
		connectionOptions.privateKey = credential.privateKey;
	} else {
		connectionOptions.username = credential.username;
		connectionOptions.password = credential.password;
	}
	return connectionOptions;
};

export async function connect(conn: snowflake.Connection) {
	return await new Promise<void>((resolve, reject) => {
		conn.connect((error) => (error ? reject(error) : resolve()));
	});
}

export async function destroy(conn: snowflake.Connection) {
	return await new Promise<void>((resolve, reject) => {
		conn.destroy((error) => (error ? reject(error) : resolve()));
	});
}

export async function execute(
	conn: snowflake.Connection,
	sqlText: string,
	binds: snowflake.InsertBinds,
) {
	return await new Promise<any[] | undefined>((resolve, reject) => {
		conn.execute({
			sqlText,
			binds,
			complete: (error, _, rows) => (error ? reject(error) : resolve(rows)),
		});
	});
}
