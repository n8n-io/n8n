import { convertNETDates } from './GenericFunctions';
describe('UnleashedSoftware Node: Generic Functions', () => {
    describe('convertNETDates', () => {
        it('should convert .NET dates to Date objects by default', () => {
            const item = { created: '/Date(1586833770780)/' };
            convertNETDates(item);
            expect(item.created).toBeInstanceOf(Date);
            expect(item.created.getTime()).toBe(1586833770780);
        });
        it('should convert .NET dates to ISO strings when serializeDates is true', () => {
            const item = {
                created: '/Date(1586833770780)/',
                nested: { updated: '/Date(1586833770780)/' },
            };
            convertNETDates(item, true);
            expect(item.created).toBe(new Date(1586833770780).toISOString());
            expect(item.nested.updated).toBe(new Date(1586833770780).toISOString());
        });
        it('should leave non-date strings untouched', () => {
            const item = { name: 'Product 1' };
            convertNETDates(item, true);
            expect(item.name).toBe('Product 1');
        });
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map