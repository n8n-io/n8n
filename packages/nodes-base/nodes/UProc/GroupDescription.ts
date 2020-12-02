import {
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';

import {
	groups,
} from './Json/Groups';

const finalGroups = {
	displayName: 'Resource',
	name: 'group',
	type: 'options',
	default: 'communication',
	description: 'Group to consume.',
	options: [],
};

const options = [];

for(const group of (groups as IDataObject).groups as IDataObject[]){
	const item = {
		name: group.translated,
		value: group.name,
		description: 'The ' + group.translated + ' Group allows you to get tools from this group',
	};
	options.push(item);
}

//@ts-ignore
finalGroups.options = options;
const mappedGroups = [finalGroups];

export const groupOptions = mappedGroups as INodeProperties[];
