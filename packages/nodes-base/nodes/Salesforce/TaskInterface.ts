export interface ITask {
	TaskSubtype?: string;
	WhoId?: string;
	Status?: string;
	WhatId?: string;
	OwnerId?: string;
	Subject?: string;
	CallType?: string;
	Priority?: string;
	CallObject?: string;
	Description?: string;
	ActivityDate?: string;
	IsReminderSet?: boolean;
	RecurrenceType?: string;
	CallDisposition?: string;
	ReminderDateTime?: string;
	RecurrenceInstance?: string;
	RecurrenceInterval?: number;
	RecurrenceDayOfMonth?: number;
	CallDurationInSeconds?: number;
	RecurrenceEndDateOnly?: string;
	RecurrenceMonthOfYear?: string;
	RecurrenceDayOfWeekMask?: string;
	RecurrenceStartDateOnly?: string;
	RecurrenceTimeZoneSidKey?: string;
	RecurrenceRegeneratedType?: string;
}
