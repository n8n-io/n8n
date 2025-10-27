import type { IAttachment } from './ObservableInterface';

export const LogStatuses = {
	OK: 'Ok',
	DELETED: 'Deleted',
} as const;

export type LogStatus = (typeof LogStatuses)[keyof typeof LogStatuses];

export interface ILog {
	// Required attributes
	id?: string;
	message?: string;
	startDate?: Date;
	status?: LogStatus;

	// Optional attributes
	attachment?: IAttachment;

	// Backend generated attributes

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}
