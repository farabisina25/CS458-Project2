/** Example capabilities; override via env for your Appium server / device. */
exports.capabilities = {
  platformName: process.env.APPIUM_PLATFORM ?? "Android",
  "appium:deviceName": process.env.APPIUM_DEVICE ?? "Android Emulator",
  "appium:app": process.env.APPIUM_APP_PATH ?? "",
  "appium:automationName": process.env.APPIUM_AUTOMATION ?? "UiAutomator2",
};
