import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import mysql from 'mysql2/promise';

let dbPool: mysql.Pool | null = null;

export async function getDbConnection(): Promise<mysql.PoolConnection> {
	if (!dbPool) {
		const globalConfig = Container.get(GlobalConfig);
		const dbConfig = globalConfig.database['mysqldb'];

		dbPool = mysql.createPool({
			...dbConfig,
			waitForConnections: true,
			connectionLimit: 10, // Max number of connections in pool
			queueLimit: 0,
			connectTimeout: 10000, // 10 seconds
		});

		console.log('✅ Database pool created');
	}

	console.log('♻️ Reusing connection from pool');
	return dbPool.getConnection();
}
