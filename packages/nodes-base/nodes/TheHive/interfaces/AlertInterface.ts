import type { IDataObject } from 'n8n-workflow';
export const enum AlertStatus {
	NEW = 'New',
	UPDATED = 'Updated',
	IGNORED = 'Ignored',
	IMPORTED = 'Imported',
}
export const enum TLP {
	white,
	green,
	amber,
	red,
}

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
