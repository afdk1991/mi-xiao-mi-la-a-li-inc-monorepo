# -*- coding: utf-8 -*-
"""
本地 Ollama 调用封装 (纯离线, 无 API Key)

用法:
  python ollama_chat.py                              # 交互式对话
  python ollama_chat.py --ask "写一个快速排序"
  python ollama_chat.py --model deepseek-coder-v2:16b-16k --ask "重构这个函数"
  python ollama_chat.py --file src/main.py --ask "找出 bug 并修复"
"""
import argparse
import sys

try:
    import requests
except ImportError:
    print("请先安装依赖: pip install requests")
    sys.exit(1)

BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "deepseek-coder-v2:16b-16k"


def chat(messages, model=DEFAULT_MODEL, base_url=BASE_URL, stream=True):
    """发送消息, 返回完整回复"""
    url = f"{base_url}/v1/chat/completions"
    payload = {"model": model, "messages": messages, "stream": stream}

    try:
        if stream:
            full = ""
            with requests.post(url, json=payload, stream=True, timeout=600) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if not line:
                        continue
                    text = line.decode("utf-8")
                    if text.startswith("data: "):
                        data = text[6:]
                        if data.strip() == "[DONE]":
                            break
                        import json
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                print(delta, end="", flush=True)
                                full += delta
                        except Exception:
                            pass
            print()
            return full

        r = requests.post(url, json=payload, timeout=600)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except requests.exceptions.ConnectionError:
        print("\n[X] 连不上 Ollama。请先启动服务:")
        print("    Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden")
        sys.exit(1)


def list_models(base_url=BASE_URL):
    """列出本地已安装模型"""
    try:
        r = requests.get(f"{base_url}/api/tags", timeout=10)
        r.raise_for_status()
        for m in r.json().get("models", []):
            print(f"  {m['name']:<40} {m['size']/1e9:.1f} GB")
    except Exception as e:
        print(f"[X] 获取模型列表失败: {e}")


def main():
    ap = argparse.ArgumentParser(description="调用本地 Ollama 模型")
    ap.add_argument("--model", "-m", default=DEFAULT_MODEL, help="模型名")
    ap.add_argument("--ask", "-a", help="单次提问内容")
    ap.add_argument("--file", "-f", help="把文件内容作为上下文一起发送")
    ap.add_argument("--url", default=BASE_URL, help="Ollama 地址")
    ap.add_argument("--list", "-l", action="store_true", help="列出已安装模型")
    ap.add_argument("--no-stream", action="store_true", help="关闭流式输出")
    args = ap.parse_args()

    if args.list:
        list_models(args.url)
        return

    messages = []
    question = args.ask

    if args.file:
        try:
            with open(args.file, encoding="utf-8") as f:
                code = f.read()
        except OSError as e:
            print(f"[X] 读取文件失败: {e}")
            sys.exit(1)
        if not question:
            question = "请分析以下代码"
        question = f"{question}\n\n以下是文件内容 ({args.file}):\n```\n{code}\n```"

    if question:
        messages.append({"role": "user", "content": question})
        chat(messages, args.model, args.url, stream=not args.no_stream)
        return

    # 交互式
    print(f"[本地模型] {args.model}  (输入 /bye 退出, /clear 清空, /model <名> 切换)")
    while True:
        try:
            user = input("\n你: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n已退出")
            break
        if not user:
            continue
        if user == "/bye":
            break
        if user == "/clear":
            messages.clear()
            print("[已清空上下文]")
            continue
        if user.startswith("/model "):
            args.model = user.split(" ", 1)[1].strip()
            print(f"[切换到] {args.model}")
            continue

        messages.append({"role": "user", "content": user})
        print("AI: ", end="")
        reply = chat(messages, args.model, args.url, stream=not args.no_stream)
        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    main()
