import { ILoadOptionsFunctions, INodePropertyOptions, ResourceMapperFields } from "n8n-workflow"
import { IPromptInput, InputType, Templates, TemplatesWithPagination } from "./types";

export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const options = {
		method: "GET",
		headers: {
			"x-lf-source": "n8n"
		},
		uri: `https://promptify.adtitan.io/api/meta/templates?limit=10`,
		json: true
	};
	const response: TemplatesWithPagination = await this.helpers.requestWithAuthentication.call(this, 'promptifyApi', options);
	const templates = response.results.map(template => ({
		name: template.title,
		value: template.id,
		description: template.description
	}));

	return templates;
}

export async function getInputs(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const templateId = this.getNodeParameter('template');
	const options = {
		method: "GET",
		headers: {
			"x-lf-source": "n8n"
		},
		uri: `https://promptify.adtitan.io/api/meta/templates/${templateId}`,
		json: true
	};
	const template: Templates = await this.helpers.requestWithAuthentication.call(this, 'promptifyApi', options);

	const inputs: IPromptInput[] = [];
	template.prompts?.forEach(prompt => {
		inputs.push(...getInputsFromString(prompt.content));
	})

	return {
		fields: inputs.map(input => (
			{
				id: input.name,
				displayName: input.fullName,
				defaultMatch: true,
				canBeUsedToMatch: true,
				required: input.required,
				display: true,
				type: input.type,
			}
		))
	}
}

const getInputsFromString = (str: string): IPromptInput[] => {
  const regex = /{{(.*?)}}/g;
  const inputs: IPromptInput[] = [];
  let match;

  while ((match = regex.exec(str)) !== null) {
    const parts = match[1].split(":");

		const exists = inputs.find(input => input.name === parts[0]);
		if (!exists) {
			const type = getType(parts[1]);
			const options =
				type === "options" && parts[3]?.startsWith('"') && parts[3]?.endsWith('"') // options format: "option1,option2"
					? Array.from(new Set(parts[3].slice(1, -1).split(","))).filter(option => option.trim()) // duplicates & empty options removed
					: null;

			if (type === "options" && !options?.length) {
				continue;
			}

			const _newInput: IPromptInput = {
				name: parts[0],
				fullName: parts[0]
					.replace(/([a-z])([A-Z])/g, "$1 $2")
					.toLowerCase()
					.replace(/^./, parts[0][0].toUpperCase()),
				type: type,
				required: parts[2] ? parts[2].toLowerCase() !== "false" : true, // required by default
				options: options,
			};

			inputs.push(_newInput);
		}
  }

  return inputs;
};

const getType = (str: string): InputType => {
  switch (str) {
    case "integer":
    case "number":
      return "number";
    case "code":
      return "string";
    case "choices":
      return "options";
    default:
      return "string";
  }
};
