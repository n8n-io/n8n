export function isOracleDBOperation(op) {
    return ['deleteTable', 'execute', 'insert', 'select', 'update', 'upsert'].includes(op);
}
//# sourceMappingURL=node.type.js.map