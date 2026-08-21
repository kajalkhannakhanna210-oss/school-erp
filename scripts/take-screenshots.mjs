import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:3002';
const OUT_DESKTOP = path.resolve(process.cwd(), 'screenshot-dashboard-desktop.png');
const OUT_MOBILE = path.resolve(process.cwd(), 'screenshot-dashboard-mobile.png');

function waitForServer(url, timeout = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      const req = http.get(url, res => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Server did not start in time'));
        setTimeout(check, 500);
      });
      req.setTimeout(3000, () => req.destroy());
    })();
  });
}

(async () => {
  try {
    console.log('Waiting for dev server at', URL);
    await waitForServer(URL, 180000);
    console.log('Server is up, launching Chromium...');

    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || path.resolve(process.cwd(), '.local-chrome', 'chrome-win', 'chrome.exe');
    if (!fs.existsSync(execPath)) {
      console.error('Chromium executable not found at', execPath);
      process.exit(2);
    }

    const browser = await puppeteer.launch({ executablePath: execPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Desktop
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((res) => setTimeout(res, 800));
    await page.screenshot({ path: OUT_DESKTOP, fullPage: true });
    console.log('Desktop screenshot saved to', OUT_DESKTOP);

    // Mobile
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((res) => setTimeout(res, 800));
    await page.screenshot({ path: OUT_MOBILE, fullPage: true });
    console.log('Mobile screenshot saved to', OUT_MOBILE);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error taking screenshots:', err);
    process.exit(1);
  }
})();
