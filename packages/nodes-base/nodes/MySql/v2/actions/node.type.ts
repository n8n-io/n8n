import type { AllEntities, Entity } from 'n8n-workflow';

type MySQLMap = {
	database: 'executeQuery' | 'insert' | 'update';
};

export type MySQLType = AllEntities<MySQLMap>;

export type MySQLDatabaseType = Entity<MySQLMap, 'database'>;
