interface IDate {
	year: number;
	month: number;
	day: number;
}

interface ITimeOfDay {
	hours: number;
	minutes: number;
	seconds: number;
	nanos: number;
}

export interface ITimeInterval {
	startDate: IDate;
	startTime: ITimeOfDay;
	endDate: IDate;
	endTime: ITimeOfDay;
}

export interface IReviewReply {
	comment: string;
}
