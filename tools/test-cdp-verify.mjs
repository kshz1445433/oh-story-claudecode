// 受控复现 setup-cdp-chrome.js 第 9/10 步：spawn 调试实例 -> 计时冷启动 -> 跑真实验证链
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const cdp = require("../skills/browser-cdp/scripts/setup-cdp-chrome.js");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "C:\\Users\\74439\\edge-debug-profile";
const PORT = 9222;

function probe() {
  return new Promise((resolve) => {
    const req = require("node:http").get(
      { host: "127.0.0.1", port: PORT, path: "/json/version", timeout: 3000 },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

const child = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--remote-allow-origins=*",
  "--no-first-run",
  "--no-default-browser-check",
], { detached: true, stdio: "ignore" });
child.unref();
const pid = child.pid;
console.log(`[spawn] launcher pid=${pid}, t=0ms`);

const t0 = Date.now();
let body = null;
while (Date.now() - t0 < 90000) {
  await new Promise((r) => setTimeout(r, 500));
  body = await probe();
  if (body) break;
}
const readyMs = Date.now() - t0;
console.log(`[cold-start] CDP 应答耗时: ${body ? `${readyMs}ms` : "90s 超时未就绪"}`);
if (!body) process.exit(2);

console.log(`[alive] launcher 存活: ${await (await import("node:fs")).promises.readFile(`/proc/${pid}/stat`).then(() => true, () => null) ?? "n/a(win)"}`);

console.log("[verify] 逐项计时：");
let s = Date.now();
const listeners = cdp.listPortListenerPids(PORT);
console.log(`  listPortListenerPids: ${Date.now() - s}ms ->`, listeners);

s = Date.now();
const parents = cdp.listProcessParents();
console.log(`  listProcessParents: ${Date.now() - s}ms -> 条数=${parents ? parents.size : "null"}`);

s = Date.now();
const cmd = listeners && listeners[0] ? cdp.processCommandLine(listeners[0]) : null;
console.log(`  processCommandLine(${listeners && listeners[0]}): ${Date.now() - s}ms -> ${cmd ? "含调试端口参数=" + /remote-debugging-port/.test(cmd) : "null"}`);

s = Date.now();
const result = cdp.verifyPortOwnedByLaunch(PORT, pid, "Microsoft Edge");
console.log(`  verifyPortOwnedByLaunch: ${Date.now() - s}ms`);
console.log(`  结果: ${JSON.stringify(result)}`);
