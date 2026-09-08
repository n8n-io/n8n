export const reportRLC = {
    displayName: 'Report',
    name: 'reportId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select a report...',
            typeOptions: {
                searchListMethod: 'searchReports',
                searchable: true,
            },
        },
        {
            displayName: 'ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. Errors%20in%20the%20last%20hour',
        },
    ],
};
export const searchJobRLC = {
    displayName: 'Search Job',
    name: 'searchJobId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select a search job...',
            typeOptions: {
                searchListMethod: 'searchJobs',
                searchable: true,
            },
        },
        {
            displayName: 'ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. 1718944376.178',
        },
    ],
};
export const userRLC = {
    displayName: 'User',
    name: 'userId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select a user...',
            typeOptions: {
                searchListMethod: 'searchUsers',
                searchable: true,
            },
        },
        {
            displayName: 'ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. admin',
        },
    ],
};
//# sourceMappingURL=rlc.description.js.map