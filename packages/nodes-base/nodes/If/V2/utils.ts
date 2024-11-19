import type { IExecuteFunctions } from 'n8n-workflow';

export const getTypeValidationStrictness = (version: number) => {
	return `={{ ($nodeVersion < ${version} ? $parameter.options.looseTypeValidation :  $parameter.looseTypeValidation) ? "loose" : "strict" }}`;
};

export const getTypeValidationParameter = (version: number) => {
	return (context: IExecuteFunctions, itemIndex: number, option: boolean | undefined) => {
		if (context.getNode().typeVersion < version) {
			return option;
		} else {
			return context.getNodeParameter('looseTypeValidation', itemIndex, false) as boolean;
		}
	};
};
