export interface OnfleetRecipient {
	name?: string;
	phone?: string;
	notes?: string;
	skipSMSNotifications?: boolean;
	skipPhoneNumberValidation?: boolean;
}

export interface OnfleetDestinationAddress {
	name?: string;
	number?: string;
	street?: string;
	apartment?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
	unparsed?: string;
}

export interface OnfleetDestinationOptions {
	language?: string;
}

export interface OnfleetDestination {
	address: OnfleetDestinationAddress;
	location?: [number, number];
	notes?: string;
	options?: OnfleetDestinationOptions;
}

export interface OnfleetTask {
	merchant?: string;
	executor?: string;
	destination: OnfleetDestination;
	recipients: OnfleetRecipient[];
	completeAfter?: number;
	completeBefore?: number;
	pickupTask?: boolean;
	notes?: string;
	quantity?: number;
	serviceTime?: number;
}

export interface OnfleetTaskUpdate {
	merchant?: string;
	executor?: string;
	completeAfter?: number;
	completeBefore?: number;
	pickupTask?: boolean;
	notes?: string;
	quantity?: number;
	serviceTime?: number;
}

export interface OnfleetListTaskFilters {
	from?: number;
	to?: number;
	lastId?: string;
	state?: string;
	worker?: string;
	completeBeforeBefore?: number;
	completeAfterAfter?: number;
	dependencies?: string;
}

export interface OnfleetCloneOverrideTaskOptions {
	completeAfter?: number;
	completeBefore?: number;
	destination?: OnfleetDestination;
	notes?: string;
	pickupTask?: boolean;
	recipients?: OnfleetRecipient[];
	serviceTime?: number;
}

export interface OnfleetCloneTaskOptions {
	includeMetadata?: boolean;
	includeBarcodes?: boolean;
	includeDependencies?: boolean;
	overrides?: OnfleetCloneOverrideTaskOptions;
}

export interface OnfleetCloneTask {
	options?: OnfleetCloneTaskOptions;
}

export interface OnfleetTaskCompletionDetails {
	success: boolean;
	notes?: string;
}

export interface OnfleetTaskComplete {
	completionDetails: OnfleetTaskCompletionDetails;
}

export interface OnfleetAdmins {
	name?: string;
	email?: string;
	phone?: string;
	isReadOnly?: boolean;
}

export interface OnfleetHubs extends OnfleetDestination {
	name?: string;
	teams?: string[];
}

export interface OnfleetVehicle {
	type?: string;
	description?: string;
	licensePlate?: string;
	color?: string;
}

export interface OnfleetWorker {
	name?: string;
	phone?: string;
	vehicle?: OnfleetVehicle;
	teams?: string[];
	capacity?: number;
	displayName?: string;
}

export interface OnfleetWorkerFilter {
	[key: string]: string | undefined;
	filter?: string;
	teams?: string;
	states?: string;
	phones?: string;
	analytics?: string;
}

export interface OnfleetWorkerScheduleEntry {
	date?: string;
	timezone?: string;
	shifts?: [[number, number]];
}

export interface OnfleetWebhook {
	url?: string;
	name?: string;
	trigger?: number;
	threshold?: number;
}

export interface OnfleetTeams {
	name?: string;
	workers?: string[];
	managers?: string[];
	hub?: string;
	enableSelfAssignment?: boolean;
}

export interface OnfleetWorkerSchedule {
	entries: OnfleetWorkerScheduleEntry[];
}

export interface OnfleetWebhookMapping {
	key: number;
	name: string;
	value: string;
}

export interface OnfleetWebhooksMapping {
	[key: string]: OnfleetWebhookMapping;
}

export interface OnfleetWorkerEstimates {
	dropoffLocation?: string;
	pickupLocation?: string;
	pickupTime?: number;
	restrictedVehicleTypes?: string;
	serviceTime?: number;
}

export interface OnfleetTeamAutoDispatch {
	maxTasksPerRoute?: number;
	taskTimeWindow?: [number, number];
	scheduleTimeWindow?: [number, number];
	serviceTime?: number;
	routeEnd?: string;
	maxAllowedDelay?: number;
}
