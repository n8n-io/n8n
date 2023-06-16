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

export const enum CaseStatus {
	OPEN = 'Open',
	RESOLVED = 'Resolved',
	DELETED = 'Deleted',
}

export const enum CaseResolutionStatus {
	INDETERMINATE = 'Indeterminate',
	FALSEPOSITIVE = 'FalsePositive',
	TRUEPOSITIVE = 'TruePositive',
	OTHER = 'Other',
	DUPLICATED = 'Duplicated',
}

export const enum CaseImpactStatus {
	NOIMPACT = 'NoImpact',
	WITHIMPACT = 'WithImpact',
	NOTAPPLICABLE = 'NotApplicable',
}
