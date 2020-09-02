import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Provision a new certificate',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an certificate',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all certificates from a calendar',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an certificate',
			}
		],
		default: 'create',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const certificateFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Policy DN',
		name: 'PolicyDN',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
		description: 'The folder DN for the new certificate. If the value is missing, the folder name is the system default. If no system default is configured'
	},
	{
		displayName: 'Subject',
		name: 'Subject',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
		description: 'The Common Name field for the certificate Subject (DN)'
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				displayName: 'Approvers',
				name: 'Approvers',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				description: 'An array of one or more identities for certificate workflow approvers.'
			},
			{
				displayName: 'CADN',
				name: 'CADN',
				type: 'string',
				default: '',
				description: 'Only required when no policy sets a CA template. The Distinguished Name (DN) of the Trust Protection Platform Certificate Authority Template object for enrolling the certificate.'
			},
			{
				displayName: 'Certificate Type',
				name: 'CertificateType',
				type: 'options',
				options: [
					{
						name: 'Code Signing',
						value: 'Code Signing',
						description: 'X.509 Code Signing Certificate',
					},
					{
						name: 'Device',
						value: 'Device',
						description: 'X.509 Device Certificate',
					},
					{
						name: 'Server',
						value: 'Server',
						description: 'X.509 Server Certificate',
					},
					{
						name: 'User',
						value: 'User',
						description: 'X.509 User Certificate',
					},
				],
				default: '',
				description: ' One of the following Certificate objects. Ignores any other value.',
			},
			{
				displayName: 'City',
				name: 'City',
				type: 'string',
				default: '',
				description: ' The City field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.'
			},
			{
				displayName: 'Contacts',
				name: 'Contacts',
				type: 'string',
				default: '',
				description: 'An array of one or more identities for users or groups who receive notifications about events pertaining to the object'
			},
			{
				displayName: 'Country',
				name: 'Country',
				type: 'string',
				default: '',
				description: 'The Country field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.'
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Custom Fields',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: false,
				},
				description: '',
				options: [
					{
						name: 'customFielsValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Name',
								name: 'Name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Values',
								name: 'Values',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'CreatedBy',
				name: 'CreatedBy',
				type: 'string',
				default: 'Web SDK',
				description: 'The person, entity, or caller of this request. The default is Web SDK. Avoid overriding the default unless the caller is a significant enterprise application that is tightly integrated with Trust Protection Platform, such as a custom web portal. To add details, use Origin instead. If you want both attributes to have the same value, set only CreatedBy.'
			},
			{
				displayName: 'Devices',
				name: 'Devices',
				type: 'collection',
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Device'
				},
				default: {},
				options: [
					{
						displayName: 'Applications',
						name: 'applications',
						type: 'string',
						default: '',
						description: 'An array of one or more Application objects to allow software, which runs on ObjectName, to use the same certificate'
					},
					{
						displayName: 'Cloud Instance ID',
						name: 'CloudInstanceID',
						type: 'string',
						default: '',
						description: 'Required for Amazon EC2 provisioning. The unique cloud instance ID.',
					},
					{
						displayName: 'Cloud Region',
						name: 'CloudRegion',
						type: 'string',
						default: '',
						description: 'Required for Amazon EC2 provisioning. The geographic location where the cloud service instance resides. An instance in AWS can only exist in a single region.',
					},
					{
						displayName: 'Cloud Service',
						name: 'CloudService',
						type: 'string',
						default: '',
						description: 'Required for Amazon EC2 provisioning. AWS: An Amazon E2C cloud service. Requires you to install and configure the Cloud Instance Monitoring feature.',
					},
					{
						displayName: 'Concurrent Connection Limit',
						name: 'ConcurrentConnectionLimit',
						type: 'number',
						default: 0,
						description: 'Maximum number of connections the device will accept from Trust Protection Platform.',
					},
					{
						displayName: 'Contacts',
						name: 'Contacts',
						type: 'string',
						default: '',
						description: 'An array of one or more identities who receive notifications for this device.',
					},
					{
						displayName: 'Created By',
						name: 'CreatedBy',
						type: 'string',
						default: 'Web SDK',
						description: 'The person or entity that is creating the device and any associated software applications for the device. Any value is accepted. Default is Web SDK.',
					},
					{
						displayName: 'Credential DN',
						name: 'CredentialDN',
						type: 'string',
						default: '',
						description: 'The device credential.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description for this device.',
					},
					{
						displayName: 'Enforce Known Host',
						name: 'EnforceKnownHost',
						type: 'boolean',
						default: true,
						description: 'For SSH keys. true: Enable known host key enforcement. false: Disable known host key enforcement.',
					},
					{
						displayName: 'Host',
						name: 'host',
						type: 'string',
						default: '',
						description: 'The physical Fully Qualified Domain Name (FQDN) for the host or the IP address for a device.',
					},
					{
						displayName: 'Object Name',
						name: 'ObjectName',
						type: 'string',
						default: '',
						description: 'The device host name or IP address for the certificate object in Trust Protection Platform. If the value is missing, the object name is the Subject.',
					},
					{
						displayName: 'Port',
						name: 'port',
						type: 'number',
						default: 0,
						description: 'The port number to communicate with the device',
					},
					{
						displayName: 'Sudo Credential DN',
						name: 'SudoCredentialDN',
						type: 'number',
						default: 0,
						description: 'Use in conjunction with UseSudo. The DN that holds the password credential to be used if sudo is configured to prompt for a password when executing a command.',
					},
					{
						displayName: 'Temp Directory',
						name: 'TempDirectory',
						type: 'string',
						default: '',
						description: 'The host directory path to hold temporary files during provisioning. For example /tmp/. The folder should have the necessary write permissions.',
					},
					{
						displayName: 'Trusted Fingerprint',
						name: 'TrustedFingerprint',
						type: 'string',
						default: '',
						description: 'For Secure Shell (SSH) keys. The SSH server key fingerprint. If this value is set, and EnforceKnownHost is enabled, Trust Protection Platform will only successfully connect to the device if the hosts fingerprint matches this value.',
					},
					{
						displayName: 'Use Sudo',
						name: 'UseSudo',
						type: 'boolean',
						default: false,
						description: 'Use in conjunction with SudoCredentialDN. For cases where the device credentials require sudo privilege elevation to execute commands when installing the certificate on a Unix or Linux device: true: Execute commands using sudo when provisioning. false: Execute commands directly without using sudo.',
					},
				],
			},
			{
				displayName: 'Disable Automatic Renewal',
				name: 'DisableAutomaticRenewal',
				type: 'boolean',
				default: false,
				description: 'The setting to control whether manual intervention is required for certificate renewal.'
			},
			{
				displayName: 'EllipticCurve',
				name: 'EllipticCurve',
				type: 'options',
				options: [
					{
						name: 'P256',
						value: 'P256',
						description: 'Use Elliptic Prime Curve 256 bit encryption.'
					},
					{
						name: 'P384',
						value: 'P384',
						description: 'Use Elliptic Prime Curve 384 bit encryption.'
					},
					{
						name: 'P521',
						value: 'P521',
						description: 'Use Elliptic Prime Curve 521 bit encryption. (not supported by all Certificate Authorities).'
					},
				],
				default: '',
				description: 'For Elliptic Curve Cryptography (ECC), use this parameter in conjunction with KeyAlgorithm.',
			},
			{
				displayName: 'KeyAlgorithm',
				name: 'KeyAlgorithm',
				type: 'options',
				options: [
					{
						name: 'RSA',
						value: 'RSA',
						description: 'Rivest, Shamir, Adleman key (RSA).',
					},
					{
						name: 'ECC',
						value: 'ECC',
						description: 'Elliptic Curve Cryptography (ECC).'
					},
				],
				default: '',
				description: 'The encryption algorithm for the public ke:',
			},
			{
				displayName: 'KeyBitSize',
				name: 'KeyBitSize',
				type: 'number',
				default: 2048,
				description: 'Use this parameter when KeyAlgorithm is RSA. The number of bits to allow for key generation'
			},
			{
				displayName: 'Management Type',
				name: 'ManagementType',
				type: 'options',
				options: [
					{
						name: 'Enrollment',
						value: 'Enrollment',
						description: 'Issue a new certificate, renewcertificate, or key generation request to a CA for enrollment.',
					},
					{
						name: 'Monitoring',
						value: 'Monitoring',
						description: ' Allow Trust Protection Platform to monitor the certificate for expiration and renewal.'
					},
					{
						name: 'Provisioning',
						value: 'Provisioning',
						description: ' Issue a new certificate, renew a certificate, or send a key generation request to a CA for enrollment. Automatically install or provision the certificate.'
					},
					{
						name: 'Unassigned',
						value: 'Unassigned',
						description: 'Certificates are neither enrolled or monitored by Trust Protection Platform.',
					},
				],
				default: '',
				description: ' The level of management that Trust Protection Platform applies to the certificate',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: 'Web SDK',
				description: 'Additional information, such as the name and version of the calling application, that describes the source of this enrollment, renewal, or provisioning request. The default is Web SDK.'
			},
			{
				displayName: 'Policy DN',
				name: 'PolicyDN',
				type: 'string',
				default: '',
				description: 'The folder DN for the new certificate. If the value is missing, the folder name is the system default',
			},
			{
				displayName: 'Organization',
				name: 'Organization',
				type: 'string',
				default: '',
				description: 'The Organization field for the certificate Subject DN. Specify a value when the CSR centrally generates',
			},
			{
				displayName: 'Organizational Unit',
				name: 'OrganizationalUnit',
				type: 'string',
				default: '',
				description: 'The department or division within the organization that is responsible for maintaining the certificate.',
			},
			{
				displayName: 'PKCS10',
				name: 'PKCS10',
				type: 'string',
				default: '',
				description: 'The PKCS#10 Certificate Signing Request (CSR). Omit escape characters such as \n or \r\n. If this value is provided, any Subject DN fields and the KeyBitSize in the request are ignored.',
			},
			{
				displayName: 'Reenable',
				name: 'Reenable',
				type: 'boolean',
				default: false,
				description: ' The action to control a previously disabled certificate',
			},
			{
				displayName: 'Set Work To Do',
				name: 'SetWorkToDo',
				type: 'boolean',
				default: false,
				description: 'The setting to control certificate processing',
			},
			{
				displayName: 'State',
				name: 'State',
				type: 'string',
				default: '',
				description: 'The State field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.',
			},
			{
				displayName: 'Subject Alt Names',
				name: 'SubjectAltNamesUi',
				placeholder: 'Custom Fields',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: false,
				},
				description: '',
				options: [
					{
						name: 'SubjectAltNamesValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Typename',
								name: 'Typename',
								type: 'options',
								options: [
									{
										name: 'OtherName',
										value: 0,
										description: ' Specify a Uniform Resource Name (URN) or username',
									},
									{
										name: 'Email',
										value: 1,
									},
									{
										name: 'DNS',
										value: 2,
									},
									{
										name: 'URI',
										value: 6,
									},
									{
										name: 'IP Address',
										value: 7,
									},
								],
								description: 'An integer that represents the kind of SAN',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'The SAN friendly name that corresponds to the Type or TypeName parameter. For example, if a TypeName is IPAddress, the Name value is a valid IP address.',
							},
						],
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCalendars',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: ''
	},
	{
		displayName: 'certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				displayName: 'Send Updates',
				name: 'sendUpdates',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Notifications are sent to all guests',
					},
					{
						name: 'External Only',
						value: 'externalOnly',
						description: 'Notifications are sent to non-Google Calendar guests only',
					},
					{
						name: 'None',
						value: 'none',
						description: 'No notifications are sent. This value should only be used for migration use case',
					}
				],
				description: 'Whether to send notifications about the creation of the new certificate',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCalendars',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: ''
	},
	{
		displayName: 'certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				displayName: 'Max Attendees',
				name: 'maxAttendees',
				type: 'number',
				default: 0,
				description: `The maximum number of attendees to include in the response.</br>
				If there are more than the specified number of attendees, only the participant is returned`,
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: `Time zone used in the response. The default is the time zone of the calendar.`,
			}
		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				displayName: 'iCalUID',
				name: 'iCalUID',
				type: 'string',
				default: '',
				description: 'Specifies certificate ID in the iCalendar format to be included in the response',
			},
			{
				displayName: 'Max Attendees',
				name: 'maxAttendees',
				type: 'number',
				default: 0,
				description: `The maximum number of attendees to include in the response.</br>
				If there are more than the specified number of attendees, only the participant is returned`,
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Start Time',
						value: 'startTime',
						description: 'Order by the start date/time (ascending). This is only available when querying single certificates (i.e. the parameter singlecertificates is True)',
					},
					{
						name: 'Updated',
						value: 'updated',
						description: 'Order by last modification time (ascending).',
					}
				],
				default: '',
				description: 'The order of the certificates returned in the result.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Free text search terms to find certificates that match these terms in any field, except for extended properties.',
			},
			{
				displayName: 'Show Deleted',
				name: 'showDeleted',
				type: 'boolean',
				default: false,
				description: 'Whether to include deleted certificates (with status equals "cancelled") in the result.',
			},
			{
				displayName: 'Show Hidden Invitations',
				name: 'showHiddenInvitations',
				type: 'boolean',
				default: false,
				description: 'Whether to include hidden invitations in the result.',
			},
			{
				displayName: 'Single certificates',
				name: 'singlecertificates',
				type: 'boolean',
				default: false,
				description: `Whether to expand recurring certificates into instances and only return single one-off</br>
				certificates and instances of recurring certificates, but not the underlying recurring certificates themselves.`,
			},
			{
				displayName: 'Time Max',
				name: 'timeMax',
				type: 'dateTime',
				default: '',
				description: `Upper bound (exclusive) for an certificate's start time to filter by`,
			},
			{
				displayName: 'Time Min',
				name: 'timeMin',
				type: 'dateTime',
				default: '',
				description: `Lower bound (exclusive) for an certificate's end time to filter by`,
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: `Time zone used in the response. The default is the time zone of the calendar.`,
			},
			{
				displayName: 'Updated Min',
				name: 'updatedMin',
				type: 'dateTime',
				default: '',
				description: `Lower bound for an certificate's last modification time (as a RFC3339 timestamp) to filter by.<b/r>
				When specified, entries deleted since this time will always be included regardless of showDeleted`,
			}
		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Calendar',
		name: 'calendar',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCalendars'
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Use Default Reminders',
		name: 'useDefaultReminders',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: true
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				displayName: 'All Day',
				name: 'allday',
				type: 'boolean',
				options: [
					{
						name: 'Yes',
						value: 'yes',
					},
					{
						name: 'No',
						value: 'no',
					}
				],
				default: 'no',
				description: 'Wheater the certificate is all day or not',
			},
			{
				displayName: 'Attendees',
				name: 'attendees',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Attendee',
				},
				default: '',
				description: 'The attendees of the certificate',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getColors',
				},
				default: '',
				description: 'The color of the certificate.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'End time of the certificate.',
			},
			{
				displayName: 'Guests Can Invite Others',
				name: 'guestsCanInviteOthers',
				type: 'boolean',
				default: true,
				description: 'Whether attendees other than the organizer can invite others to the certificate',
			},
			{
				displayName: 'Guests Can Modify',
				name: 'guestsCanModify',
				type: 'boolean',
				default: false,
				description: 'Whether attendees other than the organizer can modify the certificate',
			},
			{
				displayName: 'Guests Can See Other Guests',
				name: 'guestsCanSeeOtherGuests',
				type: 'boolean',
				default: true,
				description: `Whether attendees other than the organizer can see who the certificate's attendees are.`,
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'Opaque identifier of the certificate',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Geographic location of the certificate as free-form text.',
			},
			{
				displayName: 'Max Attendees',
				name: 'maxAttendees',
				type: 'number',
				default: 0,
				description: `The maximum number of attendees to include in the response.</br>
				If there are more than the specified number of attendees, only the participant is returned`,
			},
			{
				displayName: 'Repeat Frecuency',
				name: 'repeatFrecuency',
				type: 'options',
				options: [
					{
						name: 'Daily',
						value: 'Daily',
					},
					{
						name: 'Weekly',
						value: 'weekly',
					},
					{
						name: 'Monthly',
						value: 'monthly',
					},
					{
						name: 'Yearly',
						value: 'yearly',
					}
				],
				default: '',
			},
			{
				displayName: 'Repeat Until',
				name: 'repeatUntil',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Repeat How Many Times?',
				name: 'repeatHowManyTimes',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Start time of the certificate.',
			},
			{
				displayName: 'Send Updates',
				name: 'sendUpdates',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
						description: ' Notifications are sent to all guests',
					},
					{
						name: 'External Only',
						value: 'externalOnly',
						description: 'Notifications are sent to non-Google Calendar guests only',
					},
					{
						name: 'None',
						value: 'none',
						description: 'No notifications are sent. This value should only be used for migration use case',
					}
				],
				description: 'Whether to send notifications about the creation of the new certificate',
				default: '',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Title of the certificate.',
			},
			{
				displayName: 'Show Me As',
				name: 'showMeAs',
				type: 'options',
				options: [
					{
						name: 'Available',
						value: 'transparent',
						description: 'The certificate does not block time on the calendar',
					},
					{
						name: 'Busy',
						value: 'opaque',
						description: ' The certificate does block time on the calendar.',
					},
				],
				default: 'opaque',
				description: 'Whether the certificate blocks time on the calendar',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: 'The timezone the certificate will have set. By default certificates are schedule on n8n timezone',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				options: [
					{
						name: 'Confidential',
						value: 'confidential',
						description: 'The certificate is private. This value is provided for compatibility reasons.',
					},
					{
						name: 'Default',
						value: 'default',
						description: 'Uses the default visibility for certificates on the calendar.',
					},
					{
						name: 'Public',
						value: 'public',
						description: 'The certificate is public and certificate details are visible to all readers of the calendar.',
					},
					{
						name: 'Private',
						value: 'private',
						description: 'The certificate is private and only certificate attendees may view certificate details.',
					}
				],
				default: 'default',
				description: 'Visibility of the certificate.',
			},
		],
	},
	{
		displayName: 'Reminders',
		name: 'remindersUi',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Reminder',
		typeOptions: {
			multipleValues: true
		},
		required: false,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'update',
				],
				useDefaultReminders: [
					false,
				],
			},
		},
		options: [
			{
				name: 'remindersValues',
				displayName: 'Reminder',
				values: [
					{
						displayName: 'Method',
						name: 'method',
						type: 'options',
						options: [
							{
								name: 'Email',
								value: 'email',
							},
							{
								name: 'Popup',
								value: 'popup',
							}
						],
						default: '',
					},
					{
						displayName: 'Minutes Before',
						name: 'minutes',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 40320,
						},
						default: 0,
					},
				],
			},
		],
		description: `If the certificate doesn't use the default reminders, this lists the reminders specific to the certificate`,
	}
] as INodeProperties[];
