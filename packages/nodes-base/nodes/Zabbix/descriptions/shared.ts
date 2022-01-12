import {
	INodePropertyOptions
} from 'n8n-workflow';

/*-------------------------------------------------------------------------- */
/*                          Options for parameters	                         */
/* ------------------------------------------------------------------------- */

const hostOptions = [
	{
		name: 'Host ID',
		value: 'hostid',
	},
	{
		name: 'Host',
		value: 'host',
	},
	{
		name: 'Description',
		value: 'description',
	},
	{
		name: 'Flags',
		value: 'flags',
	},
	{
		name: 'Inventory Mode',
		value: 'inventory_mode',
	},
	{
		name: 'IPMI Auth Type',
		value: 'ipmi_authtype',
	},
	{
		name: 'IPMI Password',
		value: 'ipmi_password',
	},
	{
		name: 'IPMI Privilege',
		value: 'ipmi_privilege',
	},
	{
		name: 'IPMI Username',
		value: 'ipmi_username',
	},
	{
		name: 'Maintenance From',
		value: 'maintenance_from',
	},
	{
		name: 'Maintenance Status',
		value: 'maintenance_status',
	},
	{
		name: 'Maintenance Type',
		value: 'maintenance_type',
	},
	{
		name: 'Maintenance ID',
		value: 'maintenanceid',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Proxy Host ID',
		value: 'proxy_hostid',
	},
	{
		name: 'Status',
		value: 'status',
	},
	{
		name: 'TLS Connect',
		value: 'tls_connect',
		description: 'Connections to host',
	},
	{
		name: 'TLS Accept',
		value: 'tls_accept',
		description: 'Connections from host',
	},
	{
		name: 'TLS Issuer',
		value: 'tls_issuer',
	},
	{
		name: 'TLS Subject',
		value: 'tls_subject',
	},
	{
		name: 'TLS PSK Identity',
		value: 'tls_psk_identity',
	},
	{
		name: 'TLS PSK',
		value: 'tls_psk',
		description: 'The preshared key',
	},
];

const graphOptions = [
	{
		name: 'Graph ID',
		value: 'graphid',
		description: 'ID of the graph',
	},
	{
		name: 'Height',
		value: 'height',
		description: 'Height of the graph in pixels',
	},
	{
		name: 'Name',
		value: 'name',
		description: 'Name of the graph',
	},
	{
		name: 'Width',
		value: 'width',
		description: 'Width of the graph in pixels',
	},
	{
		name: 'Flags',
		value: 'flags',
		description: 'Origin of the graph',
	},
	{
		name: 'Graph Type',
		value: 'graphtype',
		description: 'Graph\'s layout type',
	},
	{
		name: 'Percent Left',
		value: 'percent_left',
		description: 'Left percentile',
	},
	{
		name: 'Percent Right',
		value: 'percent_right',
		description: 'Right percentile',
	},
	{
		name: 'Show 3D',
		value: 'show_3d',
		description: 'Whether to show pie and exploded graphs in 3D',
	},
	{
		name: 'Show Legend',
		value: 'show_legend',
		description: 'Whether to show the legend on the graph',
	},
	{
		name: 'Show Work Period',
		value: 'show_work_period',
		description: 'Whether to show the working time on the graph',
	},
	{
		name: 'Show Triggers',
		value: 'show_triggers',
		description: 'Whether to show the trigger line on the graph',
	},
	{
		name: 'Template ID',
		value: 'templateid',
		description: 'ID of the parent template graph',
	},
	{
		name: 'Y Axis Maximum',
		value: 'yaxismax',
		description: 'The fixed maximum value for the Y axis',
	},
	{
		name: 'Y Axis Minimum',
		value: 'yaxismin',
		description: 'The fixed minimum value for the Y axis',
	},
	{
		name: 'Y Maximum Item ID',
		value: 'ymax_itemid',
		description: 'ID of the item that is used as the maximum value for the Y axis',
	},
	{
		name: 'Y Maximum Type',
		value: 'ymax_type',
		description: 'Maximum value calculation method for the Y axis',
	},
	{
		name: 'Y Minimum Item ID',
		value: 'ymin_itemid',
		description: 'ID of the item that is used as the minimum value for the Y axis',
	},
	{
		name: 'Y Minimum Type',
		value: 'ymin_type',
		description: 'Minimum value calculation method for the Y axis',
	},
];

export const triggersOptions = [
	{
		name: 'Trigger ID',
		value: 'screenid',
	},
	{
		name: 'Description',
		value: 'description',
	},
	{
		name: 'Expression',
		value: 'expression',
		description: 'Width of the screen',
	},
	{
		name: 'Operational Data',
		value: 'opdata',
	},
	{
		name: 'Comments',
		value: 'comments',
	},
	{
		name: 'Error',
		value: 'error',
	},
	{
		name: 'Flags',
		value: 'flags',
	},
	{
		name: 'Last Change',
		value: 'lastchange',
	},
	{
		name: 'Priority',
		value: 'priority',
	},
	{
		name: 'State',
		value: 'state',
	},
	{
		name: 'Status',
		value: 'status',
	},
	{
		name: 'Template ID',
		value: 'templateid',
	},
	{
		name: 'Type',
		value: 'type',
	},
	{
		name: 'URL',
		value: 'url',
	},
	{
		name: 'Value',
		value: 'value',
	},
	{
		name: 'Recovery Mode',
		value: 'recovery_mode',
	},
	{
		name: 'Recovery Expression',
		value: 'recovery_expression',
	},
	{
		name: 'Correlation Mode',
		value: 'correlation_mode',
	},
	{
		name: 'Correlation Tag',
		value: 'correlation_tag',
	},
	{
		name: 'Manual Close',
		value: 'manual_close',
	},
];

export const interfaceOptions = [
	{
		name: 'Interface ID',
		value: 'interfaceid',
		description: 'ID of the interface',
	},
	{
		name: 'DNS',
		value: 'dns',
		description: 'DNS name used by the interface',
	},
	{
		name: 'Host ID',
		value: 'hostid',
		description: 'ID of the host the interface belongs to',
	},
	{
		name: 'IP',
		value: 'ip',
		description: 'IP address used by the interface',
	},
	{
		name: 'Main',
		value: 'main',
		description: 'Whether the interface is used as default on the host',
	},
	{
		name: 'Port',
		value: 'port',
		description: 'Port number used by the interface',
	},
	{
		name: 'Type',
		value: 'type',
		description: 'Interface type',
	},
	{
		name: 'Use IP',
		value: 'useip',
		description: 'Whether the connection should be made via IP',
	},
	{
		name: 'Details',
		value: 'details',
		description: 'Additional object for interface. Required if interface \'type\' is SNMP',
	},
];

export const httpTestOptions = [
	{
		name: 'Host Test ID',
		value: 'httptestid',
		description: 'ID of the web scenario',
	},
	{
		name: 'Host ID',
		value: 'hostid',
		description: 'ID of the host that the web scenario belongs to',
	},
	{
		name: 'Name',
		value: 'name',
		description: 'Name of the web scenario',
	},
	{
		name: 'Agent',
		value: 'agent',
		description: 'User agent string that will be used by the web scenario',
	},
	{
		name: 'Application ID',
		value: 'applicationid',
		description: 'ID of the application that the web scenario belongs to',
	},
	{
		name: 'Authentication',
		value: 'authentication',
		description: 'Authentication method that will be used by the web scenario',
	},
	{
		name: 'delay',
		value: 'delay',
		description: 'Execution interval of the web scenario',
	},
	{
		name: 'Headers',
		value: 'headers',
		description: 'HTTP headers that will be sent when performing a request',
	},
	{
		name: 'HTTP Password',
		value: 'http_password',
		description: 'Password used for basic HTTP or NTLM authentication',
	},
	{
		name: 'HTTP Proxy',
		value: 'http_proxy',
		description: 'Proxy that will be used by the web scenario given as http://[username[:password]@]proxy.example.com[:port]',
	},
	{
		name: 'HTTP User',
		value: 'http_user',
		description: 'User name used for basic HTTP or NTLM authentication',
	},
	{
		name: 'Next Check',
		value: 'nextcheck',
		description: 'Time of the next web scenario execution',
	},
	{
		name: 'Retries',
		value: 'retries',
		description: 'Number of times a web scenario will try to execute each step before failing',
	},
	{
		name: 'SSL Certificate File',
		value: 'ssl_cert_file',
		description: 'Name of the SSL certificate file used for client authentication',
	},
	{
		name: 'SSS Key File',
		value: 'ssl_key_file',
		description: 'Name of the SSL private key file used for client authentication',
	},
	{
		name: 'SSS Key File',
		value: 'ssl_key_file',
		description: 'Name of the SSL private key file used for client authentication',
	},
	{
		name: 'SSL Key Password',
		value: 'ssl_key_password',
		description: 'SSL private key password',
	},
	{
		name: 'Status',
		value: 'status',
		description: 'Whether the web scenario is enabled',
	},
	{
		name: 'Template ID',
		value: 'templateid',
		description: 'ID of the parent template web scenario',
	},
	{
		name: 'Variables',
		value: 'variables',
		description: 'Web scenario variables',
	},
	{
		name: 'Verify Host',
		value: 'verify_host',
		description: 'Whether to verify that the host name specified in the SSL certificate matches the one used in the scenario',
	},
	{
		name: 'Verify Peer',
		value: 'verify_peer',
		description: 'Whether to verify the SSL certificate of the web server',
	},
];

const discoveryRuleOptions = [
	{
		name: 'Item ID',
		value: 'itemid',
		description: 'ID of the LLD rule',
	},
	{
		name: 'Delay',
		value: 'delay',
		description: 'Update interval of the LLD rule',
	},
	{
		name: 'Host ID',
		value: 'hostid',
		description: 'ID of the host that the LLD rule belongs to',
	},
	{
		name: 'Interface ID',
		value: 'interfaceid',
		description: 'ID of the LLD rule\'s host interface',
	},
	{
		name: 'Key',
		value: 'key_',
		description: 'LLD rule key',
	},
	{
		name: 'Name',
		value: 'name',
		description: 'Name of the LLD rule',
	},
	{
		name: 'Type',
		value: 'type',
		description: 'Type of the LLD rule',
	},
	{
		name: 'URL',
		value: 'url',
		description: 'URL string, required for HTTP agent LLD rule',
	},
	{
		name: 'Allow Traps',
		value: 'allow_traps',
		description: 'HTTP agent LLD rule field',
	},
	{
		name: 'Auth Type',
		value: 'authtype',
		description: 'Used only by SSH agent or HTTP agent LLD rules',
	},
	{
		name: 'Description',
		value: 'description',
		description: 'Description of the LLD rule',
	},
	{
		name: 'Error',
		value: 'error',
		description: 'Error text if there are problems updating the LLD rule',
	},
	{
		name: 'Follow Redirects',
		value: 'follow_redirects',
		description: 'HTTP agent LLD rule field. Follow response redirects while pooling data',
	},
	{
		name: 'Headers',
		value: 'headers',
		description: 'HTTP agent LLD rule field. Object with HTTP(S) request headers',
	},
	{
		name: 'HTTP Proxy',
		value: 'http_proxy',
		description: 'HTTP agent LLD rule field. HTTP(S) proxy connection string',
	},
	{
		name: 'IPMI Sensor',
		value: 'ipmi_sensor',
		description: 'IPMI sensor. Used only by IPMI LLD rules',
	},
	{
		name: 'JMX Endpoint',
		value: 'jmx_endpoint',
		description: 'JMX agent custom connection string',
	},
	{
		name: 'Lifetime',
		value: 'lifetime',
		description: 'Time period after which items that are no longer discovered will be deleted',
	},
	{
		name: 'Master Item ID',
		value: 'master_itemid',
		description: 'Master item ID. Required for Dependent item',
	},
	{
		name: 'Output Format',
		value: 'output_format',
		description: 'HTTP agent LLD rule field. Should response be converted to JSON.',
	},
	{
		name: 'Params',
		value: 'params',
		description: 'Additional parameters depending on the type of the LLD rule',
	},
	{
		name: 'Password',
		value: 'password',
		description: 'Password for authentication',
	},
	{
		name: 'Post Type',
		value: 'post_type',
		description: 'HTTP agent LLD rule field. Type of post data body stored in posts property',
	},
	{
		name: 'Posts',
		value: 'posts',
		description: 'HTTP agent LLD rule field. HTTP(S) request body data. Used with post_type',
	},
	{
		name: 'Private Key',
		value: 'privatekey',
		description: 'Name of the private key file',
	},
	{
		name: 'Public Key',
		value: 'publickey',
		description: 'Name of the public key file',
	},
	{
		name: 'Query Fields',
		value: 'query_fields',
		description: 'HTTP agent LLD rule field. Query parameters. Array of objects with \'key\':\'value\' pairs, where value can be empty string.',
	},
	{
		name: 'Request Method',
		value: 'request_method',
		description: 'HTTP agent LLD rule field. Type of request method.',
	},
	{
		name: 'Retrieve Mode',
		value: 'retrieve_mode',
		description: 'HTTP agent LLD rule field. What part of response should be stored.',
	},
	{
		name: 'SNMP OID',
		value: 'snmp_oid',
		description: 'SNMP OID',
	},
	{
		name: 'SSL Certificate File',
		value: 'ssl_cert_file',
		description: 'HTTP agent LLD rule field. Public SSL Key file path',
	},
	{
		name: 'SSL Key File',
		value: 'ssl_key_file',
		description: 'HTTP agent LLD rule field. Private SSL Key file path',
	},
	{
		name: 'SSL Key Password',
		value: 'ssl_key_password',
		description: 'HTTP agent LLD rule field. Password for SSL Key file',
	},
	{
		name: 'State',
		value: 'state',
		description: 'State of the LLD rule',
	},
	{
		name: 'Status',
		value: 'status',
		description: 'State of the LLD rule',
	},
	{
		name: 'Status Codes',
		value: 'status_codes',
		description: 'HTTP agent LLD rule field. Ranges of required HTTP status codes separated by commas',
	},
	{
		name: 'Template ID',
		value: 'templateid',
		description: 'ID of the parent template LLD rule',
	},
	{
		name: 'Timeout',
		value: 'timeout',
		description: 'HTTP agent LLD rule field. Item data polling request timeout. Support user macros',
	},
	{
		name: 'Trapper Hosts',
		value: 'trapper_hosts',
		description: 'Allowed hosts',
	},
	{
		name: 'Username',
		value: 'username',
		description: 'Username for authentication',
	},
	{
		name: 'Verify Host',
		value: 'verify_host',
		description: 'HTTP agent LLD rule field. Validate host name in URL is in Common Name field or a Subject Alternate Name field of host certificate',
	},
	{
		name: 'Verify Peer',
		value: 'verify_peer',
		description: 'HTTP agent LLD rule field. Validate is host certificate authentic',
	},
];

export const itemOptions = [
	{
		name: 'item ID',
		value: 'itemid',
	},
	{
		name: 'Delay',
		value: 'delay',
	},
	{
		name: 'Host ID',
		value: 'hostid',
	},
	{
		name: 'Interface ID',
		value: 'interfaceid',
	},
	{
		name: 'Key',
		value: 'key_',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Type',
		value: 'type',
	},
	{
		name: 'URL',
		value: 'url',
	},
	{
		name: 'Value Type',
		value: 'value_type',
	},
	{
		name: 'Allow Traps',
		value: 'allow_traps',
	},
	{
		name: 'Auth Type',
		value: 'authtype',
	},
	{
		name: 'Description',
		value: 'description',
	},
	{
		name: 'Error',
		value: 'error',
	},
	{
		name: 'Flags',
		value: 'flags',
	},
	{
		name: 'Follow Redirects',
		value: 'follow_redirects',
	},
	{
		name: 'Headers',
		value: 'headers',
	},
	{
		name: 'History',
		value: 'history',
	},
	{
		name: 'HTTP Proxy',
		value: 'http_proxy',
	},
	{
		name: 'Inventory Link',
		value: 'inventory_link',
	},
	{
		name: 'IPMI Sensor',
		value: 'ipmi_sensor',
	},
	{
		name: 'JMX Endpoint',
		value: 'jmx_endpoint',
	},
	{
		name: 'Last Clock',
		value: 'lastclock',
	},
	{
		name: 'Last Nanoseconds',
		value: 'lastns',
	},
	{
		name: 'Last Value',
		value: 'lastvalue',
	},
	{
		name: 'Log Time Tormat',
		value: 'logtimefmt',
	},
	{
		name: 'Master Item ID',
		value: 'master_itemid',
	},
	{
		name: 'Output Format',
		value: 'output_format',
	},
	{
		name: 'Params',
		value: 'params',
	},
	{
		name: 'Password',
		value: 'password',
	},
	{
		name: 'Post Type',
		value: 'post_type',
	},
	{
		name: 'Posts',
		value: 'posts',
	},
	{
		name: 'Previous Value',
		value: 'prevvalue',
	},
	{
		name: 'Private Key',
		value: 'privatekey',
	},
	{
		name: 'Public Key',
		value: 'publickey',
	},
	{
		name: 'Query Fields',
		value: 'query_fields',
	},
	{
		name: 'Request Method',
		value: 'request_method',
	},
	{
		name: 'Retrieve Mode',
		value: 'retrieve_mode',
	},
	{
		name: 'SNMP OID',
		value: 'snmp_oid',
	},
	{
		name: 'SSL Certificate File',
		value: 'ssl_cert_file',
	},
	{
		name: 'SSL Key File',
		value: 'ssl_key_file',
	},
	{
		name: 'SSL Password',
		value: 'ssl_key_password',
	},
	{
		name: 'State',
		value: 'state',
	},
	{
		name: 'Status',
		value: 'status',
	},
	{
		name: 'Status Codes',
		value: 'status_codes',
	},
	{
		name: 'Template ID',
		value: 'templateid',
	},
	{
		name: 'Timeout',
		value: 'timeout',
	},
	{
		name: 'Trapper Hosts',
		value: 'trapper_hosts',
	},
	{
		name: 'Trends',
		value: 'trends',
	},
	{
		name: 'Units',
		value: 'units',
	},
	{
		name: 'Username',
		value: 'username',
	},
	{
		name: 'Value Map ID',
		value: 'valuemapid',
	},
	{
		name: 'Verify Host',
		value: 'verify_host',
	},
	{
		name: 'Verify Peer',
		value: 'verify_peer',
	},
];

const inventoryOptions = [
	{
		name: 'Alias',
		value: 'alias',
	},
	{
		name: 'Asset Tag',
		value: 'asset_tag',
	},
	{
		name: 'Chassis',
		value: 'chassis',
	},
	{
		name: 'Contact',
		value: 'contact',
	},
	{
		name: 'Contact Number',
		value: 'contract_number',
	},
	{
		name: 'HW Decommissioning Date',
		value: 'date_hw_decomm',
	},
	{
		name: 'HW Maintenance Expiry Date',
		value: 'date_hw_expiry',
	},
	{
		name: 'HW Installation Date',
		value: 'date_hw_install',
	},
	{
		name: 'HW Purchase Date',
		value: 'date_hw_purchase',
	},
	{
		name: 'Deployment Status',
		value: 'deployment_status',
	},
	{
		name: 'Hardware',
		value: 'hardware',
	},
	{
		name: 'Detailed Hardware',
		value: 'hardware_full',
	},
	{
		name: 'Host Netmask',
		value: 'host_netmask',
	},
	{
		name: 'Host Networks',
		value: 'host_networks',
	},
	{
		name: 'Host Router',
		value: 'host_router',
	},
	{
		name: 'HW Architecture',
		value: 'hw_arch',
	},
	{
		name: 'Installer Name',
		value: 'installer_name',
	},
	{
		name: 'Location',
		value: 'location',
	},
	{
		name: 'Location Latitude',
		value: 'location_lat',
	},
	{
		name: 'Location Longitude',
		value: 'location_lon',
	},
	{
		name: 'MAC Address A',
		value: 'macaddress_a',
	},
	{
		name: 'MAC Address B',
		value: 'macaddress_b',
	},
	{
		name: 'Model',
		value: 'model',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Notes',
		value: 'notes',
	},
	{
		name: 'OOB IP Address',
		value: 'oob_ip',
	},
	{
		name: 'OOB Host Subnet Mask',
		value: 'oob_netmask',
	},
	{
		name: 'OOB Router',
		value: 'oob_router',
	},
	{
		name: 'OS Name',
		value: 'os',
	},
	{
		name: 'Detailed OS Name',
		value: 'os_full',
	},
	{
		name: 'Short OS Name',
		value: 'os_short',
	},
	{
		name: 'Primary POC Mobile Number',
		value: 'poc_1_cell',
	},
	{
		name: 'Primary Email',
		value: 'poc_1_email',
	},
	{
		name: 'Primary POC Name',
		value: 'poc_1_name',
	},
	{
		name: 'Primary POC Notes',
		value: 'poc_1_notes',
	},
	{
		name: 'Primary POC Phone A',
		value: 'poc_1_phone_a',
	},
	{
		name: 'Primary POC Phone B',
		value: 'poc_1_phone_b',
	},
	{
		name: 'Primary POC Screen Name',
		value: 'poc_1_screen',
	},
	{
		name: 'Secondary POC Mobile Number',
		value: 'poc_2_cell',
	},
	{
		name: 'Secondary POC Email',
		value: 'poc_2_email',
	},
	{
		name: 'Secondary POC Name',
		value: 'poc_2_name',
	},
	{
		name: 'Secondary POC Notes',
		value: 'poc_2_notes',
	},
	{
		name: 'Secondary POC Phone A',
		value: 'poc_2_phone_a',
	},
	{
		name: 'Secondary POC Phone B',
		value: 'poc_2_phone_b',
	},
	{
		name: 'Secondary POC Screen Name',
		value: 'poc_2_screen',
	},
	{
		name: 'Serial Number A',
		value: 'serialno_a',
	},
	{
		name: 'Serial Number B',
		value: 'serialno_b',
	},
	{
		name: 'Site Address A',
		value: 'site_address_a',
	},
	{
		name: 'Site Address B',
		value: 'site_address_b',
	},
	{
		name: 'Site Address C',
		value: 'site_address_c',
	},
	{
		name: 'Site City',
		value: 'site_city',
	},
	{
		name: 'Site Country',
		value: 'site_country',
	},
	{
		name: 'Site Notes',
		value: 'site_notes',
	},
	{
		name: 'Site Rack Location',
		value: 'site_rack',
	},
	{
		name: 'Site State',
		value: 'site_state',
	},
	{
		name: 'Site Zip/Postal Code',
		value: 'site_zip',
	},
	{
		name: 'Software',
		value: 'software',
	},
	{
		name: 'Software Application A',
		value: 'software_app_a',
	},
	{
		name: 'Software Application B',
		value: 'software_app_b',
	},
	{
		name: 'Software Application C',
		value: 'software_app_c',
	},
	{
		name: 'Software Application D',
		value: 'software_app_d',
	},
	{
		name: 'Software Application E',
		value: 'software_app_e',
	},
	{
		name: 'Software Details',
		value: 'software_full',
	},
	{
		name: 'Tag',
		value: 'tag',
	},
	{
		name: 'Type',
		value: 'type',
	},
	{
		name: 'Type Details',
		value: 'type_full',
	},
	{
		name: 'URL A',
		value: 'url_a',
	},
	{
		name: 'URL B',
		value: 'url_b',
	},
	{
		name: 'URL C',
		value: 'url_c',
	},
	{
		name: 'Vendor',
		value: 'vendor',
	},
];

const eventOptions = [
	{
		name: 'Event ID',
		value: 'eventid',
	},
	{
		name: 'Source',
		value: 'source',
	},
	{
		name: 'Object',
		value: 'object',
	},
	{
		name: 'Object ID',
		value: 'objectid',
	},
	{
		name: 'Acknowledged',
		value: 'acknowledged',
	},
	{
		name: 'Clock',
		value: 'clock',
	},
	{
		name: 'Nanoseconds',
		value: 'ns',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Value',
		value: 'value',
	},
	{
		name: 'Severity',
		value: 'severity',
	},
	{
		name: 'Recovery event ID',
		value: 'r_eventid',
	},
	{
		name: 'Closing event ID',
		value: 'c_eventid',
	},
	{
		name: 'Correlation ID',
		value: 'correlationid',
	},
	{
		name: 'User ID',
		value: 'userid',
	},
	{
		name: 'Suppressed',
		value: 'suppressed',
	},
	{
		name: 'Operational Data',
		value: 'opdata',
	},
	{
		name: 'URLs',
		value: 'urls',
	},
];

const historyOptions = [
	{
		name: 'Clock',
		value: 'clock',
		description: 'Time when that value was received',
	},
	{
		name: 'Item ID',
		value: 'itemid',
	},
	{
		name: 'Nanoseconds',
		value: 'ns',
		description: 'Nanoseconds when the value was received',
	},
	{
		name: 'Value',
		value: 'value',
		description: 'Received value',
	},
	{
		name: 'Log Event ID',
		value: 'logeventid',
		description: 'Windows event log entry ID. Only log history property',
	},
	{
		name: 'Severity',
		value: 'severity',
		description: 'Windows event log entry level',
	},
	{
		name: 'Source',
		value: 'source',
		description: 'Windows event log entry source',
	},
	{
		name: 'Timestamp',
		value: 'timestamp',
		description: 'Windows event log entry time as a Unix timestamp',
	},
];

const problemOptions = [
	{
		name: 'Event ID',
		value: 'eventid',
	},
	{
		name: 'Source',
		value: 'source',
	},
	{
		name: 'Object',
		value: 'object',
	},
	{
		name: 'Object ID',
		value: 'objectid',
	},
	{
		name: 'Clock',
		value: 'clock',
	},
	{
		name: 'Nanoseconds',
		value: 'ns',
		description: 'Nanoseconds when the recovery event was created',
	},
	{
		name: 'Recovery Event ID',
		value: 'r_eventid',
	},
	{
		name: 'Recovery Clock',
		value: 'r_clock',
		description: 'Time when the recovery event was created',
	},
	{
		name: 'Recovery Nanoseconds',
		value: 'r_ns',
		description: 'Nanoseconds when the recovery event was created',
	},
	{
		name: 'Correlation ID',
		value: 'correlationid',
		description: 'Correlation rule ID if this event was recovered by global correlation rule',
	},
	{
		name: 'User ID',
		value: 'userid',
		description: 'User ID if the problem was manually closed',
	},
	{
		name: 'Name',
		value: 'name',
		description: 'Resolved problem name',
	},
	{
		name: 'Acknowledged',
		value: 'acknowledged',
		description: 'Acknowledge state for problem',
	},
	{
		name: 'Severity',
		value: 'severity',
		description: 'Problem current severity',
	},
	{
		name: 'Suppressed',
		value: 'suppressed',
		description: 'Whether the problem is suppressed',
	},
	{
		name: 'Operational Data',
		value: 'opdata',
		description: 'Operational data with expanded macros',
	},
	{
		name: 'URLs',
		value: 'urls',
		description: 'Active media types URLs',
	},
];

/*-------------------------------------------------------------------------- */
/*                       Common "get" method parameters	                     */
/* ------------------------------------------------------------------------- */

// https://www.zabbix.com/documentation/5.0/en/manual/api/reference_commentary#common-get-method-parameters

export function getCommonGetParameters(resource: string) {
	return [
		{
			displayName: 'Count Output',
			name: 'countOutput',
			type: 'boolean',
			default: false,
			description: 'Return the number of records in the result instead of the actual data.',
		},
		{
			displayName: 'Editable',
			name: 'editable',
			type: 'boolean',
			default: false,
			description: 'If set to true, return only objects that the user has write permissions to. Default: false.',
		},
		{
			displayName: 'Exclude Search',
			name: 'excludeSearch',
			type: 'boolean',
			default: false,
			description: 'Return results that do not match the criteria given in the search parameter.',
		},
		{
			displayName: 'Filter',
			name: 'filter',
			type: 'fixedCollection', // type - object
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			placeholder: 'Add Filter',
			description: 'Return only those results that exactly match the given filter. Doesn\'t work for text fields.',
			options: [
				{
					displayName: 'Filter',
					name: 'filter',
					values: [
						{
							displayName: 'Key',
							name: 'key',
							type: 'options',
							default: '',
							description: 'The property name.',
							options: getOptions(resource),
						},
						{
							displayName: 'Values',
							name: 'values',
							type: 'collection',
							typeOptions: {
								multipleValues: true,
								multipleValueButtonText: 'Add Values',
							},
							placeholder: 'Add Value',
							default: {},
							description: 'An array of values to match against.',
							options: [
								{
									displayName: 'Value',
									name: 'value',
									type: 'number',
									default: 0,
									description: 'A value to match against.',
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: {
				numberStepSize: 1,
			},
			default: 0,
			description: 'Limit the number of records returned.',
		},

		{
			displayName: 'Output',
			name: 'outputOptions',
			type: 'options', // type - query
			default: 'extend',
			description: 'Object properties to be returned. Default: extend.',
			options: [
				{
					name: 'Extend',
					value: 'extend',
					description: 'Returns all object properties',
				},
				{
					name: 'Count',
					value: 'count',
					description: 'Returns the number of retrieved records, supported only by certain subselects',
				},
				{
					name: 'Property Names',
					value: 'propertyNames',
					description: 'Array of property names to return only specific properties (add parameter Output Property Names)',
				},
			],
		},
		{
			displayName: 'Output Property Names',
			name: 'outputPropertyNames',
			type: 'collection',
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Output',
			},
			displayOptions: {
				show: {
					outputOptions: [
						'propertyNames',
					],
				},
			},
			default: {},
			placeholder: 'Add Output Value',
			description: '',
			options: [
				{
					displayName: 'Value',
					name: 'value',
					type: 'options',
					default: '',
					description: 'The property name to return.',
					options: getOptions(resource),
				},
			],
		},
		{
			displayName: 'Search',
			name: 'search',
			type: 'fixedCollection', // type - object
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			placeholder: 'Add Search',
			description: 'Return results that match the given wildcard search (case-insensitive). If no additional options are given, this will perform a LIKE "%…%" search. Works only for string and text fields.',
			options: [
				{
					displayName: 'Search',
					name: 'search',
					values: [
						{
							displayName: 'Key',
							name: 'key',
							type: 'options',
							default: '',
							description: 'The property name.',
							options: getOptions(resource),
						},
						{
							displayName: 'Values',
							name: 'values',
							type: 'collection',
							typeOptions: {
								multipleValues: true,
								multipleValueButtonText: 'Add Values',
							},
							placeholder: 'Add Value',
							default: {},
							description: 'An array of values to match against.',
							options: [
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'A value to match against.',
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: 'Search By Any',
			name: 'searchByAny',
			type: 'boolean',
			default: false,
			description: 'If set to true, return results that match any of the criteria given in the filter or search parameter instead of all of them. Default: false.',
		},
		{
			displayName: 'Search Wildcards Enabled',
			name: 'searchWildcardsEnabled',
			type: 'boolean',
			default: false,
			description: 'If set to true enables the use of "*" as a wildcard character in the search parameter. Default: false.',
		},
		{
			displayName: 'Sort Field',
			name: 'sortfield',
			type: 'multiOptions',
			default: [],
			description: 'Sort the result by the given properties.',
			options: [
				...getSortfieldOptions(resource),
			],
		},
		{
			displayName: 'Sort Order',
			name: 'sortorder',
			type: 'collection', // type - string/array
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Sort',
			},
			placeholder: 'Add Sort Order',
			default: {},
			description: 'Order of sorting. If an array is passed, each value will be matched to the corresponding property given in the sortfield parameter.',
			options: [
				{
					displayName: 'Sort Order',
					name: 'sortorder',
					type: 'options',
					default: 'ASC',
					options: [
						{
							name: 'ascending',
							value: 'ASC',
						},
						{
							name: 'descending',
							value: 'DESC',
						},
					],
					description: 'Order of sorting.',
				},
			],
		},
		{
			displayName: 'Start Search',
			name: 'startSearch',
			type: 'boolean',
			default: false,
			description: 'The search parameter will compare the beginning of fields, that is, perform a LIKE "…%" search instead. Ignored if searchWildcardsEnabled is set to true.',
		},
	];
}

// Part of the common get method parameters
// But some resources do not support it (e.g. history)
export const preserveKeys = [
	{
		displayName: 'Preserve Keys',
		name: 'preservekeys',
		type: 'boolean',
		default: false,
		description: 'Use IDs as keys in the resulting array.',
	},
];

export const limitSelects = [
	{
		displayName: 'Limit Selects',
		name: 'limitSelects',
		type: 'number',
		typeOptions: {
			numberStepSize: 1,
		},
		default: 0,
		description: 'Limits the number of records returned by subselects. Applies to the following subselects: selectGraphs - results will be sorted by name; selectTriggers - results will be sorted by description.',
	},
];

export function getSortfieldOptions(resource: string): INodePropertyOptions[] {
	let options: INodePropertyOptions[] = [];
	switch (resource) {
		case 'event': {
			options = sortfieldOptionsEvent;
			break;
		}
		case 'history': {
			options = sortfieldOptionsHistory;
			break;
		}
		case 'host': {
			options = sortfieldOptionsHost;
			break;
		}
		case 'item': {
			options = sortfieldOptionsItem;
			break;
		}
		case 'problem': {
			options = sortfieldOptionsProblem;
		}
		default: {
			break;
		}
	}
	return options;
}

export function getOptions(resource: string): INodePropertyOptions[] {
	let options: INodePropertyOptions[] = [];
	switch (resource) {
		case 'event': {
			options = eventOptions;
			break;
		}
		case 'history': {
			options = historyOptions;
			break;
		}
		case 'host': {
			options = hostOptions;
			break;
		}
		case 'item': {
			options = itemOptions;
			break;
		}
		case 'problem': {
			options = problemOptions;
		}
		default: {
			break;
		}
	}
	return options;
}

// Possible values for sorting of history:get
export const sortfieldOptionsEvent = [
	{
		name: 'Event ID',
		value: 'eventid',
	},
	{
		name: 'Object ID',
		value: 'objectid',
	},
	{
		name: 'Clock',
		value: 'clock',
	},
];

// Possible values for sorting of history:get
export const sortfieldOptionsHistory = [
	{
		name: 'Item ID',
		value: 'itemid',
	},
	{
		name: 'Clock',
		value: 'clock',
	},
];

// Possible values for sorting of host:get
export const sortfieldOptionsHost = [
	{
		name: 'Host ID',
		value: 'hostid',
	},
	{
		name: 'Host',
		value: 'host',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Status',
		value: 'status',
	},
];

// Possible values for sorting of item:get
export const sortfieldOptionsItem = [
	{
		name: 'Item ID',
		value: 'itemid',
	},
	{
		name: 'Name',
		value: 'name',
	},
	{
		name: 'Key',
		value: 'key_',
	},
	{
		name: 'Delay',
		value: 'delay',
	},
	{
		name: 'History',
		value: 'history',
	},
	{
		name: 'Trends',
		value: 'trends',
	},
	{
		name: 'Type',
		value: 'type',
	},
	{
		name: 'Status',
		value: 'status',
	},
];

// Possible values for sorting of history:get
export const sortfieldOptionsProblem = [
	{
		name: 'Event ID',
		value: 'eventid',
	},
];

/*-------------------------------------------------------------------------- */
/*                       Common query type properties	                     */
/* ------------------------------------------------------------------------- */

export const selectApplicationsQuery = [
	{
		displayName: 'Select Applications',
		name: 'selectApplicationsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an applications property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Application Property Names)',
			},
		],
	},
	{
		displayName: 'Application Property Names',
		name: 'applicationPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectApplicationsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Application ID',
				value: 'applicationid',
				description: 'ID of the application',
			},
			{
				name: 'Host ID',
				value: 'hostid',
				description: 'ID of the host that the application belongs to',
			},
			{
				name: 'Name',
				value: 'name',
				description: 'Name of the application',
			},
			{
				name: 'Flags',
				value: 'flags',
				description: 'Origin of the application',
			},
			{
				name: 'Templateids',
				value: 'templateids',
				description: 'IDs of the parent template applications',
			},
		],
	},
];

export const selectDiscoveriesQuery = [
	{
		displayName: 'Select Discoveries',
		name: 'selectDiscoveriesOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a discoveries property with host low-level discovery rules.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Discoveries Property Names)',
			},
		],
	},
	{
		displayName: 'Discovery Property Names',
		name: 'discoveryPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectDiscoveriesOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: discoveryRuleOptions,
	},
];

export const selectDiscoveryRuleQuery = [
	{
		displayName: 'Select Discovery Rule',
		name: 'selectDiscoveryRuleOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a discoveryRule property with the low-level discovery rule that created the host (from host prototype in VMware monitoring).',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Discovery Rule Property Names)',
			},
		],
	},
	{
		displayName: 'Discovery Rule Property Names',
		name: 'discoveryRulePropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectDiscoveryRuleOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: discoveryRuleOptions,
	},
];


export const selectGraphsQuery = [
	{
		displayName: 'Select Graphs',
		name: 'selectGraphsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a graphs property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Graphs Property Names)',
			},
		],
	},
	{
		displayName: 'Graphs Property Names',
		name: 'graphPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectGraphsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: graphOptions,
	},
];

export const selectGroupsQuery = [
	{
		displayName: 'Select Groups',
		name: 'selectGroupsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a groups property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Group Property Names)',
			},
		],
	},
	{
		displayName: 'Group Property Names',
		name: 'groupPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectGroupsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Group ID',
				value: 'groupid',
				description: 'ID of the host group',
			},
			{
				name: 'Name',
				value: 'name',
				description: 'Name of the host group',
			},
			{
				name: 'Flags',
				value: 'flags',
				description: 'Origin of the host group',
			},
			{
				name: 'Internal',
				value: 'internal',
				description: 'Whether the group is used internally by the system. An internal group cannot be deleted',
			},
		],
	},
];

export const selectHostDiscoveryQuery = [
	{
		displayName: 'Select Host Discovery',
		name: 'selectHostDiscoveryOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a hostDiscovery property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Host Discovery Property Names)',
			},
		],
	},
	{
		displayName: 'Host Discovery Property Names',
		name: 'hostDiscoveryPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectHostDiscoveryOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Host',
				value: 'host',
				description: 'Host of the host prototype',
			},
			{
				name: 'Host ID',
				value: 'hostid',
				description: 'ID of the discovered host or host prototype',
			},
			{
				name: 'Parent Host ID',
				value: 'parent_hostid',
				description: 'ID of the host prototype from which the host has been created',
			},
			{
				name: 'Parent Item ID',
				value: 'parent_itemid',
				description: 'ID of the LLD rule that created the discovered host',
			},
			{
				name: 'Last Check',
				value: 'lastcheck',
				description: 'Time when the host was last discovered',
			},
			{
				name: 'Timestamp Delete',
				value: 'ts_delete',
				description: 'Time when a host that is no longer discovered will be deleted',
			},
		],
	},
];

export const selectHttpTestsQuery = [
	{
		displayName: 'Select HTTP Tests',
		name: 'selectHttpTestsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an httpTests property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter HTTP Tests Property Names)',
			},
		],
	},
	{
		displayName: 'HTTP Tests Property Names',
		name: 'httpTestsPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectHttpTestsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: httpTestOptions,
	},
];

export const selectInterfacesQuery = [
	{
		displayName: 'Select Interfaces',
		name: 'selectInterfacesOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an interfaces property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Interfaces Property Names)',
			},
		],
	},
	{
		displayName: 'Interfaces Property Names',
		name: 'interfacePropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectInterfacesOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: interfaceOptions,
	},
];

export const selectInventoryQuery = [
	{
		displayName: 'Select Inventory',
		name: 'selectInventoryOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an inventory property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Inventory Property Names)',
			},
		],
	},
	{
		displayName: 'Inventory Property Names',
		name: 'inventoryPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectInventoryOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: inventoryOptions,
	},
];

export const selectItemsQuery = [
	{
		displayName: 'Select Items',
		name: 'selectItemsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an items property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Items Property Names)',
			},
		],
	},
	{
		displayName: 'Items Property Names',
		name: 'itemsPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectItemsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: itemOptions,
	},
];

export const selectMacrosQuery = [
	{
		displayName: 'Select Macros',
		name: 'selectMacrosOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a macros property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Macros Property Names)',
			},
		],
	},
	{
		displayName: 'Macros Property Names',
		name: 'macroPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectMacrosOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Global Macro ID',
				value: 'globalmacroid',
			},
			{
				name: 'Macro',
				value: 'macro',
			},
			{
				name: 'Value',
				value: 'value',
			},
			{
				name: 'Type',
				value: 'type',
			},
			{
				name: 'Description',
				value: 'description',
			},
		],
	},
];

export const selectParentTemplatesQuery = [
	{
		displayName: 'Select Parent Templates',
		name: 'selectParentTemplatesOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a parentTemplates property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Parent Templates Property Names)',
			},
		],
	},
	{
		displayName: 'Parent Templates Property Names',
		name: 'parentTemplatePropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectParentTemplatesOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Template ID',
				value: 'templateid',
			},
			{
				name: 'Host',
				value: 'host',
			},
			{
				name: 'Description',
				value: 'description',
			},
			{
				name: 'Name',
				value: 'name',
			},
		],
	},
];

export const selectScreensQuery = [
	{
		displayName: 'Select Screens',
		name: 'selectScreensOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a screens property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Screen Property Names)',
			},
		],
	},
	{
		displayName: 'Screen Property Names',
		name: 'screenPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectScreensOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: [
			{
				name: 'Screen ID',
				value: 'screenid',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'H Size',
				value: 'hsize',
				description: 'Width of the screen',
			},
			{
				name: 'V Size',
				value: 'vsize',
				description: 'Height of the screen',
			},
			{
				name: 'User ID',
				value: 'userid',
			},
			{
				name: 'Private',
				value: 'private',
				description: 'Type of screen sharing',
			},
		],
	},
];

export const selectTriggersQuery = [
	{
		displayName: 'Select Triggers',
		name: 'selectTriggersOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a triggers property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Trigger Property Names)',
			},
		],
	},
	{
		displayName: 'Trigger Property Names',
		name: 'triggerPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectTriggersOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: triggersOptions,
	},
];

export const searchInventory = [
	{
		displayName: 'Search Inventory',
		name: 'searchInventory',
		type: 'fixedCollection', // type - object
		typeOptions: {
			multipleValues: true,
		},
		default: {searchInventory: []},
		description: 'Return results that match the given wildcard search (case-insensitive). Works only for string and text fields. If no additional options are given, this will perform a LIKE "%…%" search.',
		options: [
			{
				displayName: 'Search Inventory',
				name: 'searchInventory',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'options',
						default: 'os',
						options: inventoryOptions,
						description: 'The property name.',
					},
					{
						displayName: 'Values',
						name: 'values',
						type: 'collection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Value',
						default: {},
						description: 'An array of values to match against.',
						options: [
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'A value to match against.',
							},
						],
					},
				],
			},
		],
	},
];

export const selectHostsQuery = [
	{
		displayName: 'Select Hosts',
		name: 'selectHostsOptions',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a hosts property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Property Names',
				value: 'propertyNames',
				description: 'Return only specific properties (add parameter Host Property Names)',
			},
		],
	},
	{
		displayName: 'Host Property Names',
		name: 'hostPropertyNames',
		type: 'multiOptions',
		displayOptions: {
			show: {
				selectHostsOptions: [
					'propertyNames',
				],
			},
		},
		default: [],
		description: 'Choose which properties to return.',
		options: hostOptions,
	},
];

export const selectAcknowledgesQuery = [
	{
		displayName: 'Select Acknowledges',
		name: 'selectAcknowledges',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return an acknowledges property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Returns the number of retrieved records, supported only by certain subselects',
			},
		],
	},
];

export const selectTagsQuery = [
	{
		displayName: 'Select Tags',
		name: 'selectTags',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a tags property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
		],
	},
];

export const selectSuppressionDataQuery = [
	{
		displayName: 'Select Suppression Data',
		name: 'selectSuppressionData',
		type: 'options', // type - query
		default: 'extend',
		description: 'Return a tags property.',
		options: [
			{
				name: 'Extend',
				value: 'extend',
				description: 'Returns all object properties',
			},
		],
	},
];

/*-------------------------------------------------------------------------- */
/*                              Common properties	                         */
/* ------------------------------------------------------------------------- */

export const itemIds = {
	displayName: 'Item IDs',
	name: 'itemids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Item',
	},
	placeholder: 'Add Item ID',
	default: {},
	description: 'Return only records for the given item IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the item.',
		},
	],
};

export const groupIds = {
	displayName: 'Group IDs',
	name: 'groupids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Group',
	},
	placeholder: 'Add Group ID',
	default: {},
	description: 'Return only records for the given group IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the group.',
		},
	],
};

export const templateIds = {
	displayName: 'Template IDs',
	name: 'templateids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Template',
	},
	placeholder: 'Add Template ID',
	default: {},
	description: 'Return only records for the given template IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the template.',
		},
	],
};

export const proxyIds = {
	displayName: 'Proxy IDs',
	name: 'proxyids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Proxy',
	},
	placeholder: 'Add Proxy ID',
	default: {},
	description: 'Return only records for the given proxy IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the proxy.',
		},
	],
};

export const interfaceIds = {
	displayName: 'Interface IDs',
	name: 'interfaceids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Interface',
	},
	placeholder: 'Add Interface ID',
	default: {},
	description: 'Return only records for the given interface IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the interface.',
		},
	],
};

export const graphIds = {
	displayName: 'Graph IDs',
	name: 'graphids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Graph',
	},
	placeholder: 'Add Graph ID',
	default: {},
	description: 'Return only records for the given graph IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the graph.',
		},
	],
};

export const triggerIds = {
	displayName: 'Trigger IDs',
	name: 'triggerids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Trigger',
	},
	placeholder: 'Add Trigger ID',
	default: {},
	description: 'Return only records for the given trigger IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the trigger.',
		},
	],
};

export const applicationIds = {
	displayName: 'Application IDs',
	name: 'applicationids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Application',
	},
	default: {},
	placeholder: 'Add Application ID',
	description: 'Return only records for the given application IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the application.',
		},
	],
};

export const eventIds = {
	displayName: 'Event IDs',
	name: 'eventids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Event',
	},
	placeholder: 'Add Event ID',
	default: {},
	description: 'Return only records for the given event IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the host.',
		},
	],
};

export const hostIds = {
	displayName: 'Host IDs',
	name: 'hostids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Host',
	},
	placeholder: 'Add Host ID',
	default: {},
	description: 'Return only records for the given host IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the host.',
		},
	],
};

export const objectIds = {
	displayName: 'Object IDs',
	name: 'objectids',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Object',
	},
	default: {},
	placeholder: 'Add Object ID',
	description: 'Return only records for the given object IDs.',
	options: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'ID of the application.',
		},
	],
};
