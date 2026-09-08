import moment from 'moment-timezone';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { companyFields, companyOperations } from './descriptions/CompanyDescription';
import { industryFields, industryOperations } from './descriptions/IndustryDescription';
import { inviteFields, inviteOperations } from './descriptions/InviteDescription';
import { portfolioCompanyFields, portfolioCompanyOperations, } from './descriptions/PortfolioCompanyDescription';
import { portfolioFields, portfolioOperations } from './descriptions/PortfolioDescription';
import { reportFields, reportOperations } from './descriptions/ReportDescription';
import { resolveReportDownloadUrl, scorecardApiRequest, simplify } from './GenericFunctions';
export class SecurityScorecard {
    description = {
        displayName: 'SecurityScorecard',
        name: 'securityScorecard',
        icon: 'file:securityScorecard.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
        version: 1,
        description: 'Consume SecurityScorecard API',
        defaults: {
            name: 'SecurityScorecard',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'securityScorecardApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                required: true,
                options: [
                    {
                        name: 'Company',
                        value: 'company',
                    },
                    {
                        name: 'Industry',
                        value: 'industry',
                    },
                    {
                        name: 'Invite',
                        value: 'invite',
                    },
                    {
                        name: 'Portfolio',
                        value: 'portfolio',
                    },
                    {
                        name: 'Portfolio Company',
                        value: 'portfolioCompany',
                    },
                    {
                        name: 'Report',
                        value: 'report',
                    },
                ],
                default: 'company',
            },
            // Company
            ...companyOperations,
            ...companyFields,
            // Industry
            ...industryOperations,
            ...industryFields,
            // Invite
            ...inviteOperations,
            ...inviteFields,
            // Portfolio
            ...portfolioOperations,
            ...portfolioFields,
            // Portfolio Company
            ...portfolioCompanyOperations,
            ...portfolioCompanyFields,
            // Report
            ...reportOperations,
            ...reportFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let responseData;
        const length = items.length;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            if (resource === 'portfolio') {
                if (operation === 'create') {
                    const name = this.getNodeParameter('name', i);
                    const description = this.getNodeParameter('description', i);
                    const privacy = this.getNodeParameter('privacy', i);
                    const body = {
                        name,
                        description,
                        privacy,
                    };
                    responseData = await scorecardApiRequest.call(this, 'POST', 'portfolios', body);
                    returnData.push(responseData);
                }
                if (operation === 'delete') {
                    const portfolioId = this.getNodeParameter('portfolioId', i);
                    responseData = await scorecardApiRequest.call(this, 'DELETE', `portfolios/${portfolioId}`);
                    returnData.push({ success: true });
                }
                if (operation === 'update') {
                    const portfolioId = this.getNodeParameter('portfolioId', i);
                    const name = this.getNodeParameter('name', i);
                    const description = this.getNodeParameter('description', i);
                    const privacy = this.getNodeParameter('privacy', i);
                    const body = {
                        name,
                        description,
                        privacy,
                    };
                    responseData = await scorecardApiRequest.call(this, 'PUT', `portfolios/${portfolioId}`, body);
                    returnData.push(responseData);
                }
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    responseData = await scorecardApiRequest.call(this, 'GET', 'portfolios');
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', 0);
                        responseData = responseData.splice(0, limit);
                    }
                    returnData.push.apply(returnData, responseData);
                }
            }
            if (resource === 'portfolioCompany') {
                if (operation === 'add') {
                    const portfolioId = this.getNodeParameter('portfolioId', i);
                    const domain = this.getNodeParameter('domain', i);
                    responseData = await scorecardApiRequest.call(this, 'PUT', `portfolios/${portfolioId}/companies/${domain}`);
                    returnData.push(responseData);
                }
                if (operation === 'remove') {
                    const portfolioId = this.getNodeParameter('portfolioId', i);
                    const domain = this.getNodeParameter('domain', i);
                    responseData = await scorecardApiRequest.call(this, 'DELETE', `portfolios/${portfolioId}/companies/${domain}`);
                    returnData.push({ success: true });
                }
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    const portfolioId = this.getNodeParameter('portfolioId', i);
                    const filterParams = this.getNodeParameter('filters', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `portfolios/${portfolioId}/companies`, {}, filterParams);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', 0);
                        responseData = responseData.splice(0, limit);
                    }
                    returnData.push.apply(returnData, responseData);
                }
            }
            if (resource === 'report') {
                if (operation === 'download') {
                    const reportUrlInput = this.getNodeParameter('url', i);
                    let reportUrl;
                    try {
                        reportUrl = resolveReportDownloadUrl(reportUrlInput);
                    }
                    catch (error) {
                        throw new NodeOperationError(this.getNode(), error instanceof Error ? error.message : 'Invalid report URL', { itemIndex: i });
                    }
                    const response = await scorecardApiRequest.call(this, 'GET', '', {}, {}, reportUrl, {
                        encoding: null,
                        resolveWithFullResponse: true,
                    });
                    let mimeType;
                    if (response.headers['content-type']) {
                        mimeType = response.headers['content-type'];
                    }
                    const newItem = {
                        json: items[i].json,
                        binary: {},
                    };
                    if (items[i].binary !== undefined && newItem.binary) {
                        // Create a shallow copy of the binary data so that the old
                        // data references which do not get changed still stay behind
                        // but the incoming data does not get changed.
                        Object.assign(newItem.binary, items[i].binary);
                    }
                    items[i] = newItem;
                    const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
                    const fileName = reportUrl.split('/').pop();
                    const data = Buffer.from(response.body, 'utf8');
                    items[i].binary[dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data, fileName, mimeType);
                }
                if (operation === 'generate') {
                    const reportType = this.getNodeParameter('report', i);
                    let body = {};
                    if (reportType !== 'portfolio') {
                        body.scorecard_identifier = this.getNodeParameter('scorecardIdentifier', i);
                    }
                    else {
                        body.portfolio_id = this.getNodeParameter('portfolioId', i);
                    }
                    if (reportType === 'events-json') {
                        body.date = this.getNodeParameter('date', i);
                    }
                    if (['issues', 'portfolio'].indexOf(reportType) > -1) {
                        body.format = this.getNodeParameter('options.format', i) || 'pdf';
                    }
                    if (['detailed', 'summary'].indexOf(reportType) > -1) {
                        body.branding = this.getNodeParameter('branding', i);
                    }
                    // json reports want the params differently
                    if (['events-json', 'full-scorecard-json'].indexOf(reportType) > -1) {
                        body = { params: body };
                    }
                    if (reportType === 'scorecard-footprint') {
                        const options = this.getNodeParameter('options', i);
                        Object.assign(body, options);
                    }
                    responseData = await scorecardApiRequest.call(this, 'POST', `reports/${reportType}`, body);
                    returnData.push(responseData);
                }
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    responseData = await scorecardApiRequest.call(this, 'GET', 'reports/recent');
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    returnData.push.apply(returnData, responseData);
                }
            }
            if (resource === 'invite') {
                if (operation === 'create') {
                    const body = {
                        email: this.getNodeParameter('email', i),
                        first_name: this.getNodeParameter('firstName', i),
                        last_name: this.getNodeParameter('lastName', i),
                        message: this.getNodeParameter('message', i),
                    };
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    Object.assign(body, additionalFields);
                    responseData = await scorecardApiRequest.call(this, 'POST', 'invitations', body);
                    returnData.push(responseData);
                }
            }
            if (resource === 'industry') {
                if (operation === 'getScore') {
                    const industry = this.getNodeParameter('industry', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `industries/${industry}/score`);
                    returnData.push(responseData);
                }
                if (operation === 'getFactor') {
                    const simple = this.getNodeParameter('simple', 0);
                    const returnAll = this.getNodeParameter('returnAll', 0);
                    const industry = this.getNodeParameter('industry', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `industries/${industry}/history/factors`);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    if (simple) {
                        responseData = simplify(responseData);
                    }
                    returnData.push.apply(returnData, responseData);
                }
                if (operation === 'getFactorHistorical') {
                    const simple = this.getNodeParameter('simple', 0);
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const industry = this.getNodeParameter('industry', i);
                    const options = this.getNodeParameter('options', i);
                    // Convert to YYYY-MM-DD
                    if (options.from) {
                        options.from = moment(options.from).format('YYYY-MM-DD');
                    }
                    if (options.to) {
                        options.to = moment(options.to).format('YYYY-MM-DD');
                    }
                    responseData = await scorecardApiRequest.call(this, 'GET', `industries/${industry}/history/factors`, {}, options);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    if (simple) {
                        responseData = simplify(responseData);
                    }
                    returnData.push.apply(returnData, responseData);
                }
            }
            if (resource === 'company') {
                if (operation === 'getScorecard') {
                    const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `companies/${scorecardIdentifier}`);
                    returnData.push(responseData);
                }
                if (operation === 'getFactor') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
                    const filterParams = this.getNodeParameter('filters', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `companies/${scorecardIdentifier}/factors`, {}, filterParams);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    returnData.push.apply(returnData, responseData);
                }
                if (operation === 'getFactorHistorical') {
                    const simple = this.getNodeParameter('simple', 0);
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
                    const options = this.getNodeParameter('options', i);
                    // Convert to YYYY-MM-DD
                    if (options.date_from) {
                        options.date_from = moment(options.date_from).format('YYYY-MM-DD');
                    }
                    if (options.date_to) {
                        options.date_to = moment(options.date_to).format('YYYY-MM-DD');
                    }
                    responseData = await scorecardApiRequest.call(this, 'GET', `companies/${scorecardIdentifier}/history/factors/score`, {}, options);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    if (simple) {
                        responseData = simplify(responseData);
                    }
                    returnData.push.apply(returnData, responseData);
                }
                if (operation === 'getHistoricalScore') {
                    const simple = this.getNodeParameter('simple', 0);
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
                    const options = this.getNodeParameter('options', i);
                    // for some reason the params are different between these two APis :/
                    if (options.date_from) {
                        options.from = moment(options.date_from).format('YYYY-MM-DD');
                        delete options.date_from;
                    }
                    if (options.date_to) {
                        options.to = moment(options.date_to).format('YYYY-MM-DD');
                        delete options.date_to;
                    }
                    responseData = await scorecardApiRequest.call(this, 'GET', `companies/${scorecardIdentifier}/history/factors/score`, {}, options);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    if (simple) {
                        responseData = simplify(responseData);
                    }
                    returnData.push.apply(returnData, responseData);
                }
                if (operation === 'getScorePlan') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
                    const targetScore = this.getNodeParameter('score', i);
                    responseData = await scorecardApiRequest.call(this, 'GET', `companies/${scorecardIdentifier}/score-plans/by-target/${targetScore}`);
                    responseData = responseData.entries;
                    if (!returnAll) {
                        const limit = this.getNodeParameter('limit', i);
                        responseData = responseData.splice(0, limit);
                    }
                    returnData.push.apply(returnData, responseData);
                }
            }
        }
        // Handle file download output data differently
        if (resource === 'report' && operation === 'download') {
            return [items];
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=SecurityScorecard.node.js.map