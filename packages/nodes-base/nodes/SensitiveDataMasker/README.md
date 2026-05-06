#n8n-nodes-sensitive-data-masker
This is a community node for n8n that allows you to automatically detect and redact sensitive information such as Emails, Phone Numbers, and IBANs. It is designed to help with GDPR compliance and data anonymization.

Features
Recursive JSON Masking: Automatically traverses nested objects and arrays to mask sensitive strings while preserving the overall JSON structure.

Binary File Processing: Reads text-based files (logs, .txt, .csv), redacts sensitive information, and outputs a cleaned version of the file.

Advanced Regex Detection:

Emails: Detects standard email formats.

Phone Numbers: Flexible detection for international and local formats.

IBAN: Detects International Bank Account Numbers (handles spaces and various lengths).

Custom Patterns: Define your own specific strings or Regular Expressions (Regex) to be masked.

Customizable Replacement: Choose the masking label (e.g., [HIDDEN], [REDACTED], ***).

Usage Modes
1. JSON (All Properties)This is the default mode. It takes the entire input object from the previous node and performs a deep scan. Every string value found is checked against the active masking rules.Example Input:JSON{
  "user": "Alice Smith",
  "details": {
    "email": "alice.smith@provider.com",
    "phone": "+33 6 12 34 56 78"
  }
}
Example Output:JSON{
  "user": "Alice Smith",
  "details": {
    "email": "[HIDDEN]",
    "phone": "[HIDDEN]"
  }
}
2. Binary File
Use this mode when dealing with file objects (e.g., after a "Read Binary File" or "HTTP Request" node). It converts the file buffer to text, masks the content, and recreates the binary file.
### Node Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **Mode** | Options | Toggle between **JSON** (structured data) and **Binary** (file processing). |
| **Replacement Text** | String | The text that replaces the sensitive data. (Default: `[HIDDEN]`). |
| **Mask Emails** | Boolean | Enable or disable email address masking. |
| **Mask Phone Numbers** | Boolean | Enable or disable telephone number masking. |
| **Mask IBAN** | Boolean | Enable or disable IBAN (Bank account) masking. |
| **Custom Patterns** | Collection | Add your own custom strings or regex to the masking list. |

Requirements
n8n version: 1.0.0 or higher.

Package Manager: pnpm recommended.