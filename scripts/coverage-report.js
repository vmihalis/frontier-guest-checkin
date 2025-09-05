#!/usr/bin/env node
/**
 * Coverage Analysis and Reporting Script
 * Generates comprehensive HTML coverage reports and analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COVERAGE_DIR = 'coverage';
const REPORTS_DIR = 'reports';

// Ensure directories exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🔍 Generating comprehensive test coverage analysis...\n');

try {
  // Run tests with coverage
  console.log('📊 Running unit tests with coverage collection...');
  execSync('npm run test:unit -- --coverage --passWithNoTests', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  // Check if coverage data exists
  const coverageJsonPath = path.join(COVERAGE_DIR, 'coverage-final.json');
  const coverageSummaryPath = path.join(COVERAGE_DIR, 'coverage-summary.json');
  
  if (fs.existsSync(coverageSummaryPath)) {
    const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    
    console.log('\n📈 Coverage Summary:');
    console.log('==================');
    
    const total = coverageSummary.total;
    console.log(`Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
    console.log(`Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
    console.log(`Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    
    // Generate detailed analysis
    generateDetailedAnalysis(coverageSummary);
  }

  // Copy HTML report to reports directory if it exists
  const htmlReportDir = path.join(COVERAGE_DIR, 'lcov-report');
  if (fs.existsSync(htmlReportDir)) {
    const targetDir = path.join(REPORTS_DIR, 'coverage-html');
    execSync(`cp -r "${htmlReportDir}" "${targetDir}"`, { stdio: 'inherit' });
    console.log(`\n📄 HTML Coverage Report: file://${path.resolve(targetDir)}/index.html`);
  }

  console.log('\n✅ Coverage analysis completed successfully!');
  
} catch (error) {
  console.error('❌ Coverage analysis failed:', error.message);
  process.exit(1);
}

function generateDetailedAnalysis(coverageSummary) {
  console.log('\n📋 File-by-File Analysis:');
  console.log('========================');
  
  const files = Object.entries(coverageSummary)
    .filter(([key]) => key !== 'total')
    .map(([file, data]) => ({
      file: file.replace(process.cwd() + '/', ''),
      lines: data.lines.pct,
      statements: data.statements.pct,
      functions: data.functions.pct,
      branches: data.branches.pct,
      uncoveredLines: data.lines.total - data.lines.covered
    }))
    .sort((a, b) => a.lines - b.lines); // Sort by coverage percentage

  // Show files with lowest coverage first
  const lowCoverageFiles = files.filter(f => f.lines < 80);
  const highCoverageFiles = files.filter(f => f.lines >= 80);
  
  if (lowCoverageFiles.length > 0) {
    console.log('\n⚠️  Files needing attention (< 80% line coverage):');
    lowCoverageFiles.forEach(file => {
      console.log(`  ${file.file}: ${file.lines}% lines, ${file.uncoveredLines} uncovered lines`);
    });
  }
  
  if (highCoverageFiles.length > 0) {
    console.log('\n✅ Well-covered files (≥ 80% line coverage):');
    highCoverageFiles.forEach(file => {
      console.log(`  ${file.file}: ${file.lines}% lines`);
    });
  }
  
  // Generate recommendations
  generateRecommendations(files);
  
  // Save detailed report
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: coverageSummary.total,
    files: files,
    recommendations: generateRecommendations(files, true)
  };
  
  const reportPath = path.join(REPORTS_DIR, 'coverage-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n💾 Detailed analysis saved: ${reportPath}`);
}

function generateRecommendations(files, returnData = false) {
  const recommendations = [];
  
  // Find files with zero coverage
  const zeroCoverageFiles = files.filter(f => f.lines === 0);
  if (zeroCoverageFiles.length > 0) {
    const rec = `🎯 Priority: Add tests for ${zeroCoverageFiles.length} uncovered files`;
    recommendations.push(rec);
    if (!returnData) console.log('\n' + rec);
  }
  
  // Find files with low function coverage
  const lowFunctionCoverage = files.filter(f => f.functions < 50);
  if (lowFunctionCoverage.length > 0) {
    const rec = `🔧 Focus on function coverage for ${lowFunctionCoverage.length} files`;
    recommendations.push(rec);
    if (!returnData) console.log(rec);
  }
  
  // Find files with low branch coverage
  const lowBranchCoverage = files.filter(f => f.branches < 60);
  if (lowBranchCoverage.length > 0) {
    const rec = `🌿 Add conditional/error path tests for ${lowBranchCoverage.length} files`;
    recommendations.push(rec);
    if (!returnData) console.log(rec);
  }
  
  // Calculate total test effectiveness
  const avgCoverage = files.reduce((sum, f) => sum + f.lines, 0) / files.length;
  if (avgCoverage > 85) {
    const rec = `🏆 Excellent test coverage (${avgCoverage.toFixed(1)}% average)`;
    recommendations.push(rec);
    if (!returnData) console.log(rec);
  } else if (avgCoverage < 60) {
    const rec = `📈 Consider increasing overall test coverage (${avgCoverage.toFixed(1)}% average)`;
    recommendations.push(rec);
    if (!returnData) console.log(rec);
  }
  
  if (returnData) return recommendations;
}