// ----------------------------------
//         sea-table
// ----------------------------------

type TSeaTableServerVersion = '2.0.6';
type TSeaTableServerEdition = 'enterprise edition';

// ----------------------------------
//         dtable
// ----------------------------------

import { IDtableMetadataColumn, IDtableMetadataTable, TDtableViewColumn } from './Interfaces';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';

type TInheritColumnTypeTime = 'ctime' | 'mtime';
type TInheritColumnTypeUser = 'creator' | 'last-modifier';
type TColumnType =
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
type TInheritColumnKey =
	| '_id'
	| '_creator'
	| '_ctime'
	| '_last_modifier'
	| '_mtime'
	| TImplementInheritColumnKey;

type TColumnValue = undefined | boolean | number | string | string[] | null;
type TColumnKey = TInheritColumnKey | string;

export type TDtableMetadataTables = readonly IDtableMetadataTable[];
export type TDtableMetadataColumns = readonly IDtableMetadataColumn[];
export type TDtableViewColumns = readonly TDtableViewColumn[];

// ----------------------------------
//         api
// ----------------------------------

type TEndpointVariableName = 'access_token' | 'dtable_uuid' | 'server';

// Template Literal Types requires-ts-4.1.5 -- deferred
type TMethod = 'GET' | 'POST';
type TDeferredEndpoint = string;
type TDeferredEndpointExpr = string;
type TEndpoint =
	| '/api/v2.1/dtable/app-access-token/'
	| '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/'
	| TDeferredEndpoint;
type TEndpointExpr = TEndpoint | TDeferredEndpointExpr;
type TEndpointResolvedExpr =
	| TEndpoint
	| string; /* deferred: but already in use for header values, e.g. authentication */

type TDateTimeFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ' /* moment.js */;

// ----------------------------------
//         node
// ----------------------------------

type TCredentials = ICredentialDataDecryptedObject | undefined;

type TTriggerOperation = 'create' | 'update';

type TOperation = 'append' | 'list' | 'metadata';

type TLoadedResource = {
	name: string;
};
export type TColumnsUiValues = Array<{
	columnName: string;
	columnValue: string;
}>;
