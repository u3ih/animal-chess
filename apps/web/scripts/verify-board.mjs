import { chromium, devices } from "playwright";

const browser = await chromium.launch();

async function inspect(name, viewport) {
  const page = await browser.newPage(viewport);
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/private/tmp/${name}.png` });
  const result = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return { hasCanvas: false };
    return {
      hasCanvas: true,
      width: canvas.width,
      height: canvas.height,
      dataUrlLength: canvas.toDataURL().length,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    };
  });
  await page.close();
  return { ...result, errors };
}

const desktop = await inspect("animal-desktop", { viewport: { width: 1440, height: 900 } });
const mobile = await inspect("animal-mobile", { ...devices["iPhone 14"] });
console.log(JSON.stringify({ desktop, mobile }));

await browser.close();
