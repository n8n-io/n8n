import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

export type LoadOptionsMethod = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

export type ListSearchMethod = (
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult>;

export type Placement = 'root' | 'options' | 'additionalFields';

export interface ParamTemplate {
	property: Partial<INodeProperties>;
	loadOptions?: LoadOptionsMethod;
	listSearch?: ListSearchMethod;
}

export interface ParamConfig {
	api?: string;
	placement?: Placement;
	use?: ParamTemplate;
}

export interface OperationConfig {
	api?: string;
	displayName?: string;
	action?: string;
	description?: string;
	flatten?: string;
	params?: Record<string, ParamConfig>;
}

export interface ParamRule {
	api: string;
	resource?: string;
	use: ParamTemplate;
}

export interface Overrides {
	include?: string[];
	exclude?: Record<string, string>;
	resources?: Record<string, string>;
	rules?: ParamRule[];
	operations?: Record<string, OperationConfig>;
}

export const defineOverrides = (config: Overrides): Overrides => config;

export const param = (
	property: Partial<INodeProperties>,
	methods: Pick<ParamTemplate, 'loadOptions' | 'listSearch'> = {},
): ParamTemplate => ({ property, ...methods });

function templates(config: Overrides): ParamTemplate[] {
	const fromRules = (config.rules ?? []).map((rule) => rule.use);
	const fromOperations = Object.values(config.operations ?? {}).flatMap((operation) =>
		Object.values(operation.params ?? {}).flatMap((p) => (p.use ? [p.use] : [])),
	);
	return [...fromRules, ...fromOperations];
}

export function collectMethods(config: Overrides) {
	const loadOptions: Record<string, LoadOptionsMethod> = {};
	const listSearch: Record<string, ListSearchMethod> = {};
	for (const template of templates(config)) {
		if (template.loadOptions) loadOptions[template.loadOptions.name] = template.loadOptions;
		if (template.listSearch) listSearch[template.listSearch.name] = template.listSearch;
	}
	return { loadOptions, listSearch };
}
