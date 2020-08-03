import {
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';

import {
	groups,
} from './json/groups';

import {
	tools,
} from './json/tools';


function capitalizeWords(str: string): string {
	if (!str) {
		return "";
	} else {
		return str.replace(/\w\S*/g, function(txt: string){
        return txt.charAt(0).toUpperCase() + txt.substr(1);
    });
	}
}

function capitalize(str: string): string {
	if (!str) {
		return "";
	} else {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}

function getFirstDescription(str: string): string {
	if (!str) {
		return "";
	} else {
		return str.split(". ")[0];;
	}
}


const operations = [];

for(const group of (groups as IDataObject).groups as IDataObject[]) {
	const item = {
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
		default: '',
		options: []
	};


	const options = [];

	for(const tool of (tools as IDataObject).processors as IDataObject[]){
		//@ts-ignore
		if (tool.g === group.name) {
		//if (tool?.groups.indexOf(group.name) !== -1) {
					//@ts-ignore
			const option = {
				name: tool.d as string,
				value: tool.k,
				description: tool.ed as string
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
for(const tool of (tools as IDataObject).processors as IDataObject[]) {
	//all parameters in tool
	for (const param of (tool as IDataObject).p as IDataObject[]) {
		const displayName = param.n as string;
		const capitalizedDisplayName = capitalize(displayName.replace(/_/g, " "));
		const parameter = {
			displayName: capitalizedDisplayName,
			name: param.n,
			type: param.t,
			default: '',
			placeholder: param.p,
			required: param.r,
			options: param.o,
			displayOptions: {
				show: {
					group: [
						//@ts-ignore
						tool.g,
					],
					tool: [
						tool.k
					],
				},
			},
			description: 'The ' + capitalizedDisplayName + ' to be completed.',
		};
		let modifiedParam = null;
		//Check if param exists previously
		for (const currentParam of parameters) {
			//Get old param in parameters array
			if (currentParam.name === param.n) {
				modifiedParam = currentParam;
			}
		}
		//if exists
		if (modifiedParam) {
			//Assign new group and tool
			//@ts-ignore
			modifiedParam.displayOptions.show.group.push(tool.g);
			modifiedParam.displayOptions.show.tool.push(tool.k);

			//build new array
			const newParameters = [];
			for (const currentParam of parameters) {
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
