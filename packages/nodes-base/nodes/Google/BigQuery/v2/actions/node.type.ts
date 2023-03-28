import type { AllEntities, Entity } from 'n8n-workflow';

type GoogleBigQueryMap = {
	database: 'executeQuery' | 'insert' | 'getAll';
};

export type GoogleBigQuery = AllEntities<GoogleBigQueryMap>;

export type GoogleBigQueryDatabase = Entity<GoogleBigQueryMap, 'database'>;
