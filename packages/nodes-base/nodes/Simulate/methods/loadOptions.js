export async function getNodeTypes() {
    const types = this.getKnownNodeTypes();
    const returnData = [];
    let typeNames = Object.keys(types);
    if (this.getNode().type === 'n8n-nodes-base.simulateTrigger') {
        typeNames = typeNames.filter((type) => type.toLowerCase().includes('trigger'));
    }
    for (const type of typeNames) {
        returnData.push({
            name: types[type].className,
            value: type,
        });
    }
    return returnData;
}
//# sourceMappingURL=loadOptions.js.map