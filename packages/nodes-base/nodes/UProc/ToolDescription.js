import { deepCopy } from 'n8n-workflow';
import { groups } from './Json/Groups';
import { tools } from './Json/Tools';
function capitalize(str) {
    if (!str) {
        return '';
    }
    else {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
const operations = [];
for (const group of groups.groups) {
    const item = {
        displayName: 'Operation',
        name: 'tool',
        type: 'options',
        description: 'The Operation to consume',
        displayOptions: {
            show: {
                group: [group.name],
            },
        },
        default: '',
        options: [],
    };
    const options = [];
    for (const tool of tools.processors) {
        if (tool.g === group.name) {
            const link = 'https://app.uproc.io/#/tools/processor/' +
                tool.k
                    .replace(/([A-Z]+)/g, '-$1')
                    .toLowerCase()
                    .replace('-', '/')
                    .replace('-', '/');
            const option = {
                name: tool.d,
                value: tool.k,
                description: tool.ed + ` <a href="${link}" target='_blank'>Info</a>`,
            };
            options.push(option);
        }
    }
    //Tool
    item.options = options.sort((a, b) => (a.name > b.name ? 1 : -1));
    item.default = options[0].value;
    operations.push(item);
}
export const toolOperations = operations;
let parameters = [];
//all tools
for (const tool of tools.processors) {
    //all parameters in tool
    for (const param of tool.p) {
        const displayName = param.n;
        const capitalizedDisplayName = capitalize(displayName.replace(/_/g, ' '));
        const description = `The "${capitalizedDisplayName}" value to use as a parameter for this Operation`;
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
                    group: [tool.g],
                    tool: [tool.k],
                },
            },
            description: deepCopy(description),
        };
        let modifiedParam = null;
        //Check if param exists previously
        for (const currentParam of parameters) {
            //Get old param in parameters array
            if (currentParam.name === param.n) {
                modifiedParam = currentParam;
            }
        }
        //if exists, other wise
        if (modifiedParam) {
            //Assign new group and tool
            modifiedParam.displayOptions.show.group.push(tool.g);
            modifiedParam.displayOptions.show.tool.push(tool.k);
            //build new array
            const newParameters = [];
            for (const currentParam of parameters) {
                //Get old param in parameters array
                if (currentParam.name === modifiedParam.name) {
                    newParameters.push(modifiedParam);
                }
                else {
                    newParameters.push(currentParam);
                }
            }
            // eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
            parameters = JSON.parse(JSON.stringify(newParameters));
        }
        else {
            parameters.push(parameter);
        }
    }
}
export const toolParameters = parameters;
//# sourceMappingURL=ToolDescription.js.map