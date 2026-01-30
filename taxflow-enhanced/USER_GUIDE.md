# TaxFlow Enhanced - User Guide

Welcome to TaxFlow Enhanced, a visual workflow-based tax calculation platform that helps you prepare and validate your federal tax returns.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Building Your Workflow](#building-your-workflow)
4. [Node Types Reference](#node-types-reference)
5. [Running Calculations](#running-calculations)
6. [Viewing Results](#viewing-results)
7. [Exporting Your Tax Return](#exporting-your-tax-return)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

## Introduction

### What is TaxFlow Enhanced?

TaxFlow Enhanced is a node-based visual workflow builder for federal tax calculations. Unlike traditional tax software that follows a rigid question-and-answer format, TaxFlow lets you:

- **Visualize** your tax calculation flow
- **Customize** which forms and calculations you need
- **Validate** calculations at each step
- **Export** professional tax packages

### Who Should Use This?

- Tax professionals creating custom calculation workflows
- Individuals with complex tax situations
- Anyone who wants to understand how their taxes are calculated
- Developers building tax-related applications

### Key Features

✅ Visual node-based workflow editor
✅ Drag-and-drop interface
✅ Real-time calculation validation
✅ Support for multiple income types
✅ IRS-compliant tax calculations
✅ PDF and Excel export
✅ Keyboard accessible (WCAG 2.1 AA compliant)

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Minimum screen resolution: 1024x768
- Internet connection (for initial load)

### First Launch

When you first open TaxFlow Enhanced, you'll see three main areas:

```
┌─────────────────────────────────────────────────────────┐
│  [Node Palette]  │    [Workflow Canvas]    │ [Dashboard]│
│                  │                         │            │
│  • Input         │  ┌─────────────────┐   │  Results   │
│  • Calculation   │  │  Empty State    │   │  will      │
│  • Forms         │  │  Message        │   │  appear    │
│  • Validation    │  └─────────────────┘   │  here      │
│  • Output        │                         │            │
└─────────────────────────────────────────────────────────┘
```

### Creating Your First Workflow

1. **Set Up Taxpayer Information**
   - Tax Year: 2024 (automatically configured)
   - Filing Status: Select from dropdown
   - Taxpayer Details: Enter name and SSN

2. **Add Your First Node**
   - Find "Manual Entry" in the Node Palette
   - Drag it onto the canvas
   - The node appears with a blue border (input node)

3. **Add a Calculator Node**
   - Find "AGI Calculator" in the Calculation category
   - Drag it below your input node
   - The node appears with a green border

4. **Connect the Nodes**
   - Click and drag from the output handle (right side) of Manual Entry
   - Connect to the input handle (left side) of AGI Calculator
   - A line appears showing the data flow

5. **Execute the Workflow**
   - Click the "Execute" button in the toolbar
   - Watch as nodes process (they'll pulse with animation)
   - Results appear in the Dashboard panel

## Building Your Workflow

### Understanding Nodes

Every node in TaxFlow has:
- **Inputs**: Where data comes in (left side)
- **Outputs**: Where data goes out (right side)
- **Status Indicator**: Shows current state (idle, running, success, error)
- **Description**: Brief explanation of what it does

### Node Color Coding

- 🔵 **Blue**: Input nodes (data entry)
- 🟢 **Green**: Calculation nodes (math operations)
- 🟣 **Purple**: Form generators (IRS forms)
- 🟡 **Yellow**: Validation nodes (error checking)
- 🔴 **Red**: Output nodes (export/save)

### Workflow Patterns

#### Simple Linear Flow
```
[W-2 Import] → [AGI Calculator] → [Deduction Calculator] → [Tax Calculator]
```

#### Multiple Income Sources
```
[W-2 Import] ──┐
                ├──→ [AGI Calculator] → [Tax Calculator]
[1099 Import] ──┘
```

#### Complete Tax Return
```
[Input] → [AGI] → [Deductions] → [Tax Calculator] → [Credits] → [Form 1040] → [PDF Package]
```

### Keyboard Navigation

For accessibility, all features are keyboard-accessible:

- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons and nodes
- **Arrow Keys**: Navigate node palette
- **Escape**: Cancel current action
- **Ctrl+Z**: Undo last action (coming soon)

## Node Types Reference

### Input Nodes (Blue)

#### Manual Entry
Manually enter tax data for testing or simple returns.
- **Inputs**: None (starting node)
- **Outputs**: W-2 style data
- **Use When**: Quick calculations or testing workflows

#### W-2 Import
Import wage statement data.
- **Inputs**: None (starting node)
- **Outputs**: W-2 data (wages, withholding, etc.)
- **Use When**: You have W-2 wage income

#### Form 1099 Import
Import 1099 forms (INT, DIV, B, MISC, NEC).
- **Inputs**: None (starting node)
- **Outputs**: 1099 data
- **Use When**: You have investment or contractor income

#### Excel Import
Import data from spreadsheets.
- **Inputs**: None (starting node)
- **Outputs**: Parsed tax data
- **Use When**: You have data in Excel format

### Calculation Nodes (Green)

#### AGI Calculator
Calculates Adjusted Gross Income.
- **Inputs**: Income data from multiple sources
- **Outputs**: AGI, income breakdown, adjustments
- **Formula**: Total Income - Adjustments = AGI
- **Note**: Automatically aggregates all income types

#### Deduction Calculator
Determines standard vs itemized deductions.
- **Inputs**: AGI data
- **Outputs**: Deduction amount and type
- **Logic**: Uses greater of standard or itemized

#### Tax Bracket Calculator
Calculates federal income tax using IRS brackets.
- **Inputs**: Taxable income data
- **Outputs**: Tax amount, effective rate, marginal rate
- **Note**: Uses 2024 tax brackets

#### Tax Credits
Applies eligible tax credits.
- **Inputs**: Tax data
- **Outputs**: Credits applied, final tax
- **Supports**: CTC, EITC, education credits

#### Self-Employment Tax
Calculates SE tax for business income.
- **Inputs**: Business income data
- **Outputs**: SE tax amount
- **Rate**: 15.3% on net earnings

#### State Tax Calculator
Calculates state income tax.
- **Inputs**: AGI and state
- **Outputs**: State tax amount
- **Note**: Currently supports major states

### Form Generator Nodes (Purple)

#### Form 1040 Generator
Generates the main tax return form.
- **Inputs**: Complete tax calculation data
- **Outputs**: Form 1040 data structure
- **Note**: Foundation for PDF export

#### Schedule A Generator
Generates itemized deductions schedule.
- **Inputs**: Deduction data
- **Outputs**: Schedule A
- **Use When**: Itemizing deductions

#### Schedule C Generator
Generates business income schedule.
- **Inputs**: Business income/expenses
- **Outputs**: Schedule C
- **Use When**: Self-employed

#### Schedule SE Generator
Generates self-employment tax schedule.
- **Inputs**: SE tax calculation
- **Outputs**: Schedule SE
- **Use When**: Paying SE tax

### Validation Nodes (Yellow)

#### IRS Validator
Validates against IRS rules and limits.
- **Inputs**: Complete return data
- **Outputs**: Validation results, warnings, errors
- **Checks**: Income limits, deduction caps, credit phase-outs

#### Math Check Validator
Verifies mathematical accuracy.
- **Inputs**: Calculation data
- **Outputs**: Validation status
- **Checks**: AGI calculation, taxable income, tax amount

### Output Nodes (Red)

#### PDF Package Generator
Creates printable PDF forms.
- **Inputs**: Form data
- **Outputs**: PDF files
- **Includes**: Form 1040, schedules, summary

#### Excel Report Generator
Creates detailed Excel spreadsheet.
- **Inputs**: Complete return data
- **Outputs**: Excel file
- **Includes**: All calculations, breakdowns, audit trail

## Running Calculations

### Step-by-Step Execution

1. **Verify Your Workflow**
   - Ensure all nodes are connected
   - Check for any orphaned nodes (not connected)
   - Validate that data flows from input to output

2. **Click Execute**
   - Button location: Top-right toolbar
   - Shortcut: Ctrl+E (coming soon)
   - Status: Button shows "Executing..." during run

3. **Watch the Progress**
   - Nodes turn blue with pulsing animation when running
   - Green checkmark appears when complete
   - Red X appears if errors occur

4. **Review Results**
   - Dashboard updates automatically
   - Key metrics displayed: AGI, Deductions, Tax Owed/Refund
   - Click nodes to see detailed output

### Execution Order

TaxFlow automatically determines the correct execution order using topological sorting:

1. **Input nodes** execute first (no dependencies)
2. **Calculation nodes** execute when inputs are ready
3. **Form generators** execute after calculations
4. **Validators** check the generated forms
5. **Output nodes** run last

### Error Handling

If execution fails:
- **Red border** appears on the problem node
- **Error message** shows in the Dashboard
- **Fix options**: Check connections, verify input data
- **Retry**: Click Execute again after fixing

## Viewing Results

### Dashboard Overview

The Dashboard shows:

#### Quick Stats
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│     AGI     │  Deductions │   Taxable   │  Total Tax  │
│  $95,000    │   $14,600   │  $80,400    │   $11,663   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### Detailed Breakdown
- Income by type (wages, business, capital gains, etc.)
- Deduction itemization
- Tax calculation showing brackets
- Credits applied
- Payments and withholding
- **Final result: Refund or Amount Owed**

### Interpreting Results

**Positive Number = Refund** 💰
```
Refund: $1,500
→ You overpaid by $1,500
→ IRS will send you a refund
```

**Negative Number = Amount Owed** 📋
```
Amount Owed: -$2,300
→ You owe $2,300
→ Payment due by tax deadline (usually April 15)
```

## Exporting Your Tax Return

### PDF Package

1. Locate PDF export button (bottom of Dashboard)
2. Click "Generate PDF Package"
3. Downloads include:
   - Form 1040 (main return)
   - All schedules (A, C, SE as applicable)
   - Calculation summary
   - Signature pages

**File Format**: `TaxReturn_2024_[YourName].pdf`

### Excel Report

1. Click "Download Excel Report"
2. Excel file includes:
   - Summary tab
   - Detailed calculations tab
   - Income breakdown tab
   - Audit trail tab
   - Formula references

**Use Cases**:
- Share with tax preparer
- Keep detailed records
- Year-over-year comparison
- Audit preparation

### Saving Workflows

1. Click "Save Workflow" button
2. Workflow saves to browser storage (IndexedDB)
3. Automatically loads on next visit
4. Export as JSON for backup (coming soon)

## Troubleshooting

### Common Issues

#### "Node requires input data"
**Problem**: Calculator node has no connections
**Solution**: Connect an input node to provide data

#### "Workflow contains cycles"
**Problem**: Circular reference in connections
**Solution**: Remove the connection that creates the loop

#### "Execute button is disabled"
**Problem**: No nodes in workflow
**Solution**: Add at least one input and one calculation node

#### Numbers don't match IRS calculations
**Problem**: May be using different deduction or credit rules
**Solution**: Check IRS Publication 17 for current year rules

#### Can't drag nodes
**Problem**: Browser compatibility issue
**Solution**: Try latest Chrome, Firefox, or Edge

### Performance Issues

If the app feels slow:
1. Clear browser cache
2. Reduce number of nodes (>100 may slow down)
3. Use simpler workflows for testing
4. Check browser console for errors (F12)

### Accessibility Issues

For screen reader users:
- ARIA labels present on all interactive elements
- Keyboard navigation fully supported
- High contrast mode supported
- Focus indicators visible

## FAQ

### General Questions

**Q: Is my data secure?**
A: Yes. All calculations run in your browser. No data is sent to external servers.

**Q: Can I file my return directly from TaxFlow?**
A: No. TaxFlow generates the forms, but you must file through IRS-approved methods (e-file or mail).

**Q: Is TaxFlow IRS-certified?**
A: TaxFlow is a calculation tool, not a filing service. Calculations follow IRS rules but are not officially certified.

**Q: What tax year does it support?**
A: Currently 2024. We update for new tax years as IRS publishes brackets and rules.

### Technical Questions

**Q: Does it work offline?**
A: After initial load, yes! Uses service workers for offline functionality (coming soon).

**Q: Can I import from TurboTax/H&R Block?**
A: Not directly, but you can manually enter data using import nodes.

**Q: What browsers are supported?**
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Q: Mobile support?**
A: Limited. Best experience on desktop/tablet. Mobile support coming in future release.

### Workflow Questions

**Q: How many nodes can I add?**
A: Technically unlimited, but performance is best with <100 nodes.

**Q: Can I save multiple workflows?**
A: Currently one workflow per browser. Multi-workflow support coming soon.

**Q: Can I share workflows?**
A: Export as JSON and share the file (feature in development).

**Q: Can I template common workflows?**
A: Yes! Save common patterns and reuse them (coming soon).

### Calculation Questions

**Q: Why is my tax different from TurboTax?**
A: Small differences possible due to rounding or different interpretation of edge cases. Always verify with a tax professional.

**Q: Does it handle AMT (Alternative Minimum Tax)?**
A: Yes, the Tax Calculator includes AMT calculations.

**Q: What about state taxes?**
A: State Tax Calculator node supports major states. More states being added.

**Q: Can it handle cryptocurrency?**
A: Yes, enter as capital gains in the appropriate input node.

## Support

### Getting Help

- **Documentation**: This guide and DEVELOPER_GUIDE.md
- **GitHub Issues**: Report bugs or request features
- **Community**: Join discussions (link in README)

### Providing Feedback

We welcome feedback on:
- Usability improvements
- Bug reports
- Feature requests
- Documentation clarity

### Version Information

Current Version: 1.0.0
Release Date: 2024-11
License: MIT

---

**Remember**: TaxFlow Enhanced is a calculation tool. Always consult with a qualified tax professional for complex situations or if you're unsure about any aspect of your tax return.

**Tax Deadline**: Federal returns typically due April 15 (check IRS.gov for current year deadline).

**Disclaimer**: This software is provided for informational purposes only. Consult a tax professional for personalized advice.
