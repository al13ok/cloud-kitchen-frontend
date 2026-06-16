#!/usr/bin/env node

/**
 * Performance Testing Script for Login Page
 * This script helps measure the performance improvements made to the login page
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Performance Test for Login Page...\n');

// Function to run Lighthouse audit
function runLighthouseAudit() {
  try {
    console.log('📊 Running Lighthouse audit...');

    // Check if lighthouse is installed
    try {
      execSync('lighthouse --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('⚠️  Lighthouse not found. Installing...');
      execSync('npm install -g lighthouse', { stdio: 'inherit' });
    }

    // Run lighthouse audit
    const lighthouseCommand = `lighthouse https://py-mobiloitte.converiqo.ai/signin --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless" --only-categories=performance`;

    console.log('Running Lighthouse audit (this may take a few minutes)...');
    execSync(lighthouseCommand, { stdio: 'inherit' });

    // Parse and display results
    if (fs.existsSync('./lighthouse-report.json')) {
      const report = JSON.parse(fs.readFileSync('./lighthouse-report.json', 'utf8'));
      const performance = report.categories.performance;

      console.log('\n📈 Lighthouse Performance Results:');
      console.log('=====================================');
      console.log(`Overall Score: ${Math.round(performance.score * 100)}/100`);
      console.log(`FCP: ${report.audits['first-contentful-paint'].displayValue}`);
      console.log(`LCP: ${report.audits['largest-contentful-paint'].displayValue}`);
      console.log(`CLS: ${report.audits['cumulative-layout-shift'].displayValue}`);
      console.log(`FID: ${report.audits['max-potential-fid'].displayValue}`);
      console.log(`TTFB: ${report.audits['server-response-time'].displayValue}`);

      // Check if performance targets are met
      const targets = {
        fcp: 1800, // 1.8s
        lcp: 2500, // 2.5s
        cls: 0.1,
        fid: 100,  // 100ms
        ttfb: 1500 // 1.5s
      };

      console.log('\n🎯 Performance Targets:');
      console.log('=======================');
      console.log(`FCP Target: <${targets.fcp}ms - ${parseFloat(report.audits['first-contentful-paint'].numericValue) < targets.fcp ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`LCP Target: <${targets.lcp}ms - ${parseFloat(report.audits['largest-contentful-paint'].numericValue) < targets.lcp ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`CLS Target: <${targets.cls} - ${parseFloat(report.audits['cumulative-layout-shift'].numericValue) < targets.cls ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`FID Target: <${targets.fid}ms - ${parseFloat(report.audits['max-potential-fid'].numericValue) < targets.fid ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`TTFB Target: <${targets.ttfb}ms - ${parseFloat(report.audits['server-response-time'].numericValue) < targets.ttfb ? '✅ PASS' : '❌ FAIL'}`);

      return {
        score: Math.round(performance.score * 100),
        fcp: parseFloat(report.audits['first-contentful-paint'].numericValue),
        lcp: parseFloat(report.audits['largest-contentful-paint'].numericValue),
        cls: parseFloat(report.audits['cumulative-layout-shift'].numericValue),
        fid: parseFloat(report.audits['max-potential-fid'].numericValue),
        ttfb: parseFloat(report.audits['server-response-time'].numericValue)
      };
    }
  } catch (error) {
    console.error('❌ Error running Lighthouse audit:', error.message);
    return null;
  }
}

// Function to check bundle size
function checkBundleSize() {
  try {
    console.log('\n📦 Checking bundle size...');

    if (fs.existsSync('./.next/static/chunks')) {
      const chunks = fs.readdirSync('./.next/static/chunks');
      let totalSize = 0;

      chunks.forEach(chunk => {
        const stats = fs.statSync(path.join('./.next/static/chunks', chunk));
        totalSize += stats.size;
      });

      const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
      console.log(`Total bundle size: ${sizeInMB} MB`);

      return totalSize;
    }
  } catch (error) {
    console.error('❌ Error checking bundle size:', error.message);
    return null;
  }
}

// Function to check if dev server is running
function checkDevServer() {
  try {
    execSync('curl -s https://py-mobiloitte.converiqo.ai/signin > /dev/null', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  // Check if dev server is running
  if (!checkDevServer()) {
    console.log('❌ Development server is not running on localhost:3000');
    console.log('Please start the dev server with: npm run dev');
    process.exit(1);
  }

  console.log('✅ Development server is running\n');

  // Run performance tests
  const lighthouseResults = runLighthouseAudit();
  const bundleSize = checkBundleSize();

  // Summary
  console.log('\n📋 Performance Test Summary:');
  console.log('============================');

  if (lighthouseResults) {
    console.log(`Lighthouse Score: ${lighthouseResults.score}/100`);
    console.log(`FCP: ${lighthouseResults.fcp.toFixed(0)}ms`);
    console.log(`LCP: ${lighthouseResults.lcp.toFixed(0)}ms`);
    console.log(`CLS: ${lighthouseResults.cls.toFixed(4)}`);
    console.log(`FID: ${lighthouseResults.fid.toFixed(0)}ms`);
    console.log(`TTFB: ${lighthouseResults.ttfb.toFixed(0)}ms`);
  }

  if (bundleSize) {
    console.log(`Bundle Size: ${(bundleSize / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log('\n✨ Performance test completed!');
}

// Run the script
main().catch(console.error);
