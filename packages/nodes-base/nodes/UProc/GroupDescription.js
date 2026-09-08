import { groups } from './Json/Groups';
const finalGroups = {
    displayName: 'Resource',
    name: 'group',
    type: 'options',
    default: 'communication',
    options: [],
};
const options = [];
for (const group of groups.groups) {
    const item = {
        name: group.translated,
        value: group.name,
        description: 'The ' +
            group.translated +
            ' Resource allows you to get tools from this resource',
    };
    options.push(item);
}
//@ts-ignore
finalGroups.options = options;
const mappedGroups = [finalGroups];
export const groupOptions = mappedGroups;
//# sourceMappingURL=GroupDescription.js.map