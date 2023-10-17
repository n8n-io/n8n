import type { INodeTypeDataInterface } from 'n8n-workflow';

export const webhookWithBodyOutputInterface: INodeTypeDataInterface = {
	headers: {
		host: 'localhost:5678',
		'user-agent': 'curl/7.79.1',
		accept: '*/*',
		'content-length': '9',
		'content-type': 'application/x-www-form-urlencoded',
	},
	params: {},
	query: {},
	body: {
		key: 'value',
	},
};

export const webhookWithoutBodyOutputInterface: INodeTypeDataInterface = {
	headers: {
		host: 'localhost:5678',
		'user-agent': 'curl/7.79.1',
		accept: '*/*',
	},
	params: {},
	query: {},
};
