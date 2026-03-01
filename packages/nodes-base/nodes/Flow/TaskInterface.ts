export interface ITask {
	organization_id?: number;
	task?: TaskInfo;
}

export interface TaskInfo {
	workspace_id?: number;
	id?: number;
	name?: string;
	owner_id?: number;
	list_id?: number;
	starts_on?: string;
	due_on?: string;
	mirror_parent_subscribers?: boolean;
	mirror_parent_tags?: boolean;
	note_content?: string;
	note_mime_type?: string;
	parent_id?: number;
	position_list?: number;
	position_upcoming?: number;
	position?: number;
	section_id?: number;
	subscriptions?: number;
	tags?: string[];
	completed?: boolean;
}
