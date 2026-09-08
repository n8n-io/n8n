import { folderMessageOperations } from '../../v1/FolderMessageDecription';
describe('Microsoft Outlook v1 Node Structure', () => {
    it('folderMessage operation default should be one of its options', () => {
        const operation = folderMessageOperations[0];
        const values = operation.options.map((o) => o.value);
        expect(values).toContain(operation.default);
    });
});
//# sourceMappingURL=FolderMessage.structure.test.js.map