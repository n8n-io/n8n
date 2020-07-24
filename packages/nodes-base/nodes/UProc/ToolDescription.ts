import { INodeProperties } from 'n8n-workflow';

//import tools from "json!https://app.uproc.io/json/en/processors.json";
//import toolsObject from "json/processors.json";
var groups = require("./json/groups.json");
var tools = require("./json/processors.json");

let operations = [];
for(let group of groups.groups) {
	let item = {
		displayName: 'Tool',
		name: 'tool',
		type: 'options',
		displayOptions: {
			show: {
				group: [
					group.name,
				],
			},
		},
		default: 'check-email-exists',
		options: []
	};

	var options = [];

	for(let tool of tools.processors){
		if (tool.groups.indexOf(group.name) !== -1) {
			let prefix = tool.type.charAt(0).toUpperCase() + tool.type.slice(1);
			let option = {
				name: prefix + " " + tool.description,
				value: tool.key,
				description: ''
			};
			options.push(option);
		}
	}

	item.options = <any>options.sort((a, b) => (a.name > b.name) ? 1 : -1)
	item.default = <string>options[0].value;
	operations.push(item);
}
export const toolOperations = operations as INodeProperties[];


let parameters = [];
//all tools
for(let tool of tools.processors) {
	//all parameters in tool
	for (let param of tool.params) {
		let parameter = {
			displayName: param.name,
			name: param.name,
			type: 'string',
			default: '',
			required: param.required,
			displayOptions: {
				show: {
					group: [
						tool.groups[0],
					],
					tool: [
						tool.key
					],
				},
			},
			description: 'The ' + param.name + ' to complete.',
		};
		let modifiedParam = null;
		//Check if param exists previously
		for (let currentParam of parameters) {
			//Get old param in parameters array
			if (currentParam.name === param.name) {
				modifiedParam = currentParam;
			}
		}
		//if exists
		if (modifiedParam) {
			//Assign new group and tool
			modifiedParam.displayOptions.show.group.push(tool.groups[0]);
			modifiedParam.displayOptions.show.tool.push(tool.key);

			//build new array
			let newParameters = [];
			for (let currentParam of parameters) {
				//Get old param in parameters array
				if (currentParam.name === modifiedParam.name) {
					newParameters.push(modifiedParam);
				} else {
					newParameters.push(currentParam);
				}
			}
			parameters = JSON.parse(JSON.stringify(newParameters));
		} else {
			parameters.push(parameter);
		}
	}
}

export const toolParameters = parameters as INodeProperties[];
