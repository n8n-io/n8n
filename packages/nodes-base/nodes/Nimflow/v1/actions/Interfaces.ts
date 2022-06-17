import {
	AllEntities,
	Entity,
	PropertiesOf
} from 'n8n-workflow';

type NimflowMap = {
	context: 'dispatchAction',
	task: 'search' | 'addResponse',
	function: 'call'
};

export type Nimflow = AllEntities<NimflowMap>;
export type NimflowContext = Entity<NimflowMap, 'context'>;
export type NimflowTask = Entity<NimflowMap, 'task'>;
export type NimflowFunction = Entity<NimflowMap, 'function'>;

export type ContextProperties = PropertiesOf<NimflowContext>;
export type TaskProperties = PropertiesOf<NimflowTask>;
export type FunctionProperties = PropertiesOf<NimflowFunction>;
