import {
	JsonObject,
} from 'n8n-workflow';

export enum OVERRIDE_MAP_TYPE {
	'CATEGORY' = 'category',
	'NORMAL' = 'normal',
	'TRANSACTIONAL' = 'transactional',
};

enum OVERRIDE_MAP_VALUES {
	'CATEGORY' = 'category',
	'NORMAL' = 'boolean',
	'TRANSACTIONAL' = 'id',
};

export const INTERCEPTORS = new Map<string, (body: JsonObject) => void>([
	[OVERRIDE_MAP_TYPE.CATEGORY, (body: JsonObject) => {
			body!.type = OVERRIDE_MAP_VALUES.CATEGORY;
	}],
	[OVERRIDE_MAP_TYPE.NORMAL, (body: JsonObject) => {
		body!.type = OVERRIDE_MAP_VALUES.NORMAL;
	}],
	[OVERRIDE_MAP_TYPE.TRANSACTIONAL, (body: JsonObject) => {
		body!.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
	}]
]);
