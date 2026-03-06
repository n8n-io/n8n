# Trivy ignore policy for n8n security scans.
# n8n's own published CVEs/GHSAs are intentionally excluded from internal
# scan results. Vulnerabilities in the n8n package should be visible to
# anyone running an older version — they indicate an upgrade is required.
# VEX (vex.openvex.json) covers third-party dependency false positives only.
package trivy

import future.keywords.if

default ignore := false

ignore if {
	input.PkgName == "n8n"
}
