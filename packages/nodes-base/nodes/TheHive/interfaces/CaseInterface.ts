import type { IDataObject } from 'n8n-workflow';

import type { TLP } from './AlertInterface';
export interface ICase {
	// Required attributes
	id?: string;
	title?: string;
	description?: string;
	severity?: number;
	startDate?: Date;
	owner?: string;
	flag?: boolean;
	tlp?: TLP;
	tags?: string[];

	// Optional attributes
	resolutionStatus?: CaseResolutionStatus;
	impactStatus?: CaseImpactStatus;
	summary?: string;
	endDate?: Date;
	metrics?: IDataObject;

	// Backend generated attributes
	status?: CaseStatus;
	caseId?: number; // auto-generated attribute
	mergeInto?: string;
	mergeFrom?: string[];

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}

export const CaseStatuses = {
	OPEN: 'Open',
	RESOLVED: 'Resolved',
	DELETED: 'Deleted',
} as const;

export type CaseStatus = (typeof CaseStatuses)[keyof typeof CaseStatuses];

export const CaseResolutionStatuses = {
	INDETERMINATE: 'Indeterminate',
	FALSEPOSITIVE: 'FalsePositive',
	TRUEPOSITIVE: 'TruePositive',
	OTHER: 'Other',
	DUPLICATED: 'Duplicated',
} as const;

export type CaseResolutionStatus =
	(typeof CaseResolutionStatuses)[keyof typeof CaseResolutionStatuses];

export const CaseImpactStatuses = {
	NOIMPACT: 'NoImpact',
	WITHIMPACT: 'WithImpact',
	NOTAPPLICABLE: 'NotApplicable',
} as const;

export type CaseImpactStatus = (typeof CaseImpactStatuses)[keyof typeof CaseImpactStatuses];
