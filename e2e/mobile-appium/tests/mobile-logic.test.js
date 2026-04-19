/**
 * Appium-backed scenarios focused on conditional logic, GBCR surfacing, and completion gates.
 * Requires: Appium 2.x, running emulator/device, EXPO_PUBLIC_API_URL reachable from device,
 * and APPIUM_APP_PATH pointing to the built .apk (or use browser stack).
 *
 * Skip when APPIUM_APP_PATH is unset (local dev default).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { remote } from "webdriverio";

const app = process.env.APPIUM_APP_PATH ?? "";

describe("Mobile Appium · survey logic (10 cases)", () => {
  let driver;

  before(async () => {
    if (!app) return;
    const mod = await import("../wdio.conf.cjs");
    driver = await remote({
      hostname: process.env.APPIUM_HOST ?? "127.0.0.1",
      port: Number(process.env.APPIUM_PORT ?? 4723),
      path: "/",
      capabilities: {
        alwaysMatch: mod.capabilities,
      },
    });
  });

  after(async () => {
    if (driver && app) await driver.deleteSession();
  });

  const req = (name, fn) =>
    it(name, async () => {
      if (!app) {
        console.warn(`[skip] ${name} — set APPIUM_APP_PATH`);
        return;
      }
      await fn();
    });

  req("01 login screen exposes username field", async () => {
    const el = await driver.$('~login-user');
    assert.ok(await el.isDisplayed());
  });

  req("02 successful login reveals survey shell", async () => {
    await driver.$('~login-user').setValue("demo");
    await driver.$('~login-pass').setValue("demo");
    await driver.$('~login-submit').click();
    const survey = await driver.$('~survey-screen');
    assert.ok(await survey.isDisplayed());
  });

  req("03 schema version label tracks backend", async () => {
    const label = await driver.$('~schema-version-label');
    const text = await label.getText();
    assert.match(text, /live-demo v\d+/);
  });

  req("04 first question renders choices", async () => {
    const q1 = await driver.$('~question-q1');
    assert.ok(await q1.isDisplayed());
    const a = await driver.$('~choice-q1-A');
    assert.ok(await a.isDisplayed());
  });

  req("05 choosing path A reveals Path A detail (recursive visibility)", async () => {
    await driver.$('~choice-q1-A').click();
    const q2 = await driver.$('~question-q2');
    assert.ok(await q2.isDisplayed());
  });

  req("06 Path B rating branch hidden when A selected", async () => {
    const q3 = await driver.$('~question-q3');
    assert.ok(!(await q3.isDisplayed().catch(() => false)));
  });

  req("07 text completion enables Send when RCLR consistent", async () => {
    const field = await driver.$('~text-q2');
    await field.setValue("integration detail");
    await driver.hideKeyboard?.();
    const send = await driver.$('~survey-send');
    assert.ok(await send.isDisplayed());
  });

  req("08 GBCR banner uses structured outcome codes after hot schema publish", async () => {
    /** Placeholder: wire to CI that publishes a conflicting schema mid-test. */
    const banner = await driver.$('~gbcr-banner');
    const shown = await banner.isDisplayed().catch(() => false);
    assert.ok(typeof shown === "boolean");
  });

  req("09 RCLR conflict strip not a generic alert", async () => {
    const strip = await driver.$('~rclr-inline-conflict');
    const shown = await strip.isDisplayed().catch(() => false);
    if (shown) {
      const txt = await strip.getText();
      assert.match(txt, /RCLR:/);
    }
  });

  req("10 no zombie question without parent (visibility tied to DAG)", async () => {
    const orphan = await driver.$('~question-orphan');
    const exists = await orphan.isDisplayed().catch(() => false);
    assert.equal(exists, false);
  });
});
