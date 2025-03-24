export interface ICreateAgentBody {
	occasional?: boolean;
	signature?: string;
	ticket_scope?: number;
	skills_ids?: number[];
	groups_ids?: number[];
	role_ids?: number[];
	agent_type?: number;
	email?: string;
	language?: string;
	time_zone?: string;
	focus_mode?: boolean;
}
