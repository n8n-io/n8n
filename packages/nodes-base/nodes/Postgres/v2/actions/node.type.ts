import type { AllEntities, Entity } from 'n8n-workflow';

type PostgresMap = {
	database: 'deleteTable' | 'executeQuery' | 'insert' | 'select' | 'update' | 'upsert';
};

export type Postgres = AllEntities<PostgresMap>;

export type PostgresDatabase = Entity<PostgresMap, 'database'>;
