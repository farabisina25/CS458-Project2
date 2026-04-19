/**
 * Synchronized Selenium (Web Architect) + Appium (Mobile) scenario:
 * While mobile selects an answer that toggles conditional visibility, the web session
 * publishes a conflicting edge layout. Assert mobile surfaces GBCR/RCLR structured conflict.
 *
 * Env: WEB_URL, API_URL, APPIUM_APP_PATH (optional mobile leg), CHROME_BIN, etc.
 */
import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { remote } from "webdriverio";

const WEB_URL = process.env.WEB_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";
const APP = process.env.APPIUM_APP_PATH ?? "";

async function fetchLatestSurvey() {
  const r = await fetch(`${API_URL}/surveys/live-demo`);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

async function runWebLeg(conflicting) {
  const options = new chrome.Options();
  if (process.env.CI) options.addArguments("--headless=new", "--no-sandbox");
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  try {
    await driver.get(WEB_URL);
    await driver.wait(until.elementLocated(By.css('[data-testid="architect-publish"]')), 20000);
    await driver.executeAsyncScript(
      `const cb = arguments[arguments.length - 1];
       const body = arguments[0];
       fetch('/api/surveys/live-demo', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(body)
       }).then(r => r.json()).then(cb).catch(e => cb({ error: String(e) }));`,
      conflicting,
    );
  } finally {
    await driver.quit();
  }
}

async function runMobileLeg() {
  if (!APP) {
    console.warn("[sync] skipping Appium leg — set APPIUM_APP_PATH");
    return;
  }
  const mod = await import("../mobile-appium/wdio.conf.cjs");
  const driver = await remote({
    hostname: process.env.APPIUM_HOST ?? "127.0.0.1",
    port: Number(process.env.APPIUM_PORT ?? 4723),
    path: "/",
    capabilities: { alwaysMatch: mod.capabilities },
  });
  try {
    await driver.$("~login-user").setValue("sync");
    await driver.$("~login-pass").setValue("sync");
    await driver.$("~login-submit").click();
    await driver.pause(1500);
    const tap = driver.$("~choice-q1-A");
    await tap.click();
    await driver.pause(8000);
    const banner = await driver.$("~gbcr-banner");
    const conflict = await driver.$("~rclr-inline-conflict");
    const bannerOn = await banner.isDisplayed().catch(() => false);
    const conflictOn = await conflict.isDisplayed().catch(() => false);
    assert.ok(
      bannerOn || conflictOn,
      "Expected GBCR banner or RCLR conflict strip after concurrent schema mutation",
    );
    const q2 = await driver.$("~question-q2");
    const q3 = await driver.$("~question-q3");
    const both =
      (await q2.isDisplayed().catch(() => false)) && (await q3.isDisplayed().catch(() => false));
    assert.equal(both, false, "Mutually exclusive branches should not both appear as valid");
  } finally {
    await driver.deleteSession();
  }
}

const webReady = await fetch(`${API_URL}/health`).then((r) => r.ok).catch(() => false);
if (!webReady) {
  console.error("API not reachable; start apps/api first.");
  process.exit(1);
}

const before = await fetchLatestSurvey();
const conflicting = {
  ...before,
  edges: [
    {
      id: "e1",
      from: "q1",
      to: "q3",
      condition: { type: "equals", questionId: "q1", value: "A" },
    },
    {
      id: "e2",
      from: "q1",
      to: "q2",
      condition: { type: "equals", questionId: "q1", value: "B" },
    },
  ],
};

await Promise.all([
  (async () => {
    await new Promise((r) => setTimeout(r, APP ? 3500 : 0));
    await runWebLeg(conflicting);
  })(),
  APP ? runMobileLeg() : Promise.resolve(),
]);

console.log("Sync-conflict orchestration finished.");
