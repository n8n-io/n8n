import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	adjustTimeByOffset,
	checkDynamicObject,
	checkTimeSlotDayWise,
	createDynamicObject,
	getWeekDayOfToday,
	NormalObjT,
	toCamelCase,
} from './helper';
import Retell from 'retell-sdk';
import { getDbConnection } from '@utils/db';

export class SdrAgentTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SDR Agent Trigger',
		name: 'sdrAgentTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a new call needs to be made based on retry rules.',
		defaults: {
			name: 'SDR Agent Trigger',
			color: '#FF5733',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Retry After (Days)',
				name: 'retryAfterDays',
				type: 'number',
				default: 1,
				description: 'Number of days to wait before retrying failed calls.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		try {
			const workflowData = this.getWorkflowStaticData('global');

			const segmentId = workflowData.segmentId as number;
			const sdrAgentId = workflowData.sdrAgentId as number;

			const retryAfterDays = this.getNodeParameter('retryAfterDays', 0) as number;

			if (!sdrAgentId || !segmentId) {
				throw new Error('SDR Agent ID and Segment ID are required.');
			}

			const connection = await getDbConnection();

			let [sdrAgent] = (await connection.execute(
				`SELECT 
                sa.*, 
                sasd.scheduling_hours, 
                sasd.retry_after_days, 
                sasd.max_attempts, 
                sasd.is_enabled, 
                sasd.timezone, 
                sasd.company_id AS schedulingCompanyId, 
                tz.*
            FROM sdr_agents AS sa
            JOIN s_a_scheduling_details AS sasd ON sa.id = sasd.sdr_agent_id
            JOIN timezones AS tz ON sasd.timezone = tz.id
            WHERE sa.id = ?
            AND sa.status = 'ACTIVE'
            AND sasd.is_enabled = TRUE`,
				[sdrAgentId],
			)) as any[];

			if (sdrAgent.length) {
				sdrAgent = sdrAgent[0];

				const todaysDayOfTheWeek = getWeekDayOfToday(sdrAgent.offset);

				if (sdrAgent.scheduling_hours) {
					const schedulingHoursParsed = sdrAgent.scheduling_hours;
					const isAvailable = checkTimeSlotDayWise(
						schedulingHoursParsed,
						todaysDayOfTheWeek,
						sdrAgent.offset,
					);

					if (isAvailable) {
						const [contacts] = await connection.execute(
							`
                        SELECT 
                            DISTINCT cal.*
                        FROM customers_and_leads_segments AS cals
                        JOIN customers_and_leads AS cal 
                            ON cals.customers_and_leads_id = cal.id
                        LEFT JOIN sdr_agents_call_details AS sacd 
                            ON sacd.lead_id = cal.id
                        WHERE 
                            cals.segment_id = ?
                            AND cal.status NOT IN ('calling', 'non-responsive', 'do-not-call')
                            AND (cal.status != 'call-back' 
                                OR (CONVERT_TZ(NOW(), '+00:00', IFNULL(?, "+00:00")) >= 
                                    CONVERT_TZ(cal.callback_timestamp, '+00:00', IFNULL(?, "+00:00"))))
                            AND (
                                (SELECT COUNT(*) 
                                FROM sdr_agents_call_details AS calls 
                                WHERE calls.lead_id = cal.id) < ?
                                AND COALESCE((
                                    SELECT MAX(calls.created_at) 
                                    FROM sdr_agents_call_details AS calls 
                                    WHERE calls.lead_id = cal.id
                                ), '1970-01-01') <= 
                                DATE_SUB(NOW(), INTERVAL 
                                    COALESCE(?, 0) DAY)
                            )            
                        `,
							[segmentId, sdrAgent.offset, sdrAgent.offset, sdrAgent.max_attempts, retryAfterDays],
						);
						await scheduleLeadsCalls(contacts as any[], {
							offset: sdrAgent.offset,
							agentPhoneNumber: sdrAgent.agent_phone_number,
						});
					}
				}
			}

			return {
				closeFunction: async () => {
					console.log('Trigger node stopped.');
				},
			};
		} catch (error) {
			return {
				closeFunction: async () => {
					console.log('Trigger node stopped.');
				},
			};
		}
	}
}

async function updateCallStatus(contactId: number, status: string): Promise<void> {
	const connection = await getDbConnection();
	await connection.execute(
		'UPDATE contacts SET call_status = ?, last_called_at = NOW() WHERE id = ?',
		[status, contactId],
	);
}

async function getCompanyRetellKey(id: number): Promise<string | null> {
	const connection = await getDbConnection();
	const [companies] = (await connection.execute(`SELECT * FROM companies WHERE id = ?`, [
		id,
	])) as any[];
	return companies.length ? companies[0].retell_api_key : null;
}

async function getRetellClient(companyId: number): Promise<Retell> {
	const apiKey = await getCompanyRetellKey(companyId);
	if (!apiKey) {
		throw new Error('API key not found for the company');
	}
	return new Retell({ apiKey });
}

async function createPhoneCall(
	fromNumber: string,
	toNumber: string,
	dynamicVariables: NormalObjT,
	companyId: number,
) {
	const RetellClient = await getRetellClient(companyId);

	return RetellClient.call.createPhoneCall({
		from_number: fromNumber,
		to_number: toNumber,
		retell_llm_dynamic_variables: dynamicVariables,
	});
}

async function scheduleLeadsCalls(
	allNotContactedLeads: any[],
	agentMeta: { offset: string; agentPhoneNumber: string },
) {
	const createCallPromises = allNotContactedLeads.map(async (notContactedLead) => {
		const leadInfo = notContactedLead;

		const agentPhoneNumber = agentMeta.agentPhoneNumber;
		try {
			if (agentPhoneNumber) {
				console.log(`Initiating call from ${agentPhoneNumber} to ${leadInfo.phone_number} `);
				const dynamicVariables = (leadInfo.dynamic_variables as string[]) || [];
				dynamicVariables.push('companyName');

				const dynamicVariableObj = createDynamicObject(leadInfo?.custom_fields);
				dynamicVariableObj['leadName'] = leadInfo.name.split(' ')[0];
				dynamicVariableObj['productName'] = leadInfo.product_of_interest;
				dynamicVariableObj['currentTime'] = adjustTimeByOffset(new Date(), agentMeta.offset);
				dynamicVariableObj['companyName'] = leadInfo.company_name;

				const checkDynamicObj = checkDynamicObject(dynamicVariables, {
					...dynamicVariableObj,
					...leadInfo,
				});

				if (checkDynamicObj) {
					const createdCallData = await createPhoneCall(
						agentPhoneNumber,
						leadInfo.phone_number,
						dynamicVariableObj,
						leadInfo.company_id,
					);
					const sdrAgentCallDetailsDataToInsert = {
						sdrAgentId: leadInfo.agent_id,
						callCurrentStatus: createdCallData.call_status,
						retellCallId: createdCallData.call_id,
						companyId: leadInfo.company_id,
						leadId: leadInfo?.id,
					};
					// const sdrAgentCall = await this.sdrAgentsService.storeSdrAgentCallDetails(
					// 	sdrAgentCallDetailsDataToInsert,
					// );

					// await this.mongodbService.insert(MongoDBCollection.REQUEST_RESPONSE_LOG, { action: ActionTypeE.CREATE, entityId: sdrAgentCall.id, entityType: 'sdr_agents_call_details', platform: PlatformTypeE.RETELL, callId: createdCallData.call_id, retellCall: createdCallData, companyId: sdrAgentCall.companyId, leadId: leadInfo.id })

					// await CustomerAndLeadsModel.query()
					//     .update({
					//         status: LeadStatusTypesE.CALLING,
					//         callbackTimestamp: null
					//     })
					//     .where({ id: leadInfo.id })
				} else {
					console.log('not eligible for call - ', leadInfo.id);
				}
			}
		} catch (error) {
			console.log('call executer error ', error);
		}
	});
	return Promise.allSettled(createCallPromises);
}
