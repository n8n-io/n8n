import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import mysql from 'mysql2/promise';

let dbConnection: mysql.Connection | null = null;

export async function getDbConnection(): Promise<mysql.Connection> {
	if (!dbConnection) {
		const globalConfig = Container.get(GlobalConfig);
		const dbConfig = globalConfig.database['mysqldb'];
		dbConnection = await mysql.createConnection(dbConfig);

		console.log('✅ Database connection established');
	} else {
		console.log('♻️ Reusing existing database connection');
	}
	return dbConnection;
}
