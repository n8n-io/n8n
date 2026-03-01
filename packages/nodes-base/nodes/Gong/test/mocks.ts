/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
export const gongApiResponse = {
	// https://gong.app.gong.io/settings/api/documentation#post-/v2/calls
	postCalls: {
		requestId: '4al018gzaztcr8nbukw',
		callId: '7782342274025937895',
	},
	// https://gong.app.gong.io/settings/api/documentation#put-/v2/calls/-id-/media
	postCallsMedia: {
		requestId: '4al018gzaztcr8nbukw',
		callId: '7782342274025937895',
		url: 'https://app.gong.io/call?id=7782342274025937895',
	},
	// https://gong.app.gong.io/settings/api/documentation#post-/v2/calls/extensive
	postCallsExtensive: {
		requestId: '4al018gzaztcr8nbukw',
		records: {
			totalRecords: 263,
			currentPageSize: 100,
			currentPageNumber: 0,
			cursor: 'eyJhbGciOiJIUzI1NiJ9.eyJjYWxsSWQiM1M30.6qKwpOcvnuweTZmFRzYdtjs_YwJphJU4QIwWFM',
		},
		calls: [
			{
				metaData: {
					id: '7782342274025937895',
					url: 'https://app.gong.io/call?id=7782342274025937895',
					title: 'Example call',
					scheduled: 1518863400,
					started: 1518863400,
					duration: 460,
					primaryUserId: '234599484848423',
					direction: 'Inbound',
					system: 'Outreach',
					scope: 'Internal',
					media: 'Video',
					language: 'eng',
					workspaceId: '623457276584334',
					sdrDisposition: 'Got the gatekeeper',
					clientUniqueId: '7JEHFRGXDDZFEW2FC4U',
					customData: 'Conference Call',
					purpose: 'Demo Call',
					meetingUrl: 'https://zoom.us/j/123',
					isPrivate: false,
					calendarEventId: 'abcde@google.com',
				},
				context: [
					{
						system: 'Salesforce',
						objects: [
							{
								objectType: 'Opportunity',
								objectId: '0013601230sV7grAAC',
								fields: [
									{
										name: 'name',
										value: 'Gong Inc.',
									},
								],
								timing: 'Now',
							},
						],
					},
				],
				parties: [
					{
						id: '56825452554556',
						emailAddress: 'test@test.com',
						name: 'Test User',
						title: 'Enterprise Account Executive',
						userId: '234599484848423',
						speakerId: '6432345678555530067',
						context: [
							{
								system: 'Salesforce',
								objects: [
									{
										objectType: 'Contact',
										objectId: '0013601230sV7grAAC',
										fields: [
											{
												name: 'name',
												value: 'Gong Inc.',
											},
										],
										timing: 'Now',
									},
								],
							},
						],
						affiliation: 'Internal',
						phoneNumber: '+1 123-567-8989',
						methods: ['Invitee'],
					},
				],
				content: {
					structure: [
						{
							name: 'Meeting Setup',
							duration: 67,
						},
					],
					trackers: [
						{
							id: '56825452554556',
							name: 'Competitors',
							count: 7,
							type: 'KEYWORD',
							occurrences: [
								{
									startTime: 32.56,
									speakerId: '234599484848423',
								},
							],
							phrases: [
								{
									count: 5,
									occurrences: [
										{
											startTime: 32.56,
											speakerId: '234599484848423',
										},
									],
									phrase: 'Walmart',
								},
							],
						},
					],
					topics: [
						{
							name: 'Objections',
							duration: 86,
						},
					],
					pointsOfInterest: {
						actionItems: [
							{
								snippetStartTime: 26,
								snippetEndTime: 26,
								speakerID: '56825452554556',
								snippet:
									"And I'll send you an invite with a link that you can use at that time as well.",
							},
						],
					},
					brief: 'string',
					outline: [
						{
							section: 'string',
							startTime: 0.5,
							duration: 0.5,
							items: [
								{
									text: 'string',
									startTime: 0.5,
								},
							],
						},
					],
					highlights: [
						{
							title: 'string',
							items: [
								{
									text: 'string',
									startTimes: [0.5],
								},
							],
						},
					],
					callOutcome: {
						id: 'MEETING_BOOKED',
						category: 'Answered',
						name: 'Meeting booked',
					},
					keyPoints: [
						{
							text: 'string',
						},
					],
				},
				interaction: {
					speakers: [
						{
							id: '56825452554556',
							userId: '234599484848423',
							talkTime: 145,
						},
					],
					interactionStats: [
						{
							name: 'Interactivity',
							value: 56,
						},
					],
					video: [
						{
							name: 'Browser',
							duration: 218,
						},
					],
					questions: {
						companyCount: 0,
						nonCompanyCount: 0,
					},
				},
				collaboration: {
					publicComments: [
						{
							id: '6843152929075440037',
							audioStartTime: 26,
							audioEndTime: 26,
							commenterUserId: '234599484848423',
							comment: 'new comment',
							posted: 1518863400,
							inReplyTo: '792390015966656336',
							duringCall: false,
						},
					],
				},
				media: {
					audioUrl: 'http://example.com',
					videoUrl: 'http://example.com',
				},
			},
		],
	},
	// https://gong.app.gong.io/settings/api/documentation#post-/v2/calls/transcript
	postCallsTranscript: {
		requestId: '4al018gzaztcr8nbukw',
		records: {
			totalRecords: 1,
			currentPageSize: 1,
			currentPageNumber: 0,
		},
		callTranscripts: [
			{
				callId: '7782342274025937895',
				transcript: [
					{
						speakerId: '6432345678555530067',
						topic: 'Objections',
						sentences: [
							{
								start: 460230,
								end: 462343,
								text: 'No wait, I think we should check that out first.',
							},
						],
					},
				],
			},
		],
	},
	// https://gong.app.gong.io/settings/api/documentation#post-/v2/users/extensive
	postUsersExtensive: {
		requestId: '4al018gzaztcr8nbukw',
		records: {
			totalRecords: 263,
			currentPageSize: 100,
			currentPageNumber: 0,
			cursor: 'eyJhbGciOiJIUzI1NiJ9.eyJjYWxsSWQiM1M30.6qKwpOcvnuweTZmFRzYdtjs_YwJphJU4QIwWFM',
		},
		users: [
			{
				id: '234599484848423',
				emailAddress: 'test@test.com',
				created: '2018-02-17T02:30:00-08:00',
				active: true,
				emailAliases: ['testAlias@test.com'],
				trustedEmailAddress: 'test@test.com',
				firstName: 'Jon',
				lastName: 'Snow',
				title: 'Enterprise Account Executive',
				phoneNumber: '+1 123-567-8989',
				extension: '123',
				personalMeetingUrls: ['https://zoom.us/j/123'],
				settings: {
					webConferencesRecorded: true,
					preventWebConferenceRecording: false,
					telephonyCallsImported: false,
					emailsImported: true,
					preventEmailImport: false,
					nonRecordedMeetingsImported: true,
					gongConnectEnabled: true,
				},
				managerId: '563515258458745',
				meetingConsentPageUrl:
					'https://join.gong.io/my-company/jon.snow?tkn=MoNpS9tMNt8BK7EZxQpSJl',
				spokenLanguages: [
					{
						language: 'es-ES',
						primary: true,
					},
				],
			},
		],
	},
};

export const gongNodeResponse = {
	getCall: [
		{
			json: {
				metaData: {
					id: '7782342274025937895',
					url: 'https://app.gong.io/call?id=7782342274025937895',
					title: 'Example call',
					scheduled: 1518863400,
					started: 1518863400,
					duration: 460,
					primaryUserId: '234599484848423',
					direction: 'Inbound',
					system: 'Outreach',
					scope: 'Internal',
					media: 'Video',
					language: 'eng',
					workspaceId: '623457276584334',
					sdrDisposition: 'Got the gatekeeper',
					clientUniqueId: '7JEHFRGXDDZFEW2FC4U',
					customData: 'Conference Call',
					purpose: 'Demo Call',
					meetingUrl: 'https://zoom.us/j/123',
					isPrivate: false,
					calendarEventId: 'abcde@google.com',
				},
				context: [
					{
						system: 'Salesforce',
						objects: [
							{
								objectType: 'Opportunity',
								objectId: '0013601230sV7grAAC',
								fields: [
									{
										name: 'name',
										value: 'Gong Inc.',
									},
								],
								timing: 'Now',
							},
						],
					},
				],
				parties: [
					{
						id: '56825452554556',
						emailAddress: 'test@test.com',
						name: 'Test User',
						title: 'Enterprise Account Executive',
						userId: '234599484848423',
						speakerId: '6432345678555530067',
						context: [
							{
								system: 'Salesforce',
								objects: [
									{
										objectType: 'Contact',
										objectId: '0013601230sV7grAAC',
										fields: [
											{
												name: 'name',
												value: 'Gong Inc.',
											},
										],
										timing: 'Now',
									},
								],
							},
						],
						affiliation: 'Internal',
						phoneNumber: '+1 123-567-8989',
						methods: ['Invitee'],
					},
				],
				content: {
					structure: [
						{
							name: 'Meeting Setup',
							duration: 67,
						},
					],
					trackers: [
						{
							id: '56825452554556',
							name: 'Competitors',
							count: 7,
							type: 'KEYWORD',
							occurrences: [
								{
									startTime: 32.56,
									speakerId: '234599484848423',
								},
							],
							phrases: [
								{
									count: 5,
									occurrences: [
										{
											startTime: 32.56,
											speakerId: '234599484848423',
										},
									],
									phrase: 'Walmart',
								},
							],
						},
					],
					topics: [
						{
							name: 'Objections',
							duration: 86,
						},
					],
					pointsOfInterest: {
						actionItems: [
							{
								snippetStartTime: 26,
								snippetEndTime: 26,
								speakerID: '56825452554556',
								snippet:
									"And I'll send you an invite with a link that you can use at that time as well.",
							},
						],
					},
					brief: 'string',
					outline: [
						{
							section: 'string',
							startTime: 0.5,
							duration: 0.5,
							items: [
								{
									text: 'string',
									startTime: 0.5,
								},
							],
						},
					],
					highlights: [
						{
							title: 'string',
							items: [
								{
									text: 'string',
									startTimes: [0.5],
								},
							],
						},
					],
					callOutcome: {
						id: 'MEETING_BOOKED',
						category: 'Answered',
						name: 'Meeting booked',
					},
					keyPoints: [
						{
							text: 'string',
						},
					],
				},
				interaction: {
					speakers: [
						{
							id: '56825452554556',
							userId: '234599484848423',
							talkTime: 145,
						},
					],
					interactionStats: [
						{
							name: 'Interactivity',
							value: 56,
						},
					],
					video: [
						{
							name: 'Browser',
							duration: 218,
						},
					],
					questions: {
						companyCount: 0,
						nonCompanyCount: 0,
					},
				},
				collaboration: {
					publicComments: [
						{
							id: '6843152929075440037',
							audioStartTime: 26,
							audioEndTime: 26,
							commenterUserId: '234599484848423',
							comment: 'new comment',
							posted: 1518863400,
							inReplyTo: '792390015966656336',
							duringCall: false,
						},
					],
				},
				media: {
					audioUrl: 'http://example.com',
					videoUrl: 'http://example.com',
				},
				transcript: [
					{
						speakerId: '6432345678555530067',
						topic: 'Objections',
						sentences: [
							{
								start: 460230,
								end: 462343,
								text: 'No wait, I think we should check that out first.',
							},
						],
					},
				],
			},
		},
	],
	getAllCall: [
		{
			json: {
				id: '7782342274025937895',
				url: 'https://app.gong.io/call?id=7782342274025937895',
				title: 'Example call',
				scheduled: 1518863400,
				started: 1518863400,
				duration: 460,
				primaryUserId: '234599484848423',
				direction: 'Inbound',
				system: 'Outreach',
				scope: 'Internal',
				media: 'Video',
				language: 'eng',
				workspaceId: '623457276584334',
				sdrDisposition: 'Got the gatekeeper',
				clientUniqueId: '7JEHFRGXDDZFEW2FC4U',
				customData: 'Conference Call',
				purpose: 'Demo Call',
				meetingUrl: 'https://zoom.us/j/123',
				isPrivate: false,
				calendarEventId: 'abcde@google.com',
				content: {
					topics: [
						{
							name: 'Objections',
							duration: 86,
						},
					],
				},
				parties: [
					{
						id: '56825452554556',
						emailAddress: 'test@test.com',
						name: 'Test User',
						title: 'Enterprise Account Executive',
						userId: '234599484848423',
						speakerId: '6432345678555530067',
						context: [
							{
								system: 'Salesforce',
								objects: [
									{
										objectType: 'Contact',
										objectId: '0013601230sV7grAAC',
										fields: [
											{
												name: 'name',
												value: 'Gong Inc.',
											},
										],
										timing: 'Now',
									},
								],
							},
						],
						affiliation: 'Internal',
						phoneNumber: '+1 123-567-8989',
						methods: ['Invitee'],
					},
				],
			},
		},
		{
			json: {
				id: '7782342274025937896',
				url: 'https://app.gong.io/call?id=7782342274025937896',
				title: 'Example call',
				scheduled: 1518863400,
				started: 1518863400,
				duration: 460,
				primaryUserId: '234599484848423',
				direction: 'Inbound',
				system: 'Outreach',
				scope: 'Internal',
				media: 'Video',
				language: 'eng',
				workspaceId: '623457276584334',
				sdrDisposition: 'Got the gatekeeper',
				clientUniqueId: '7JEHFRGXDDZFEW2FC4U',
				customData: 'Conference Call',
				purpose: 'Demo Call',
				meetingUrl: 'https://zoom.us/j/123',
				isPrivate: false,
				calendarEventId: 'abcde@google.com',
				content: {
					topics: [
						{
							name: 'Objections',
							duration: 86,
						},
					],
				},
				parties: [
					{
						id: '56825452554556',
						emailAddress: 'test@test.com',
						name: 'Test User',
						title: 'Enterprise Account Executive',
						userId: '234599484848423',
						speakerId: '6432345678555530067',
						context: [
							{
								system: 'Salesforce',
								objects: [
									{
										objectType: 'Contact',
										objectId: '0013601230sV7grAAC',
										fields: [
											{
												name: 'name',
												value: 'Gong Inc.',
											},
										],
										timing: 'Now',
									},
								],
							},
						],
						affiliation: 'Internal',
						phoneNumber: '+1 123-567-8989',
						methods: ['Invitee'],
					},
				],
			},
		},
	],
	getAllCallNoOptions: [
		{
			json: {
				id: '7782342274025937895',
				url: 'https://app.gong.io/call?id=7782342274025937895',
				title: 'Example call',
				scheduled: 1518863400,
				started: 1518863400,
				duration: 460,
				primaryUserId: '234599484848423',
				direction: 'Inbound',
				system: 'Outreach',
				scope: 'Internal',
				media: 'Video',
				language: 'eng',
				workspaceId: '623457276584334',
				sdrDisposition: 'Got the gatekeeper',
				clientUniqueId: '7JEHFRGXDDZFEW2FC4U',
				customData: 'Conference Call',
				purpose: 'Demo Call',
				meetingUrl: 'https://zoom.us/j/123',
				isPrivate: false,
				calendarEventId: 'abcde@google.com',
			},
		},
	],
	getUser: [
		{
			json: {
				id: '234599484848423',
				emailAddress: 'test@test.com',
				created: '2018-02-17T02:30:00-08:00',
				active: true,
				emailAliases: ['testAlias@test.com'],
				trustedEmailAddress: 'test@test.com',
				firstName: 'Jon',
				lastName: 'Snow',
				title: 'Enterprise Account Executive',
				phoneNumber: '+1 123-567-8989',
				extension: '123',
				personalMeetingUrls: ['https://zoom.us/j/123'],
				settings: {
					webConferencesRecorded: true,
					preventWebConferenceRecording: false,
					telephonyCallsImported: false,
					emailsImported: true,
					preventEmailImport: false,
					nonRecordedMeetingsImported: true,
					gongConnectEnabled: true,
				},
				managerId: '563515258458745',
				meetingConsentPageUrl:
					'https://join.gong.io/my-company/jon.snow?tkn=MoNpS9tMNt8BK7EZxQpSJl',
				spokenLanguages: [
					{
						language: 'es-ES',
						primary: true,
					},
				],
			},
		},
	],
	getAllUser: [
		{
			json: {
				id: '234599484848423',
				emailAddress: 'test@test.com',
				created: '2018-02-17T02:30:00-08:00',
				active: true,
				emailAliases: ['testAlias@test.com'],
				trustedEmailAddress: 'test@test.com',
				firstName: 'Jon',
				lastName: 'Snow',
				title: 'Enterprise Account Executive',
				phoneNumber: '+1 123-567-8989',
				extension: '123',
				personalMeetingUrls: ['https://zoom.us/j/123'],
				settings: {
					webConferencesRecorded: true,
					preventWebConferenceRecording: false,
					telephonyCallsImported: false,
					emailsImported: true,
					preventEmailImport: false,
					nonRecordedMeetingsImported: true,
					gongConnectEnabled: true,
				},
				managerId: '563515258458745',
				meetingConsentPageUrl:
					'https://join.gong.io/my-company/jon.snow?tkn=MoNpS9tMNt8BK7EZxQpSJl',
				spokenLanguages: [
					{
						language: 'es-ES',
						primary: true,
					},
				],
			},
		},
		{
			json: {
				id: '234599484848424',
				emailAddress: 'test@test.com',
				created: '2018-02-17T02:30:00-08:00',
				active: true,
				emailAliases: ['testAlias@test.com'],
				trustedEmailAddress: 'test@test.com',
				firstName: 'Jon',
				lastName: 'Snow',
				title: 'Enterprise Account Executive',
				phoneNumber: '+1 123-567-8989',
				extension: '123',
				personalMeetingUrls: ['https://zoom.us/j/123'],
				settings: {
					webConferencesRecorded: true,
					preventWebConferenceRecording: false,
					telephonyCallsImported: false,
					emailsImported: true,
					preventEmailImport: false,
					nonRecordedMeetingsImported: true,
					gongConnectEnabled: true,
				},
				managerId: '563515258458745',
				meetingConsentPageUrl:
					'https://join.gong.io/my-company/jon.snow?tkn=MoNpS9tMNt8BK7EZxQpSJl',
				spokenLanguages: [
					{
						language: 'es-ES',
						primary: true,
					},
				],
			},
		},
	],
};
