# 🧩 TableFlow

> **Category:** Database / Data Management
> **Node Type:** Integration
> **Version:** 1.0
> **Author:** Your Name
> **License:** MIT

---

## 🧠 Overview

The **TableFlow** node allows you to connect n8n with the [TableFlow API](https://www.tableflow.tech).
It enables you to automate data import, synchronization, and table management workflows directly within n8n.

Use it to create, update, or fetch data from TableFlow tables — or trigger imports and transformations programmatically.

---

## 🔐 Credentials

### **TableFlow API**

This node requires a **TableFlow API Key**.

1. Log in to your [TableFlow Dashboard](https://www.tableflow.tech).
2. Go to **Settings → API Keys**.
3. Generate and copy a new key.
4. In n8n, add new credentials:
   - **Name:** TableFlow API
   - **API Key:** your_key_here

Credentials are stored securely and shared across TableFlow operations.

---

## ⚙️ Node Configuration

| Property | Type | Description |
|-----------|------|-------------|
| **Resource** | Dropdown | Choose which TableFlow resource to interact with (e.g., Table, Row, Import). |
| **Operation** | Dropdown | Choose the specific action to perform (e.g., Get, Create, Update, Delete). |
| **Table ID** | String | The unique identifier for the TableFlow table. |
| **Data** | JSON | JSON-formatted payload for create/update operations. |
| **Additional Fields** | Object | Optional parameters such as pagination, filtering, or sorting. |

---

## 🧩 Supported Resources and Operations

| Resource | Operation | Description |
|-----------|------------|-------------|
| **Table** | *Get All* | Retrieve all tables from your TableFlow workspace. |
| **Table** | *Get* | Retrieve details of a specific table. |
| **Row** | *Create* | Insert new rows into a table. |
| **Row** | *Update* | Modify existing table rows. |
| **Row** | *Delete* | Delete rows by ID. |

---

## 🧪 Example Workflows

### **1️⃣ List All Tables**

Fetch a list of all tables in your TableFlow workspace.

**Configuration:**
- Resource: `Table`
- Operation: `Get All`

**Example Output:**
```json
[
  {
    "id": "tbl_12345",
    "name": "Customer Data",
    "rows": 120,
    "createdAt": "2025-08-10T12:00:00Z"
  },
  {
    "id": "tbl_67890",
    "name": "Product Catalog",
    "rows": 45,
    "createdAt": "2025-09-22T08:15:00Z"
  }
]