// Copyright (c) 2025, Oracle and/or its affiliates.

import type { AllEntities, Entity } from 'n8n-workflow';

type OracleDBMap = {
	database: 'deleteTable' | 'execute' | 'insert' | 'select' | 'update' | 'upsert';
};

export type OracleDBType = AllEntities<OracleDBMap>;

export type OracleDatabaseType = Entity<OracleDBMap, 'database'>;
