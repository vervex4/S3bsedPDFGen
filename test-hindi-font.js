const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");

async function testHindiFont() {
  console.log("Starting Hindi font test...");

  // Test HTML with Hindi content
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Noto Sans Devanagari';
          src: url('https://numeriisoft.com/assets/NotoSansDevanagari-Bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        body {
          font-family: 'Noto Sans Devanagari', 'Arial Unicode MS', Arial, sans-serif;
          font-size: 16px;
          padding: 20px;
        }
        .hindi-text {
          font-weight: bold;
          font-size: 24px;
          color: #333;
        }
        .english-text {
          font-size: 18px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1 class="hindi-text">नमस्ते दुनिया</h1>
      <p class="hindi-text">यह हिंदी में एक परीक्षण है।</p>
      <p class="english-text">This is a test in English.</p>
      <p class="hindi-text">यह बोल्ड टेक्स्ट है।</p>
      <p>Mixed text: Hello नमस्ते World दुनिया</p>
    </body>
    </html>
  `;

  let browser = null;
  try {
    // Load custom Hindi font
    const fontURL =
      "https://numeriisoft.com/assets/NotoSansDevanagari-Bold.ttf";
    try {
      await chromium.font(fontURL);
      console.log("Hindi font loaded successfully");
    } catch (fontError) {
      console.log(
        "Font loading failed, continuing without custom font:",
        fontError
      );
    }

    // Launch browser
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-extensions",
        "--disable-plugins",
        "--enable-fonts",
        "--enable-images",
        "--font-render-hinting=none",
        "--disable-font-subpixel-positioning",
        "--disable-web-security",
        "--memory-pressure-off",
        "--max_old_space_size=2048",
      ],
      defaultViewport: {
        width: 1200,
        height: 800,
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(testHTML, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Wait for fonts to load
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    console.log("Content loaded, generating PDF...");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      timeout: 120000,
    });

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Save PDF locally for inspection
    const fs = require("fs");
    fs.writeFileSync("test-hindi-output.pdf", pdfBuffer);
    console.log("PDF saved as test-hindi-output.pdf");

    // Also generate a screenshot to see the rendering
    await page.screenshot({
      path: "test-hindi-screenshot.png",
      fullPage: true,
    });
    console.log("Screenshot saved as test-hindi-screenshot.png");

    return true;
  } catch (error) {
    console.error("Error during test:", error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testHindiFont()
  .then((success) => {
    if (success) {
      console.log("✅ Hindi font test completed successfully!");
    } else {
      console.log("❌ Hindi font test failed!");
    }
  })
  .catch((error) => {
    console.error("❌ Test error:", error);
  });
