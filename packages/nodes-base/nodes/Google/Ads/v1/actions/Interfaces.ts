import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type CampaignMap = {
	campaign: 'get' | 'getAll';
};
type UserListMap = {
	userList: 'addUser' | 'create' | 'deleteOpr' | 'get' | 'getAll' | 'removeUser' | 'update';
};
type SearchMap = {
	search: 'search' | 'searchStream';
};

export type Ads = AllEntities<CampaignMap | UserListMap | SearchMap>;

export type AdsCampaign = Entity<CampaignMap, 'campaign'>;
export type AdsUserList = Entity<UserListMap, 'userList'>;
export type AdsSearch = Entity<SearchMap, 'search'>;

export type CampaignProperties = PropertiesOf<AdsCampaign>;
export type UserListProperties = PropertiesOf<AdsUserList>;
export type SearchProperties = PropertiesOf<AdsSearch>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
