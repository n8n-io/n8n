import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type CampaignMap = {
	campaign: 'get' | 'getAll' | 'custom';
};
type UserListMap = {
	userList: 'addUser' | 'create' | 'custom' |'get' | 'getAll' | 'removeUser';
};

export type Ads = AllEntities<CampaignMap | UserListMap>;

export type AdsCampaign = Entity<CampaignMap, 'campaign'>;
export type AdsUserList = Entity<UserListMap, 'userList'>;

export type CampaignProperties = PropertiesOf<AdsCampaign>;
export type UserListProperties = PropertiesOf<AdsUserList>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
