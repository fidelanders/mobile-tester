const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const chromeLauncher = require('chrome-launcher');

// Constants and Configuration
const METRICS = {
  MIN_FONT_SIZE: 14,
  MIN_BUTTON_SIZE: 48,
  MAX_SCREENSHOTS: 10,
  SCREENSHOT_DIR: 'screenshots',
  NAVIGATION_TIMEOUT: 60000, // 60 seconds
  RETRY_ATTEMPTS: 2,
  SCREENSHOT_TYPE: 'jpeg', // 'jpeg' or 'png'
  JPEG_QUALITY: 80,
  SCROLL_TIMEOUT: 10000, // 10 seconds
  SCROLL_POLLING: 200 // ms
};

// Device Configurations
const testDevices = [
  {
    name: 'Tecno Spark 10 Pro',
    viewport: { 
      width: 360, 
      height: 800, 
      isMobile: true, 
      deviceScaleFactor: 2,
      hasTouch: true
    },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; TECNO KG7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Mobile Safari/537.36'
  },
  {
    name: 'Samsung Galaxy S20',
    viewport: { 
      width: 360, 
      height: 800, 
      isMobile: true, 
      deviceScaleFactor: 3,
      hasTouch: true
    },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G980F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
  },
  {
    name: 'iPhone X',
    viewport: {
      width: 375,
      height: 812,
      isMobile: true,
      deviceScaleFactor: 3,
      hasTouch: true
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'iPhone 11 Pro',
    viewport: {
      width: 375,
      height: 812,
      isMobile: true,
      deviceScaleFactor: 3,
      hasTouch: true
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'iPad Pro 11',
    viewport: {
      width: 834,
      height: 1194,
      isMobile: true,
      deviceScaleFactor: 2,
      hasTouch: true
    },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1'
  }
];

async function getChromePath() {
  try {
    return puppeteer.executablePath();
  } catch (err) {
    console.log('Falling back to system Chrome...');
    return chromeLauncher.getChromePath();
  }
}

async function testWebsiteOnDevice(url, device, outputDir) {
  let browser;
  const result = {
    problems: [],
    screenshots: [],
    pdfPath: ''
  };

  try {
    const chromePath = await getChromePath();
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-http2',
        '--disable-gpu'
      ],
      timeout: 120000
    });

    const page = await browser.newPage();
    
    // Set device configuration
    if (device.userAgent) {
      await page.setUserAgent(device.userAgent);
    }
    await page.setViewport(device.viewport);

    // Navigation with retry logic
    let loaded = false;
    let attempts = 0;
    
    while (!loaded && attempts <= METRICS.RETRY_ATTEMPTS) {
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: METRICS.NAVIGATION_TIMEOUT
        });
        loaded = true;
      } catch (err) {
        attempts++;
        if (attempts > METRICS.RETRY_ATTEMPTS) {
          throw new Error(`Failed to load page after ${METRICS.RETRY_ATTEMPTS} attempts: ${err.message}`);
        }
        console.log(`↻ Retrying ${device.name} (attempt ${attempts})...`);
      }
    }

    // Check font sizes
    try {
      const smallTextCount = await page.$$eval('*', (elements, minSize) => {
        return elements.filter(el => {
          try {
            const style = window.getComputedStyle(el);
            return parseFloat(style.fontSize) < minSize && 
                   style.visibility !== 'hidden' &&
                   style.display !== 'none';
          } catch {
            return false;
          }
        }).length;
      }, METRICS.MIN_FONT_SIZE);
      
      if (smallTextCount > 0) {
        result.problems.push(`${smallTextCount} elements with small text (<${METRICS.MIN_FONT_SIZE}px)`);
      }
    } catch (err) {
      console.error('Error checking font sizes:', err.message);
    }

    // Check button sizes
    try {
      const smallButtonsCount = await page.$$eval(
        'button, a[href], [role=button], [onclick]', 
        (elements, minSize) => {
          return elements.filter(el => {
            try {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return (rect.width < minSize || rect.height < minSize) && 
                     style.visibility !== 'hidden' &&
                     style.display !== 'none';
            } catch {
              return false;
            }
          }).length;
        }, 
        METRICS.MIN_BUTTON_SIZE
      );
      
      if (smallButtonsCount > 0) {
        result.problems.push(`${smallButtonsCount} small buttons/links (<${METRICS.MIN_BUTTON_SIZE}px)`);
      }
    } catch (err) {
      console.error('Error checking button sizes:', err.message);
    }

    // Create screenshots directory
    const screenshotDir = path.join(outputDir, METRICS.SCREENSHOT_DIR);
    fs.mkdirSync(screenshotDir, { recursive: true });

    // Capture screenshots
    try {
      let offset = 0;
      let shotIndex = 0;
      let lastHeight = 0;
      let sameHeightCount = 0;
      const viewportHeight = device.viewport.height;

      while (shotIndex < METRICS.MAX_SCREENSHOTS) {
        console.log(`📸 Capturing screenshot ${shotIndex + 1} at ${offset}px`);
        
        try {
          await page.evaluate(y => window.scrollTo(0, y), offset);
          
          await page.waitForFunction(
            (y) => {
              const currentPos = window.scrollY;
              return Math.abs(currentPos - y) < 10 || 
                     currentPos >= document.body.scrollHeight - window.innerHeight;
            },
            { 
              timeout: METRICS.SCROLL_TIMEOUT,
              polling: METRICS.SCROLL_POLLING
            },
            offset
          );
        } catch (err) {
          console.log(`⚠️ Scroll interrupted at ${offset}px, continuing...`);
        }

        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        
        try {
          const fileName = `${device.name.replace(/\s+/g, '_')}_${shotIndex}.${METRICS.SCREENSHOT_TYPE}`;
          const screenshotPath = path.join(screenshotDir, fileName);
          
          const screenshotOptions = {
            path: screenshotPath,
            fullPage: false,
            type: METRICS.SCREENSHOT_TYPE
          };
          
          if (METRICS.SCREENSHOT_TYPE === 'jpeg') {
            screenshotOptions.quality = METRICS.JPEG_QUALITY;
          }

          await page.screenshot(screenshotOptions);
          result.screenshots.push(screenshotPath);
        } catch (err) {
          console.error(`Error taking screenshot ${shotIndex}:`, err.message);
          offset += viewportHeight;
          shotIndex++;
          continue;
        }

        // Height change detection
        if (currentHeight === lastHeight) {
          sameHeightCount++;
          if (sameHeightCount > 2) break;
        } else {
          sameHeightCount = 0;
          lastHeight = currentHeight;
        }

        offset += viewportHeight;
        shotIndex++;

        if (offset >= currentHeight) break;
      }
    } catch (err) {
      console.error('Error during screenshot process:', err.message);
    }

    // Generate PDF report
    const pdfPath = path.join(outputDir, 'report.pdf');
    result.pdfPath = pdfPath;
    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    try {
      // Title page
      doc.addPage();
      doc.fontSize(20).text('Mobile Test Report', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text(`Tested URL: ${url}`);
      doc.text(`Device: ${device.name}`);
      doc.text(`Date: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Results summary
      if (result.problems.length === 0) {
        doc.text('✅ No mobile issues found.', { align: 'center' });
      } else {
        doc.text('❌ Issues Detected:', { underline: true });
        result.problems.forEach(p => doc.text(`• ${p}`));
      }

      // Add screenshots
      if (result.screenshots.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Page Screenshots', { align: 'center' });
        
        for (const imgPath of result.screenshots) {
          try {
            if (fs.existsSync(imgPath)) {
              doc.addPage();
              doc.text(`📸 ${path.basename(imgPath)}`, { align: 'center' });
              doc.image(imgPath, {
                fit: [500, 600],
                align: 'center',
                valign: 'center'
              });
            }
          } catch (err) {
            console.error('Error adding image to PDF:', err.message);
          }
        }
      }

      doc.end();
      await new Promise(resolve => stream.on('finish', resolve));
      console.log(`📄 PDF saved: ${pdfPath}`);
    } catch (err) {
      console.error('Error generating PDF:', err.message);
      throw err;
    }

    return result;

  } catch (err) {
    console.error(`❌ Error testing ${device.name}:`, err.message);
    throw err;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err.message);
      }
    }
  }
}

module.exports = {
  testDevices,
  testWebsiteOnDevice,
  METRICS
};