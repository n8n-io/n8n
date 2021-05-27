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

export enum TaskStatus {
	WAITING = 'Waiting',
	INPROGRESS = 'InProgress',
	COMPLETED = 'Completed',
	CANCEL = 'Cancel',
}
