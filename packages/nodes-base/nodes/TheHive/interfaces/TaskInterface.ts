export interface ITask {
	// Required attributes
	id?: string;
	title?: string;
	status?: TaskStatus;
	flag?: boolean;
	// Optional attributes
	owner?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date;
	// Backend generated attributes

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}

export const TaskStatuses = {
	WAITING: 'Waiting',
	INPROGRESS: 'InProgress',
	COMPLETED: 'Completed',
	CANCEL: 'Cancel',
} as const;

export type TaskStatus = (typeof TaskStatuses)[keyof typeof TaskStatuses];
