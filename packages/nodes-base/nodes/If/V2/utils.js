export const getTypeValidationStrictness = (version) => {
    return `={{ ($nodeVersion < ${version} ? $parameter.options.looseTypeValidation :  $parameter.looseTypeValidation) ? "loose" : "strict" }}`;
};
export const getTypeValidationParameter = (version) => {
    return (context, itemIndex, option) => {
        if (context.getNode().typeVersion < version) {
            return option;
        }
        else {
            return context.getNodeParameter('looseTypeValidation', itemIndex, false);
        }
    };
};
//# sourceMappingURL=utils.js.map