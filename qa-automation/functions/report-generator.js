// qa-automation/functions/report-generator.js
// This function is intended to be pasted into an n8n Function node.
// It processes Cypress test execution results, parses reports (Mochawesome JSON and console logs),
// and generates user-friendly HTML and text summaries for delivery via Telegram.

// Input: items[0].json should contain:
//   - executionStatus: { success: boolean, reportPath: string, logPath: string, cypressExitCode: number } (from run_cypress.sh stdout)
//   - mochawesomeJsonString: string (content of Mochawesome JSON report)
//   - cypressRunLogString: string (content of cypress-run.log)
//   - chatInfo: object (Telegram chat details)
// Output: [{ json: { success: boolean, summary?: object, ... }, binary: { report.html: {...}, summary.txt: {...} } }]

const input = items[0].json;

// Ensure all required inputs are present
if (!input || !input.executionStatus || typeof input.mochawesomeJsonString !== 'string' || typeof input.cypressRunLogString !== 'string' || !input.chatInfo) {
  console.error('Error: Missing critical input data for report generation.');
  return [{
    json: {
      success: false,
      error: 'Report generator received incomplete data. Ensure executionStatus, mochawesomeJsonString, cypressRunLogString, and chatInfo are provided.',
      errorType: 'MISSING_REPORT_INPUTS',
      chatInfo: input?.chatInfo || {}
    }
  }];
}

const { executionStatus, mochawesomeJsonString, cypressRunLogString, chatInfo } = input;

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[ReportGenerator] ${prefix}: ${message}`);
}

/**
 * Parses Mochawesome JSON report content.
 * @param {string} jsonString - The Mochawesome JSON report as a string.
 * @returns {Object} - Parsed report data including summary, tests, and suites.
 */
function parseMochawesomeReport(jsonString) {
  try {
    const report = JSON.parse(jsonString);
    const stats = report.stats || {};
    const results = report.results || []; // This is an array of suites (typically one)
    const allSuites = results.flatMap(result => result.suites || []);
    const allTests = allSuites.flatMap(suite => suite.tests || []);

    const summary = {
      totalSuites: stats.suites || allSuites.length,
      totalTests: stats.tests || allTests.length,
      passes: stats.passes || 0,
      failures: stats.failures || 0,
      pending: stats.pending || 0, // Mochawesome uses 'pending' for skipped due to hooks or exclusive .only
      skipped: stats.skipped || 0, // Explicitly skipped tests
      duration: stats.duration || 0,
      startTime: stats.start || new Date().toISOString(),
      endTime: stats.end || new Date().toISOString(),
      passPercent: stats.passPercent || 0,
      pendingPercent: stats.pendingPercent || 0
    };

    const testDetails = allTests.map(test => ({
      title: test.title || 'Untitled Test',
      fullTitle: test.fullTitle || test.title,
      duration: test.duration || 0,
      state: test.state || (test.pass ? 'passed' : test.fail ? 'failed' : (test.pending || test.skipped) ? 'skipped' : 'unknown'),
      passed: !!test.pass,
      failed: !!test.fail,
      skipped: !!(test.pending || test.skipped),
      code: test.code || '',
      error: test.err ? { message: test.err.message, stack: test.err.estack, diff: test.err.diff } : null,
      // Screenshots are often in err.context if using mochawesome-screenshots
      screenshots: (test.err && test.err.context) ? JSON.parse(test.err.context).value : [] // Assumes context is JSON string like `{"title":"Screenshot","value":"assets/..."}`
    }));
    
    const suiteDetails = allSuites.map(suite => ({
        title: suite.title || 'Untitled Suite',
        file: suite.file || '',
        duration: suite.duration || 0,
        hasFailures: suite.failures && suite.failures.length > 0,
        hasPasses: suite.passes && suite.passes.length > 0,
        hasSkipped: (suite.pending && suite.pending.length > 0) || (suite.skipped && suite.skipped.length > 0),
        tests: (suite.tests || []).map(t => t.title) // Just titles for brevity in suite summary
    }));

    return { summary, tests: testDetails, suites: suiteDetails, reportType: 'mochawesome' };
  } catch (error) {
    log(`Error parsing Mochawesome report: ${error.message}`, 'error');
    // Fallback if Mochawesome parsing fails, use executionStatus
    return {
      summary: {
        totalTests: 1, // Assume 1 overall test if parsing fails
        passes: executionStatus.cypressExitCode === 0 ? 1 : 0,
        failures: executionStatus.cypressExitCode !== 0 ? 1 : 0,
        skipped: 0, pending: 0, duration: 0,
        startTime: new Date().toISOString(), endTime: new Date().toISOString(),
        passPercent: executionStatus.cypressExitCode === 0 ? 100 : 0
      },
      tests: [{ title: 'Overall Test Run', state: executionStatus.cypressExitCode === 0 ? 'passed' : 'failed', duration: 0, error: executionStatus.cypressExitCode !== 0 ? { message: 'Test execution failed, see logs.' } : null }],
      suites: [],
      reportType: 'fallback'
    };
  }
}

/**
 * Parses Cypress console log output.
 * @param {string} logString - The Cypress console log as a string.
 * @returns {Object} - Extracted information like Cypress version, browser, warnings.
 */
function parseCypressLog(logString) {
  const info = {
    cypressVersion: (logString.match(/Cypress:\s*(\d+\.\d+\.\d+)/) || [])[1] || 'N/A',
    browser: (logString.match(/Browser:\s*([^\s]+)\s+\d+/) || [])[1] || 'N/A', // e.g. Chrome 100
    specFile: (logString.match(/Running:\s*(.+\.spec\.js)/) || [])[1] || 'N/A',
    warnings: [],
    errors: [] // For console errors not part of test failures
  };
  // Extract console warnings/errors if any specific patterns are known
  // For simplicity, this part can be expanded if needed.
  return info;
}

/**
 * Basic performance analysis.
 * @param {Object} reportData - Parsed report data from Mochawesome.
 * @returns {Object} - Performance metrics and a simple grade.
 */
function analyzePerformance(reportData) {
  const { summary, tests } = reportData;
  const totalDuration = summary.duration || 0;
  const numTests = summary.totalTests || (tests ? tests.length : 0);
  const avgTestDuration = numTests > 0 ? totalDuration / numTests : 0;
  const passRate = summary.passPercent || (numTests > 0 ? (summary.passes / numTests) * 100 : 0);

  const slowTests = tests ? tests.filter(test => test.duration > 10000) : []; // Tests > 10s

  let performanceGrade = 'N/A';
  if (passRate >= 95 && avgTestDuration <= 5000) performanceGrade = 'A';
  else if (passRate >= 80 && avgTestDuration <= 10000) performanceGrade = 'B';
  else if (passRate >= 60) performanceGrade = 'C';
  else if (passRate >= 40) performanceGrade = 'D';
  else performanceGrade = 'F';
  
  let recommendations = [];
  if (slowTests.length > 0) recommendations.push(`Investigate ${slowTests.length} slow test(s) (>${(10000/1000).toFixed(0)}s).`);
  if (passRate < 70 && numTests > 0) recommendations.push("Improve test stability to increase pass rate.");


  return {
    metrics: {
      totalDurationMs: totalDuration,
      avgTestDurationMs: avgTestDuration,
      passRate: parseFloat(passRate.toFixed(2)),
      slowTestCount: slowTests.length,
    },
    performanceGrade,
    recommendations: recommendations.length > 0 ? recommendations : ["All good!"]
  };
}

/**
 * Generates an HTML report string.
 * @param {Object} reportData - Parsed Mochawesome data.
 * @param {Object} performanceData - Output of analyzePerformance.
 * @param {Object} logData - Output of parseCypressLog.
 * @returns {string} - HTML report content.
 */
function generateHtmlReport(reportData, performanceData, logData) {
  const { summary, tests, suites } = reportData;

  const formatMs = (ms) => ms ? `${(ms / 1000).toFixed(2)}s` : '0s';
  const getStatusClass = (state) => state || 'unknown'; // 'passed', 'failed', 'skipped'

  let testsHtml = tests.map(test => `
    <div class="test-case ${getStatusClass(test.state)}">
      <h4>${test.fullTitle || test.title} (${formatMs(test.duration)}) - ${test.state.toUpperCase()}</h4>
      ${test.error ? `<pre class="error-details"><strong>Error:</strong> ${test.error.message}\n${test.error.stack ? `\nStack:\n${test.error.stack}` : ''}${test.error.diff ? `\nDiff:\n${test.error.diff}` : ''}</pre>` : ''}
      ${test.screenshots && test.screenshots.length > 0 ? `<div>Screenshots: ${test.screenshots.map(s => `<a href="${s.value}" target="_blank">${s.title || 'View'}</a>`).join(', ')}</div>` : ''}
    </div>`).join('');
  
  if (tests.length === 0 && summary.failures > 0) { // Handle case where tests array is empty but failures reported (e.g. hook failure)
      testsHtml = `<div class="test-case failed"><h4>Global Error / Hook Failure</h4><pre class="error-details">Execution failed with ${summary.failures} critical error(s). Check Cypress logs.</pre></div>`;
  }


  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cypress Test Report - ${logData.specFile || 'General'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }
        .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #2c3e50; }
        h1 { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .summary-grid, .perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric-box { background-color: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-box h3 { margin-top: 0; font-size: 1.2em; color: #34495e;}
        .metric-box .value { font-size: 2em; font-weight: bold; color: #2980b9; }
        .passed .value { color: #27ae60; }
        .failed .value { color: #c0392b; }
        .skipped .value { color: #7f8c8d; }
        .recommendations ul { list-style-type: '💡 '; padding-left: 20px; }
        .test-case { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        .test-case.passed { border-left: 5px solid #27ae60; background-color: #e9f7ef; }
        .test-case.failed { border-left: 5px solid #c0392b; background-color: #fdedec; }
        .test-case.skipped, .test-case.pending { border-left: 5px solid #7f8c8d; background-color: #f0f1f1; }
        .error-details { background-color: #fcebea; color: #c0392b; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; margin-top:5px; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cypress Test Report</h1>
        <p style="text-align:center;">Spec: ${logData.specFile || 'N/A'} | Browser: ${logData.browser} | Cypress: v${logData.cypressVersion}</p>
        <p style="text-align:center;">Start: ${new Date(summary.startTime).toLocaleString()} | End: ${new Date(summary.endTime).toLocaleString()}</p>
        
        <h2>Overall Summary</h2>
        <div class="summary-grid">
            <div class="metric-box total"><h3 class="label">Total Tests</h3><span class="value">${summary.totalTests}</span></div>
            <div class="metric-box passed"><h3 class="label">Passed</h3><span class="value">${summary.passes}</span></div>
            <div class="metric-box failed"><h3 class="label">Failed</h3><span class="value">${summary.failures}</span></div>
            <div class="metric-box skipped"><h3 class="label">Skipped/Pending</h3><span class="value">${summary.skipped + summary.pending}</span></div>
            <div class="metric-box duration"><h3 class="label">Duration</h3><span class="value">${formatMs(summary.duration)}</span></div>
        </div>

        <h2>Performance Analysis</h2>
        <div class="perf-grid">
            <div class="metric-box"><h3 class="label">Pass Rate</h3><span class="value ${performanceData.metrics.passRate >= 80 ? 'passed' : 'failed'}">${performanceData.metrics.passRate}%</span></div>
            <div class="metric-box"><h3 class="label">Avg. Duration</h3><span class="value">${formatMs(performanceData.metrics.avgTestDurationMs)}</span></div>
            <div class="metric-box"><h3 class="label">Slow Tests</h3><span class="value">${performanceData.metrics.slowTestCount}</span></div>
            <div class="metric-box"><h3 class="label">Grade</h3><span class="value ${performanceData.performanceGrade === 'A' || performanceData.performanceGrade === 'B' ? 'passed' : 'failed'}">${performanceData.performanceGrade}</span></div>
        </div>
        ${performanceData.recommendations.length > 0 ? `<div class="recommendations"><h3>Recommendations</h3><ul>${performanceData.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul></div>` : ''}

        <h2>Test Details</h2>
        ${testsHtml || '<p>No individual test details available or all tests passed without specific logging.</p>'}
        
        <div class="footer">Report generated by n8n QA Automation on ${new Date().toLocaleString()}</div>
    </div>
</body>
</html>`;
}

/**
 * Generates a text summary for Telegram.
 * @param {Object} reportData - Parsed Mochawesome data.
 * @param {Object} performanceData - Output of analyzePerformance.
 * @param {string} specFile - The spec file name.
 * @returns {string} - Markdown formatted text summary.
 */
function generateTextSummary(reportData, performanceData, specFile) {
  const { summary } = reportData;
  const formatMs = (ms) => ms ? `${(ms / 1000).toFixed(1)}s` : '0s';
  const overallStatus = summary.failures > 0 ? '❌ FAILED' : (summary.totalTests === 0 ? '⚠️ NO TESTS RUN' : '✅ PASSED');

  let text = `*Cypress Test Results: ${specFile || 'General'}*\n`;
  text += `${overallStatus} (Grade: ${performanceData.performanceGrade})\n\n`;
  text += `*Summary:*\n`;
  text += `  Total: ${summary.totalTests} | ✅ Passed: ${summary.passes} | ❌ Failed: ${summary.failures} | ⏭️ Skipped: ${summary.skipped + summary.pending}\n`;
  text += `  ⏱️ Duration: ${formatMs(summary.duration)} | 📊 Pass Rate: ${performanceData.metrics.passRate}%\n\n`;

  if (summary.failures > 0) {
    text += `*Failed Tests:*\n`;
    const failedTests = reportData.tests ? reportData.tests.filter(t => t.failed) : [];
    failedTests.slice(0, 5).forEach(test => { // List up to 5 failed tests
      text += `  - ${test.title.substring(0, 60)}${test.title.length > 60 ? '...' : ''}\n`;
    });
    if (failedTests.length > 5) text += `  ...and ${failedTests.length - 5} more.\n`;
    text += `\n`;
  }
  
  if (performanceData.recommendations.length > 0 && !(performanceData.recommendations.length === 1 && performanceData.recommendations[0] === "All good!")) {
      text += `*Recommendations:*\n`;
      performanceData.recommendations.slice(0,3).forEach(rec => { text += `  - ${rec}\n`;});
  }

  text += `\n_Full HTML report is attached._`;
  return text;
}

// --- Main Execution ---
try {
  log(`Processing report for chat ${chatInfo.chatId}. Cypress exit code: ${executionStatus.cypressExitCode}`);

  const reportData = parseMochawesomeReport(mochawesomeJsonString);
  const logData = parseCypressLog(cypressRunLogString);
  logData.specFile = executionStatus.specFileName || logData.specFile; // Prefer specFileName from execution context

  const performanceData = analyzePerformance(reportData);

  const htmlReportContent = generateHtmlReport(reportData, performanceData, logData);
  const textSummaryContent = generateTextSummary(reportData, performanceData, logData.specFile);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlReportFilename = `cypress-report-${logData.specFile ? logData.specFile.replace('.spec.js', '') : 'run'}-${timestamp}.html`;
  const textSummaryFilename = `summary-${logData.specFile ? logData.specFile.replace('.spec.js', '') : 'run'}-${timestamp}.txt`;
  
  log(`Reports generated successfully for ${logData.specFile}. HTML: ${htmlReportFilename}`);

  return [{
    json: {
      success: true,
      overallStatus: reportData.summary.failures > 0 ? 'FAILED' : 'PASSED',
      summaryStats: reportData.summary,
      performanceGrade: performanceData.performanceGrade,
      textSummary: textSummaryContent, // For direct use in Telegram message node
      htmlReportFilename: htmlReportFilename, // For context
      chatInfo: chatInfo
    },
    binary: {
      // n8n expects binary data to be base64 encoded string under 'data' property
      html_report: { // This key 'html_report' can be referenced in subsequent nodes
        data: Buffer.from(htmlReportContent).toString('base64'),
        fileName: htmlReportFilename,
        mimeType: 'text/html'
      },
      text_summary_file: { // A text file version of the summary
        data: Buffer.from(textSummaryContent).toString('base64'),
        fileName: textSummaryFilename,
        mimeType: 'text/plain'
      }
    }
  }];

} catch (error) {
  log(`Critical error in report generation: ${error.message}\nStack: ${error.stack}`, 'error');
  return [{
    json: {
      success: false,
      error: `Failed to generate reports: ${error.message}`,
      errorType: 'REPORT_GENERATION_FAILURE',
      stack: error.stack,
      chatInfo: chatInfo
    }
  }];
}