export interface IActivity {
	title?: string;
	owner?: number;
	type?: string;
	description?: string;
	tags?: string;
	dueDate?: number;
	duration?: number;
	isCalendarInvite?: boolean;
	isCompleted?: boolean;
}
