import type { AllEntities, Entity } from 'n8n-workflow';

type GoogleBigQueryMap = {
	database: 'executeQuery' | 'create' | 'getAll';
};

export type GoogleBigQuery = AllEntities<GoogleBigQueryMap>;

export type GoogleBigQueryDatabase = Entity<GoogleBigQueryMap, 'database'>;
