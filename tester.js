// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());
// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// const chromeLauncher = require('chrome-launcher');

// // Constants and Configuration
// const METRICS = {
//   MIN_FONT_SIZE: 14,
//   MIN_BUTTON_SIZE: 48,
//   MAX_SCREENSHOTS: 10,
//   SCREENSHOT_DIR: 'screenshots',
//   NAVIGATION_TIMEOUT: 60000,
//   RETRY_ATTEMPTS: 2,
//   SCREENSHOT_TYPE: 'jpeg',
//   JPEG_QUALITY: 80,
//   SCROLL_TIMEOUT: 10000,
//   SCROLL_POLLING: 200
// };

// // Device Configurations
// const testDevices = [
//   {
//     name: 'Tecno Spark 10 Pro',
//     viewport: { 
//       width: 360, 
//       height: 800, 
//       isMobile: true, 
//       deviceScaleFactor: 2,
//       hasTouch: true
//     },
//     userAgent: 'Mozilla/5.0 (Linux; Android 11; TECNO KG7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Mobile Safari/537.36'
//   },
//   {
//     name: 'Samsung Galaxy S20',
//     viewport: { 
//       width: 360, 
//       height: 800, 
//       isMobile: true, 
//       deviceScaleFactor: 3,
//       hasTouch: true
//     },
//     userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G980F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
//   },
//   {
//     name: 'iPhone X',
//     viewport: {
//       width: 375,
//       height: 812,
//       isMobile: true,
//       deviceScaleFactor: 3,
//       hasTouch: true
//     },
//     userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
//   },
//   {
//     name: 'iPhone 11 Pro',
//     viewport: {
//       width: 375,
//       height: 812,
//       isMobile: true,
//       deviceScaleFactor: 3,
//       hasTouch: true
//     },
//     userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
//   },
//   {
//     name: 'iPad Pro 11',
//     viewport: {
//       width: 834,
//       height: 1194,
//       isMobile: true,
//       deviceScaleFactor: 2,
//       hasTouch: true
//     },
//     userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1'
//   }
// ];

// async function getChromePath() {
//   try {
//     return puppeteer.executablePath();
//   } catch (err) {
//     console.log('Falling back to system Chrome...');
//     return chromeLauncher.getChromePath();
//   }
// }

// async function testWebsiteOnDevice(url, device, outputDir) {
//   let browser;
//   const result = {
//     problems: [],
//     screenshots: [],
//     pdfPath: ''
//   };

//   try {
//     const chromePath = await getChromePath();
//     browser = await puppeteer.launch({
//       executablePath: chromePath,
//       headless: 'new',
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
//     });

//     const page = await browser.newPage();

//     if (device.userAgent) {
//       await page.setUserAgent(device.userAgent);
//     }

//     await page.setViewport({
//       ...device.viewport,
//       width: 290,
//       height: 400
//     });

//     let loaded = false;
//     let attempts = 0;

//     while (!loaded && attempts <= METRICS.RETRY_ATTEMPTS) {
//       try {
//         await page.goto(url, {
//           waitUntil: 'domcontentloaded',
//           timeout: METRICS.NAVIGATION_TIMEOUT
//         });
//         loaded = true;
//       } catch (err) {
//         attempts++;
//         if (attempts > METRICS.RETRY_ATTEMPTS) {
//           throw new Error(`Failed to load page after ${METRICS.RETRY_ATTEMPTS} attempts: ${err.message}`);
//         }
//         console.log(`↻ Retrying ${device.name} (attempt ${attempts})...`);
//       }
//     }

//     const smallTextCount = await page.$$eval('*', (elements, minSize) => {
//       return elements.filter(el => {
//         try {
//           const style = window.getComputedStyle(el);
//           return parseFloat(style.fontSize) < minSize &&
//             style.visibility !== 'hidden' &&
//             style.display !== 'none';
//         } catch {
//           return false;
//         }
//       }).length;
//     }, METRICS.MIN_FONT_SIZE);

//     if (smallTextCount > 0) {
//       result.problems.push(`${smallTextCount} elements with small text (<${METRICS.MIN_FONT_SIZE}px)`);
//     }

//     const smallButtonsCount = await page.$$eval(
//       'button, a[href], [role=button], [onclick]',
//       (elements, minSize) => {
//         return elements.filter(el => {
//           try {
//             const style = window.getComputedStyle(el);
//             const rect = el.getBoundingClientRect();
//             return (rect.width < minSize || rect.height < minSize) &&
//               style.visibility !== 'hidden' &&
//               style.display !== 'none';
//           } catch {
//             return false;
//           }
//         }).length;
//       },
//       METRICS.MIN_BUTTON_SIZE
//     );

//     if (smallButtonsCount > 0) {
//       result.problems.push(`${smallButtonsCount} small buttons/links (<${METRICS.MIN_BUTTON_SIZE}px)`);
//     }

//     const screenshotDir = path.join(outputDir, METRICS.SCREENSHOT_DIR);
//     fs.mkdirSync(screenshotDir, { recursive: true });

//     const fileName = `${device.name.replace(/\s+/g, '_')}_fixedSize.${METRICS.SCREENSHOT_TYPE}`;
//     const screenshotPath = path.join(screenshotDir, fileName);

//     const screenshotOptions = {
//       path: screenshotPath,
//       fullPage: false,
//       type: METRICS.SCREENSHOT_TYPE,
//       clip: {
//         x: 0,
//         y: 0,
//         width: 290,
//         height: 400
//       }
//     };

//     if (METRICS.SCREENSHOT_TYPE === 'jpeg') {
//       screenshotOptions.quality = METRICS.JPEG_QUALITY;
//     }

//     await page.screenshot(screenshotOptions);
//     result.screenshots.push(screenshotPath);
//     console.log(`📸 Screenshot saved: ${screenshotPath}`);

//     // Performance metrics
//     const perfTiming = await page.evaluate(() => JSON.stringify(window.performance.timing));
//     const timing = JSON.parse(perfTiming);
//     const loadTime = (timing.loadEventEnd - timing.navigationStart) / 1000;
//     const firstPaint = (timing.responseStart - timing.navigationStart) / 1000;
//     const tti = (timing.domInteractive - timing.navigationStart) / 1000;

//     const pdfPath = path.join(outputDir, 'report.pdf');
//     result.pdfPath = pdfPath;
//     const doc = new PDFDocument({ autoFirstPage: false });
//     const stream = fs.createWriteStream(pdfPath);
//     doc.pipe(stream);

//     doc.addPage();
//     doc.fontSize(20).text('Website Performance Report', { align: 'center' });
//     doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()} GMT`, { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(14).fillColor('green').text(`Performance Score: 98/100`);
//     doc.fillColor('blue').text(`Total Pages Scanned: 156`);
//     doc.fillColor('purple').text(`Issues Found: 12`);

//     doc.addPage();
//     doc.fontSize(16).text('Performance Metrics', { underline: true });
//     doc.fontSize(12).fillColor('black').text(`Page Load Time: ${loadTime.toFixed(1)}s`);
//     doc.text(`First Contentful Paint: ${firstPaint.toFixed(1)}s`);
//     doc.text(`Time to Interactive: ${tti.toFixed(1)}s`);

//     for (const imgPath of result.screenshots) {
//       if (fs.existsSync(imgPath)) {
//         doc.addPage();
//         doc.fontSize(14).text('Page Screenshot', { align: 'center' });
//         doc.image(imgPath, {
//           fit: [290, 400],
//           align: 'center',
//           valign: 'center'
//         });
//       }
//     }

//     doc.end();
//     await new Promise(resolve => stream.on('finish', resolve));
//     console.log(`📄 PDF saved: ${pdfPath}`);

//     return result;

//   } catch (err) {
//     console.error(`❌ Error testing ${device.name}:`, err.message);
//     throw err;
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// }

// module.exports = {
//   testDevices,
//   testWebsiteOnDevice,
//   METRICS
// };


const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const URL = require('url').URL;

const METRICS = {
  MIN_FONT_SIZE: 14,
  MIN_BUTTON_SIZE: 48,
  MAX_DEPTH: 2
};

async function crawlAllPages(startUrl, page, maxDepth = METRICS.MAX_DEPTH) {
  const visited = new Set();
  const toVisit = [{ url: startUrl, depth: 0 }];

  while (toVisit.length > 0) {
    const { url, depth } = toVisit.shift();
    if (visited.has(url) || depth > maxDepth) continue;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      visited.add(url);
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => a.href).filter(href => href.startsWith(window.location.origin))
      );
      for (const link of links) {
        if (!visited.has(link)) {
          toVisit.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (err) {
      console.warn(`Skipping ${url}: ${err.message}`);
    }
  }

  return Array.from(visited);
}

async function getPerformanceScore(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance'], port: chrome.port };

  const runnerResult = await lighthouse(url, options);
  const score = runnerResult.lhr.categories.performance.score * 100;
  await chrome.kill();
  return score;
}

async function analyzePage(url, page) {
  const issues = [];

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const smallTextCount = await page.$$eval('*', (els, minSize) => {
    return els.filter(el => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.fontSize) < minSize &&
             style.display !== 'none' && style.visibility !== 'hidden';
    }).length;
  }, METRICS.MIN_FONT_SIZE);
  if (smallTextCount > 0) issues.push(`🔎 ${smallTextCount} small text elements`);

  const smallButtonsCount = await page.$$eval('button, a[href], [role=button]', (els, minSize) => {
    return els.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (rect.width < minSize || rect.height < minSize) &&
             style.display !== 'none' && style.visibility !== 'hidden';
    }).length;
  }, METRICS.MIN_BUTTON_SIZE);
  if (smallButtonsCount > 0) issues.push(`🔘 ${smallButtonsCount} small buttons/links`);

  return issues;
}

async function runAudit(startUrl, outputDir = './results') {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const domain = new URL(startUrl).origin;

  const allPages = await crawlAllPages(startUrl, page);
  const allIssues = [];
  let totalIssues = 0;

  for (const url of allPages) {
    const issues = await analyzePage(url, page);
    if (issues.length > 0) {
      allIssues.push({ url, issues });
      totalIssues += issues.length;
    }
  }

  const perfScore = await getPerformanceScore(startUrl);

  // Create PDF
  fs.mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, 'audit_report.pdf');
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(20).text('Web Accessibility & Performance Report', { align: 'center' });
  doc.moveDown().fontSize(12).text(`Date: ${new Date().toUTCString()}`);
  doc.moveDown().fontSize(14).text(`🏁 Total Pages Scanned: ${allPages.length}`);
  doc.text(`📊 Performance Score: ${perfScore}/100`);
  doc.text(`⚠️ Total Issues Found: ${totalIssues}`);
  doc.moveDown().fontSize(16).text('Detailed Issues:', { underline: true });

  allIssues.forEach(({ url, issues }) => {
    doc.fontSize(12).moveDown().fillColor('blue').text(url);
    issues.forEach(issue => doc.fillColor('black').text(`• ${issue}`));
  });

  doc.end();
  await browser.close();
  console.log(`✅ Report generated: ${pdfPath}`);
}

// Example usage:
runAudit('https://example.com');
