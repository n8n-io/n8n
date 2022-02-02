import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type CampaignMap = {
	campaign: 'get' | 'getAll';
};

export type Ads = AllEntities<CampaignMap>;

export type AdsCampaign = Entity<CampaignMap, 'campaign'>;

export type CampaignProperties = PropertiesOf<AdsCampaign>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
