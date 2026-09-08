import { ColumnsFetcher } from '../helpers/columns-fetcher';
export async function getResourceMapperFields() {
    const fetcher = new ColumnsFetcher(this);
    return {
        fields: await fetcher.mapperFieldsFromDefinedParam(),
    };
}
//# sourceMappingURL=resourceMapping.js.map