export interface IOpportunity {
	// tslint:disable-next-line: no-any
	[key: string]: any;
	Name?: string;
	StageName?: string;
	CloseDate?: string;
	Type?: string;
	Amount?: number;
	OwnerId?: string;
	NextStep?: string;
	AccountId?: string;
	CampaignId?: string;
	LeadSource?: string;
	Description?: string;
	Probability?: number;
	Pricebook2Id?: string;
	ForecastCategoryName?: string;
}
