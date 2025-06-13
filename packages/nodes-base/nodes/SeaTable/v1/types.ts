// ----------------------------------
//         sea-table
// ----------------------------------

export type TSeaTableServerVersion = '2.0.6';
export type TSeaTableServerEdition = 'enterprise edition';

// ----------------------------------
//         dtable
// ----------------------------------

import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { IDtableMetadataColumn, IDtableMetadataTable, TDtableViewColumn } from './Interfaces';

export type TInheritColumnTypeTime = 'ctime' | 'mtime';
export type TInheritColumnTypeUser = 'creator' | 'last-modifier';
export type TColumnType =
	| 'text'
	| 'long-text'
	| 'number'
	| 'collaborator'
	| 'date'
	| 'duration'
	| 'single-select'
	| 'multiple-select'
	| 'email'
	| 'url'
	| 'rate'
	| 'checkbox'
	| 'formula'
	| TInheritColumnTypeTime
	| TInheritColumnTypeUser
	| 'auto-number';

type TImplementInheritColumnKey = '_seq';
export type TInheritColumnKey =
	| '_id'
	| '_creator'
	| '_ctime'
	| '_last_modifier'
	| '_mtime'
	| TImplementInheritColumnKey;

export type TColumnValue = undefined | boolean | number | string | string[] | null;
export type TColumnKey = TInheritColumnKey | string;

export type TDtableMetadataTables = readonly IDtableMetadataTable[];
export type TDtableMetadataColumns = readonly IDtableMetadataColumn[];
export type TDtableViewColumns = readonly TDtableViewColumn[];

// ----------------------------------
//         api
// ----------------------------------

export type TEndpointVariableName = 'access_token' | 'dtable_uuid' | 'server';

// Template Literal Types requires-ts-4.1.5 -- deferred
export type TMethod = 'GET' | 'POST';
type TEndpoint =
	| '/api/v2.1/dtable/app-access-token/'
	| '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/';
export type TEndpointExpr = TEndpoint;
export type TEndpointResolvedExpr =
	TEndpoint; /* deferred: but already in use for header values, e.g. authentication */

export type TDateTimeFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ' /* moment.js */;

// ----------------------------------
//         node
// ----------------------------------

export type TCredentials = ICredentialDataDecryptedObject | undefined;

export type TTriggerOperation = 'create' | 'update';

export type TOperation = 'append' | 'list' | 'metadata';

export type TLoadedResource = {
	name: string;
};
export type TColumnsUiValues = Array<{
	columnName: string;
	columnValue: string;
}>;
