import { splunkApiJsonRequest } from '../transport';
export async function searchReports(filter) {
    const qs = {};
    if (filter) {
        qs.search = filter;
    }
    const endpoint = '/services/saved/searches';
    const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);
    return {
        results: response.map((entry) => {
            return {
                name: entry.name,
                value: entry.id,
                url: entry.entryUrl,
            };
        }),
    };
}
export async function searchJobs(filter) {
    const qs = {};
    if (filter) {
        qs.search = filter;
    }
    const endpoint = '/services/search/jobs';
    const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);
    return {
        results: response.map((entry) => {
            return {
                name: entry.name.replace(/^\|\s*/, ''),
                value: entry.id,
                url: entry.entryUrl,
            };
        }),
    };
}
export async function searchUsers(filter) {
    const qs = {};
    if (filter) {
        qs.search = filter;
    }
    const endpoint = '/services/authentication/users';
    const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);
    return {
        results: response.map((entry) => {
            return {
                name: entry.name,
                value: entry.id,
                url: entry.entryUrl,
            };
        }),
    };
}
//# sourceMappingURL=listSearch.js.map