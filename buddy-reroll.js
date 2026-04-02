#!/usr/bin/env bun
/**
 * 松鼠的AI助手 | Claude Buddy Reroll
 * Claude Code Buddy 宠物刷取工具
 *
 * 使用方式: bun buddy-reroll.js
 * 或直接运行 (需要 bun 环境)
 */

const VERSION = "1.0.1";

import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as readline from "readline";

// ============ Buddy 生成逻辑（来自 Claude Code 源码） ============
const SALT = "friend-2026-401";
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};
const SPECIES = [
  "duck", "goose", "blob", "cat", "dragon", "octopus", "owl", "penguin",
  "turtle", "snail", "ghost", "axolotl", "capybara", "cactus", "robot",
  "rabbit", "mushroom", "chonk"
];
const SPECIES_ZH = [
  "鸭子", "鹅", "果冻", "猫", "龙", "章鱼", "猫头鹰", "企鹅",
  "乌龟", "蜗牛", "幽灵", "美西螈", "水豚/卡皮巴拉", "仙人掌", "机器人",
  "兔子", "蘑菇", "胖墩"
];
const SPECIES_EMOJI = [
  "🦆", "🪿", "🫧", "🐱", "🐉", "🐙", "🦉", "🐧",
  "🐢", "🐌", "👻", "🦎", "🦫", "🌵", "🤖",
  "🐰", "🍄", "🐱"
];
const RARITY_EMOJI = {
  common: "⚪", uncommon: "🟢", rare: "🔵", epic: "🟣", legendary: "🟡"
};
const RARITY_ZH = {
  common: "普通", uncommon: "稀有", rare: "罕见", epic: "史诗", legendary: "传说"
};
const EYES = ["·", "✦", "×", "◉", "@", "°"];

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return "common";
}

function simulateRoll(userID) {
  const key = userID + SALT;
  const rng = mulberry32(hashString(key));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const shiny = rng() < 0.01;
  return { userID, rarity, species, eye, shiny };
}

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

function writeConfig(userID) {
  const config = readConfig();
  delete config.companion;
  delete config.companionMuted;
  config.userID = userID.toLowerCase();
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
  console.log(`\n✅ 配置已更新: ${getConfigPath()}`);
}

// ============ 交互式界面 ============
function centerLine(text, width) {
  const pad = Math.max(0, width - [...text].reduce((n, c) => n + (c.charCodeAt(0) > 127 ? 2 : 1), 0));
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}

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

function printSpecies() {
  console.log("\n🐾 可用物种:");
  SPECIES.forEach((sp, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${SPECIES_EMOJI[i]} ${sp.charAt(0).toUpperCase() + sp.slice(1)} (${SPECIES_ZH[i]})`);
  });
  console.log("");
}

function printRarity() {
  console.log("📊 稀有度等级:");
  RARITIES.forEach((r, i) => {
    console.log(`  ${i + 1}. ${RARITY_EMOJI[r]} ${r.padEnd(10)} (${RARITY_ZH[r]}) - ${RARITY_WEIGHTS[r]}%`);
  });
  console.log("");
}

// ============ 主程序 ============
async function main() {
  const W = 44;
  const title = `🎮 松鼠的AI助手 | Claude Buddy Reroll`;
  console.log("\n" + "=".repeat(W));
  console.log(centerLine(title, W));
  console.log(centerLine(` v${VERSION} `, W));
  console.log("=".repeat(W) + "\n");

  // 选择物种
  printSpecies();
  let speciesInput = await ask("请选择物种编号 (1-18，直接回车随机): ");
  speciesInput = speciesInput.trim();
  let targetSpecies = undefined;
  if (speciesInput !== "") {
    const idx = parseInt(speciesInput) - 1;
    if (idx >= 0 && idx < SPECIES.length) {
      targetSpecies = SPECIES[idx];
    }
  }

  // 选择稀有度
  printRarity();
  let rarityInput = await ask("请选择目标稀有度 (1-5，默认 5 传说): ");
  rarityInput = rarityInput.trim() || "5";
  const rarityMap = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
  const targetRarityIdx = rarityMap[rarityInput] ?? 4;
  const targetRarity = RARITIES[targetRarityIdx];

  // 是否需要闪光
  let shinyInput = await ask("是否需要闪光? (y/n，默认 y): ");
  const needShiny = shinyInput.trim().toLowerCase() !== 'n';

  // 显示目标
  console.log("\n🎯 开始刷宠物...");
  console.log(`   物种: ${targetSpecies || '随机'}`);
  console.log(`   稀有度: ${RARITY_ZH[targetRarity]} (${targetRarity}) 或更高`);
  console.log(`   闪光: ${needShiny ? '是 ✨' : '否'}`);
  console.log("\n开始抽卡...\n");

  const startTime = Date.now();
  const stats = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  const shinyStats = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  let attempts = 0;
  let lastDisplayTime = 0;
  const matches = [];
  let MAX_TOP = 10;
  let continueCount = 0;
  const DISPLAY_INTERVAL = 10000; // 每 1 万次刷新一次显示

  // 优先级：legendary > epic > rare > uncommon > common，闪光优先
  function getPriority(roll) {
    let p = RARITIES.indexOf(roll.rarity); // 0-4，越高质量越高
    if (!roll.shiny) p -= 10; // 非闪光降权
    return p;
  }

  function makeBar(count, total, width) {
    const pct = total > 0 ? count / total : 0;
    const filled = Math.round(pct * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  }

  function formatStats() {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const speed = attempts > 0 ? Math.floor(attempts / ((Date.now() - startTime) / 1000)) : 0;
    const totalShiny = shinyStats.common + shinyStats.uncommon + shinyStats.rare + shinyStats.epic + shinyStats.legendary;
    const BAR_WIDTH = 20;
    const pct = (c, t) => t > 0 ? (c / t * 100).toFixed(3) : "0.000";
    const done = matches.length >= MAX_TOP;

    const lines = [
      `  🔄 尝试 ${attempts.toLocaleString()} 次 | ${elapsed}s | ${speed}/s`,
      `  ┌────────────────────────────────────────────────────`,
      `  ⚪ 普通    ${makeBar(stats.common, attempts, BAR_WIDTH)} ${pct(stats.common, attempts).padStart(6)}%  ${stats.common.toLocaleString().padStart(8)}`,
      `  🟢 稀有    ${makeBar(stats.uncommon, attempts, BAR_WIDTH)} ${pct(stats.uncommon, attempts).padStart(6)}%  ${stats.uncommon.toLocaleString().padStart(8)}`,
      `  🔵 罕见    ${makeBar(stats.rare, attempts, BAR_WIDTH)} ${pct(stats.rare, attempts).padStart(6)}%  ${stats.rare.toLocaleString().padStart(8)}`,
      `  🟣 史诗    ${makeBar(stats.epic, attempts, BAR_WIDTH)} ${pct(stats.epic, attempts).padStart(6)}%  ${stats.epic.toLocaleString().padStart(8)}`,
      `  🟡 传说    ${makeBar(stats.legendary, attempts, BAR_WIDTH)} ${pct(stats.legendary, attempts).padStart(6)}%  ${stats.legendary.toLocaleString().padStart(8)}`,
      `  ✨ 闪光    ${makeBar(totalShiny, attempts, BAR_WIDTH)} ${pct(totalShiny, attempts).padStart(6)}%  ${totalShiny.toLocaleString().padStart(8)}`,
      `  └────────────────────────────────────────────────────`,
      `  🎯 候选: ${matches.length}/${MAX_TOP}${done ? " ✅ 已完成！" : " (继续寻找更好的...)"}`,
    ];
    return lines;
  }

  function displayStats() {
    const lines = formatStats();
    process.stdout.write(`\x1b[${lines.length}A`);
    lines.forEach((line, i) => {
      process.stdout.write(`\x1b[2K` + line + (i < lines.length - 1 ? "\n" : ""));
    });
    process.stdout.write("\x1b[" + lines.length + "B");
  }

  function displayStatsRestore() {
    // 清除已显示的统计区域（11行 + 1空行）
    const lines = formatStats();
    process.stdout.write(`\x1b[${lines.length + 1}A`);
    for (let i = 0; i < lines.length + 1; i++) {
      process.stdout.write(`\x1b[2K\x1b[0G`);
      if (i < lines.length) process.stdout.write("\n");
    }
    process.stdout.write("\x1b[A");
  }

  // 初始显示
  console.log("");
  const initLines = formatStats();
  initLines.forEach(line => console.log(line));
  console.log("");

  // 统一循环：抽卡 + 选择
  while (true) {
    // 抽卡循环
    while (attempts < 99999999 && matches.length < MAX_TOP) {
      attempts++;
      const userID = randomBytes(32).toString("hex");
      const roll = simulateRoll(userID);
      stats[roll.rarity]++;
      if (roll.shiny) shinyStats[roll.rarity]++;

      const rarityMatch = RARITIES.indexOf(roll.rarity) >= targetRarityIdx;
      const shinyMatch = !needShiny || roll.shiny;
      const speciesMatch = !targetSpecies || roll.species === targetSpecies;

      if (rarityMatch && shinyMatch && speciesMatch) {
        const p = getPriority(roll);
        let insertIdx = matches.findIndex(m => getPriority(m) < p);
        if (insertIdx === -1) insertIdx = matches.length;
        matches.splice(insertIdx, 0, roll);
      }

      if (attempts % DISPLAY_INTERVAL === 0) {
        displayStats();
      }
    }

    // 抽卡循环结束后，仍无匹配则退出
    if (matches.length === 0) {
      console.log("\n❌ 未能在限定次数内找到符合条件的宠物");
      break;
    }

    // 选择循环
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n\n========================================");
    console.log("       🎉 找到多个候选宠物！");
    console.log("========================================\n");
    console.log(`🔢 找到 ${matches.length} 个符合条件的宠物（按质量排序）:`);
    console.log("");

    matches.forEach((m, i) => {
      const spIdx = SPECIES.indexOf(m.species);
      console.log(`  ${String(i + 1).padStart(2)}. ${RARITY_EMOJI[m.rarity]} ${RARITY_ZH[m.rarity].padEnd(4)} | ${SPECIES_EMOJI[spIdx]} ${m.species.padEnd(10)} | ${m.eye} 眼睛${m.shiny ? " ✨" : ""}`);
    });

    console.log("");
    console.log(`📊 总尝试次数: ${attempts.toLocaleString()} | 用时 ${elapsed}s`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    let selectInput = await ask(`请选择序号 (1-${matches.length})，输入 0 退出${continueCount < 9 ? `，直接回车继续抽卡 (再多 10 个，剩余 ${9 - continueCount} 次)` : ""}: `);
    selectInput = selectInput.trim();

    // 空字符串 -> 继续抽卡
    if (selectInput === "") {
      if (continueCount >= 9) {
        console.log("\n⚠️ 已达最大继续次数（9次），无法继续扩展。");
        continue;
      }
      continueCount++;
      MAX_TOP += 10;
      console.log(`\n🔄 继续抽卡，目标候选扩展至 ${MAX_TOP} 个...\n`);
      displayStatsRestore();
      continue; // 回到抽卡循环
    }

    const selectIdx = parseInt(selectInput) - 1;

    if (selectIdx >= 0 && selectIdx < matches.length) {
      const selected = matches[selectIdx];
      console.log("\n✅ 已选择:");
      console.log(`   ${RARITY_EMOJI[selected.rarity]} ${RARITY_ZH[selected.rarity].padEnd(4)} | ${selected.species.padEnd(10)} | ${selected.eye} 眼睛${selected.shiny ? " ✨ 闪光" : ""}`);

      writeConfig(selected.userID);
      console.log("📝 userID:", selected.userID);
      console.log("\n💡 请重启 Claude Code，然后输入 /buddy 查看你的新宠物！");
      break;
    } else {
      console.log("\n已取消操作，未修改配置。");
      break;
    }
  }

  // 防止窗口关闭，等待用户确认
  await ask("\n按回车键退出...");
}

main();
