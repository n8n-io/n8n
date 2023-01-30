import type { AllEntities, Entity } from 'n8n-workflow';

type GoogleBigQueryMap = {
	record: 'create' | 'getAll';
	query: 'executeQuery';
};

export type GoogleBigQuery = AllEntities<GoogleBigQueryMap>;

export type GoogleBigQueryRecord = Entity<GoogleBigQueryMap, 'record'>;
export type GoogleBigQueryQuery = Entity<GoogleBigQueryMap, 'query'>;
