import type { IDataObject } from 'n8n-workflow';

export const AlertStatuses = {
	NEW: 'New',
	UPDATED: 'Updated',
	IGNORED: 'Ignored',
	IMPORTED: 'Imported',
} as const;

export type AlertStatus = (typeof AlertStatuses)[keyof typeof AlertStatuses];

export const TLPs = {
	white: 0,
	green: 1,
	amber: 2,
	red: 3,
} as const;

export type TLP = (typeof TLPs)[keyof typeof TLPs];

export interface IAlert {
	// Required attributes
	id?: string;
	title?: string;
	description?: string;
	severity?: number;
	date?: Date;
	tags?: string[];
	tlp?: TLP;
	status?: AlertStatus;
	type?: string;
	source?: string;
	sourceRef?: string;
	artifacts?: IDataObject[];
	follow?: boolean;

	// Optional attributes
	caseTemplate?: string;

	// Backend generated attributes
	lastSyncDate?: Date;
	case?: string;

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}
