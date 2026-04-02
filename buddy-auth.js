#!/usr/bin/env bun
/**
 * 松鼠的AI助手 | Auth Token 替换工具
 *
 * 使用方式: bun buddy-auth.js
 */

const VERSION = "1.0.0";

import { readFileSync, writeFileSync } from "fs";

function centerLine(text, width) {
  const pad = Math.max(0, width - [...text].reduce((n, c) => n + (c.charCodeAt(0) > 127 ? 2 : 1), 0));
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}
import { join } from "path";
import { homedir } from "os";
import * as readline from "readline";

// ============ 配置操作 ============
function getConfigPath() {
  return join(homedir(), ".claude.json");
}

function readConfig() {
  try {
    return JSON.parse(readFileSync(getConfigPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

// ============ 交互式界面 ============
function ask(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.on('line', answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============ 主程序 ============
async function main() {
  const W = 44;
  const title = `🔑 松鼠的AI助手 | Auth Token 替换工具`;
  console.log("\n" + "=".repeat(W));
  console.log(centerLine(title, W));
  console.log(centerLine(` v${VERSION} `, W));
  console.log("=".repeat(W) + "\n");

  const config = readConfig();
  const currentToken = config.CLAUDE_CODE_OAUTH_TOKEN || "";

  console.log(`📁 配置文件: ${getConfigPath()}`);
  console.log(`\n当前 Token: ${currentToken ? currentToken.substring(0, 20) + "..." : "(空)"}`);
  console.log("");

  let tokenInput = await ask("请输入新的 CLAUDE_CODE_OAUTH_TOKEN (直接回车保留当前): ");
  tokenInput = tokenInput.trim();

  if (tokenInput === "") {
    console.log("\n已取消操作，未修改 Token。");
    return;
  }

  // 移除旧字段
  delete config.CLAUDE_CODE_OAUTH_TOKEN;
  delete config.accountUuid;
  delete config.companion;
  delete config.companionMuted;
  delete config.userID;

  // 设置新 Token
  config.CLAUDE_CODE_OAUTH_TOKEN = tokenInput;

  writeConfig(config);

  console.log("\n✅ Token 已更新!");
  console.log(`   新 Token: ${tokenInput.substring(0, 20)}...`);
  console.log("\n💡 请重启 Claude Code 使配置生效。");
}

main();
