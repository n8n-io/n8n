# Goals

* export all data (except execution related data) into a file
* import from said file
	* support flag `clean` (default: false)
		* false: if db is empty commence else print error
		* true: truncate all tables and commence
* foreign keys are retained

# Future Goals

* making the export atomic
	* for now users have to shut down all n8n instances while exporting and importing
* have foreign keys on while importing
	* for now we disable them before the import and enable them after it again

# File Format

* 1 file per table
* 1 line per row
* format: JSONL

* metadata file
	* contains last migration name that was run

* tared/zipped in the end

# Tasks

* include only columns (and all of them) when serializing
	* ignoring virtual properties and including ignored things like passwords
* make sure sequence counters are updated
* only allow importing into sqlite and pg

# Questions

* what if one record fails?
	* skip, abort?

