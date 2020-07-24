import { INodeProperties, IDataObject } from 'n8n-workflow';

//import groups from "json!https://app.uproc.io/json/en/groups.json";
var groups = require("./json/groups.json");

let finalGroups = {
 displayName: 'Group',
 name: 'group',
 type: 'options',
 default: 'communication',
 description: 'Group to consume.',
 options: <Object>[]
};

let options = [];

for(let group of groups.groups){
	let item = {
		name: group.translated,
		value: group.name,
		description: 'The ' + group.translated + ' Group allows you to get tools from this group',
	};
	options.push(item);
}
finalGroups.options = options;
let mappedGroups = [finalGroups];

export const groupOptions = mappedGroups as INodeProperties[];
