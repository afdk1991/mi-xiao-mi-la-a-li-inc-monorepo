/**
 * 本地 Ollama 调用封装 (纯离线, 无 API Key) — Node 18+
 *
 * 用法:
 *   node ollama_chat.js "写一个快速排序"          # 单次提问
 *   node ollama_chat.js                            # 交互式对话
 *   node ollama_chat.js --model qwen2.5-coder:7b "优化这段 SQL"
 *   node ollama_chat.js --list                     # 列出已安装模型
 */

const BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "deepseek-coder-v2:16b-16k";

/** 调用 Ollama OpenAI 兼容接口 (流式输出) */
async function chat(messages, model = DEFAULT_MODEL) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });
  } catch (e) {
    console.error("\n[X] 连不上 Ollama。请先启动服务:");
    console.error("    Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden");
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`[X] 请求失败: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  let full = "";
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return full;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          process.stdout.write(delta);
          full += delta;
        }
      } catch {
        /* 忽略不完整 JSON */
      }
    }
  }
  console.log();
  return full;
}

/** 列出本地已安装模型 */
async function listModels() {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`);
    const data = await res.json();
    for (const m of data.models || []) {
      console.log(`  ${m.name.padEnd(40)} ${(m.size / 1e9).toFixed(1)} GB`);
    }
  } catch (e) {
    console.error(`[X] 获取模型列表失败: ${e.message}`);
  }
}

/** 主流程 */
async function main() {
  const args = process.argv.slice(2);
  let model = DEFAULT_MODEL;

  if (args.includes("--model")) {
    const i = args.indexOf("--model");
    model = args[i + 1];
    args.splice(i, 2);
  }

  if (args.includes("--list")) {
    await listModels();
    return;
  }

  // 单次提问
  if (args.length > 0) {
    const question = args.join(" ");
    await chat([{ role: "user", content: question }], model);
    return;
  }

  // 交互式
  const readline = await import("node:readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const messages = [];

  console.log(`[本地模型] ${model}  (输入 /bye 退出, /clear 清空, /model <名> 切换)`);

  const ask = () =>
    rl.question("\n你: ", async (input) => {
      const user = input.trim();
      if (!user) return ask();
      if (user === "/bye") {
        rl.close();
        return;
      }
      if (user === "/clear") {
        messages.length = 0;
        console.log("[已清空上下文]");
        return ask();
      }
      if (user.startsWith("/model ")) {
        model = user.split(" ")[1];
        console.log(`[切换到] ${model}`);
        return ask();
      }

      messages.push({ role: "user", content: user });
      process.stdout.write("AI: ");
      const reply = await chat(messages, model);
      messages.push({ role: "assistant", content: reply });
      ask();
    });

  ask();
}

main();
