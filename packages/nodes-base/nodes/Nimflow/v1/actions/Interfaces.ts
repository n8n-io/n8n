import {
	AllEntities,
	Entity,
	PropertiesOf
} from 'n8n-workflow';

type NimflowMap = {
	context: 'dispatchAction',
	task: 'addResponse' | 'search' | 'searchAndUpdate'
};

export type Nimflow = AllEntities<NimflowMap>;
export type NimflowContext = Entity<NimflowMap, 'context'>;
export type NimflowTask = Entity<NimflowMap, 'task'>;

export type ContextProperties = PropertiesOf<NimflowContext>;
export type TaskProperties = PropertiesOf<NimflowTask>;
