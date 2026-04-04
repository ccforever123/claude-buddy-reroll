#!/usr/bin/env bun
/**
 * 松鼠的AI助手 | Auth 自动登录工具
 *
 * 使用方式: bun buddy-auth.js
 * 流程：
 * 1. claude setup-token 获取 oauth token
 * 2. 设置基础 ~/.claude.json（防止 OAuth 登录循环）
 * 3. 用 CLAUDE_CODE_OAUTH_TOKEN 环境变量启动 claude
 * 4. 提示用户用 buddy-reroll.js 刷 userID
 */

const VERSION = "1.0.4";

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync, spawn } from "child_process";

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

function centerLine(text, width) {
  const pad = Math.max(0, width - [...text].reduce((n, c) => n + (c.charCodeAt(0) > 127 ? 2 : 1), 0));
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}

function checkLoginStatus() {
  try {
    const result = execSync("claude auth status --json", { encoding: "utf-8" });
    const status = JSON.parse(result);
    return status.loggedIn === true;
  } catch {
    return false;
  }
}

function hasOAuthToken() {
  const config = readConfig();
  return !!(config.oauthAccount && config.oauthAccount.accessToken);
}

function hasUserID() {
  const config = readConfig();
  return !!config.userID;
}

// ============ 主流程 ============
async function main() {
  const W = 44;
  const title = `🔑 松鼠的AI助手 | Auth 自动登录工具`;
  console.log("\n" + "=".repeat(W));
  console.log(centerLine(title, W));
  console.log(centerLine(` v${VERSION} `, W));
  console.log("=".repeat(W) + "\n");

  console.log(`📁 配置文件: ${getConfigPath()}`);

  const isLoggedIn = checkLoginStatus();
  const config = readConfig();

  // 检查当前状态
  if (isLoggedIn && hasUserID()) {
    const account = config.oauthAccount || {};
    console.log(`🔐 登录状态: ✅ 已登录`);
    console.log(`\n✅ 已登录账户信息:`);
    console.log(`   邮箱: ${account.emailAddress || "未知"}`);
    console.log(`   用户: ${account.displayName || "未知"}`);
    console.log(`   userID: ${config.userID || "未设置"}`);
    console.log(`\n💡 如需切换账户，请先运行: claude auth logout`);
    console.log(`💡 如需重刷宠物，请运行: bun buddy-reroll.js`);
    return;
  }

  // 步骤 1: 获取 OAuth Token
  console.log("\n📌 步骤 1/4: 获取 OAuth Token");
  console.log("   执行: claude setup-token\n");

  try {
    execSync("claude setup-token", { stdio: "inherit" });
  } catch (e) {
    console.log("\n❌ 获取 Token 失败或已取消");
    return;
  }

  // 步骤 2: 设置基础配置（防止 OAuth 登录循环）
  console.log("\n📌 步骤 2/4: 设置基础配置");
  const basicConfig = {
    hasCompletedOnboarding: true,
    theme: "dark"
  };
  writeConfig(basicConfig);
  console.log("   ✅ 已写入基础配置（防止 OAuth 登录循环）");

  // 步骤 3: 提示用户设置环境变量并启动 claude
  console.log("\n📌 步骤 3/4: 设置环境变量并启动 Claude");
  console.log("\n" + "─".repeat(W));
  console.log("⚠️  请按以下步骤操作：");
  console.log("─".repeat(W));
  console.log("\n1. 复制上面显示的 OAuth Token");
  console.log("\n2. 在终端中运行以下命令：");
  console.log("\n   PowerShell:");
  console.log('   $env:CLAUDE_CODE_OAUTH_TOKEN="你的token"; claude');
  console.log("\n   CMD:");
  console.log('   set CLAUDE_CODE_OAUTH_TOKEN=你的token && claude');
  console.log("\n   Bash/Mac/Linux:");
  console.log('   CLAUDE_CODE_OAUTH_TOKEN="你的token" claude');
  console.log("\n3. Claude Code 启动后，直接输入 /exit 退出");
  console.log("   (不要使用 /buddy，否则会自动生成 userID)");
  console.log("\n4. 运行 bun buddy-reroll.js 刷取 userID");
  console.log("\n5. 再次启动 claude，输入 /buddy 查看宠物");

  console.log("\n" + "=".repeat(W));
  console.log("💡 原理说明");
  console.log("=".repeat(W));
  console.log("使用 CLAUDE_CODE_OAUTH_TOKEN 环境变量登录时，");
  console.log("不会把 accountUuid 写入 ~/.claude.json，");
  console.log("/buddy 就不会用 accountUuid 替代 userID。");
  console.log("这样就可以用自定义的 userID 来刷宠物了。");
}

main();