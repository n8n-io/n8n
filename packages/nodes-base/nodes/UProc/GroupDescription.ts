import { IDataObject, INodeProperties } from 'n8n-workflow';

import { groups } from './Json/Groups';

const finalGroups = {
	displayName: 'Resource',
	name: 'group',
	type: 'options',
	default: 'communication',
	options: [],
};

const options = [];

for (const group of (groups as IDataObject).groups as IDataObject[]) {
	const item = {
		name: group.translated,
		value: group.name,
		description:
			'The ' +
			(group.translated as string) +
			' Resource allows you to get tools from this resource',
	};
	options.push(item);
}

//@ts-ignore
finalGroups.options = options;
const mappedGroups = [finalGroups];

export const groupOptions = mappedGroups as INodeProperties[];
