# AI Agent 与 Skills 学习笔记

> 学习日期：2026年7月11日  
> 整理人：AI Assistant  
> 参考来源：CSDN、阿里云开发者社区、掘金、腾讯云开发者社区、Microsoft Docs、LangChain Docs

---

## 目录

1. [概念定义](#一概念定义)
   - 1.1 AI Agent 核心概念
   - 1.2 Agent Skills 核心概念
   - 1.3 MCP (Model Context Protocol) 概念
   - 1.4 Agent vs 大模型核心差异

2. [技术原理](#二技术原理)
   - 2.1 Agent 架构设计
   - 2.2 Agent Loop 工作流程
   - 2.3 技能体系分类
   - 2.4 渐进式披露机制
   - 2.5 MCP 协议架构

3. [代码实现](#三代码实现)
   - 3.1 LangChain Agent 开发
   - 3.2 MCP Server 搭建
   - 3.3 Agent Skills 创建
   - 3.4 工具定义与调用

4. [应用场景](#四应用场景)
   - 4.1 行业落地案例
   - 4.2 多Agent协作模式
   - 4.3 典型使用场景

5. [最佳实践](#五最佳实践)
   - 5.1 安全规范
   - 5.2 性能优化
   - 5.3 开发规范

6. [学习心得](#六学习心得)

---

## 一、概念定义

### 1.1 AI Agent 核心概念

**官方定义**：AI Agent（人工智能代理）是一种基于大模型的智能系统，能够感知环境、自主规划行动、调用工具完成目标，并能从经验中持续学习进化。

**核心属性**（BDI模型延伸）：

| 属性 | 说明 | 示例 |
|------|------|------|
| 自主性 | 不需要人类给出每一步指令，只需要明确最终目标就能自主规划执行路径 | 自动分析需求并生成代码 |
| 反应性 | 能够感知环境和外部反馈，动态调整行动策略，应对突发变化 | 监控服务器异常并自动修复 |
| 社会性 | 能够和人类、其他AI Agent进行多轮交互、协作完成复杂任务 | 多Agent协同完成软件开发 |
| 进化性 | 能够从历史执行经验中学习，不断优化自身的推理和执行能力 | 根据用户反馈优化回答质量 |

**起源与演变**：
- 古希腊哲学："行动者"概念
- 1950年：图灵测试
- 1956年：达特茅斯会议，首次提出"人工智能"
- 60年代：马文·明斯基提出"心灵社会"理论
- 2023年：GPT-4发布，Agent进入实用化阶段
- 2024年：谷歌提出"Agentic Era（代理时代）"

### 1.2 Agent Skills 核心概念

**官方定义**：Agent Skills 是智能体为完成特定任务而具备的能力集合，是算法模型、场景数据与业务需求的深度融合体。它将领域知识打包成可发现、模块化的能力单元。

**技能本质**：给AI Agent的"入职指南"，让AI按你的方式工作。

**四次进化类比**：

| 进化阶段 | 类比 | 解决的问题 |
|----------|------|------------|
| Chat | 一个能说会道的人 | AI能理解自然语言 |
| Tool Use | 给他一套工具 | AI能执行操作 |
| MCP | 工具有了统一标准 | AI能连接任何服务 |
| Skills | 给他一本工作手册 | AI能按你的方式工作 |

**技能结构**：
- `SKILL.md`：核心说明文件（YAML前置元数据 + Markdown指令体）
- `scripts/`：可执行脚本（Python/Bash/Node.js）
- `references/`：参考资料（API规范、错误代码表）
- `assets/`：素材资源（Excel报表模版、PPT母版）

### 1.3 MCP (Model Context Protocol) 概念

**官方定义**：MCP是AI应用与外部世界交互的"USB-C接口"，是一种标准化通信协议，基于JSON-RPC 2.0，让AI工具可以用统一的方式连接外部服务。

**核心价值**：解决了AI应用开发的"巴别塔困境"——在MCP出现之前，每个AI应用都必须自己实现一套工具调用系统，互不兼容。

**MCP vs Skills 对比**：

| 维度 | Agent Skills | MCP |
|------|--------------|-----|
| 架构 | 文件文件夹（SKILL.md） | 客户端-主机-服务器（JSON-RPC 2.0） |
| 集成难度 | 低（放入目录即可） | 中等（需要SDK） |
| 状态管理 | 无状态（文件读取） | 有状态（连接生命周期） |
| 最佳用途 | 知识打包、工作流 | 外部系统集成 |
| 安全模型 | 沙箱执行、白名单 | OAuth 2.1、传输安全 |

### 1.4 Agent vs 大模型核心差异

| 对比维度 | 通用大模型 | AI Agent |
|----------|------------|----------|
| 核心能力 | 自然语言理解、内容生成、常识推理 | 大模型能力+感知+规划+工具调用+记忆 |
| 任务适配 | 单轮、短链路、信息查询类任务 | 多轮、长链路、复杂决策类任务 |
| 自主性 | 被动响应，需要人类给出每一步指令 | 主动执行，只需最终目标 |
| 信息时效性 | 知识截止到训练时间 | 可通过工具调用获取实时信息 |
| 交互模式 | 人-模型 单轮/多轮对话 | 人-Agent-环境/工具/其他Agent 多模态交互 |
| 长链路任务完成率 | 平均<30% | 优化后可达75%以上 |

---

## 二、技术原理

### 2.1 Agent 架构设计

一个完整的AI Agent架构包含五大核心模块：

```
┌─────────────────────────────────────────────────────────┐
│                    Agent System                         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 感知层   │───▶│ 决策层   │───▶│ 执行层   │───▶│ 反馈层   │   │
│ │Perceive │   │ Decide   │   │   Act    │   │ Feedback │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│       │                              ▲                  │
│       └──────────┬───────────────────┘                  │
│                  │                                      │
│           ┌──────────┐                                  │
│           │ 记忆层   │                                  │
│           │ Memory   │                                  │
│           └──────────┘                                  │
├─────────────────────────────────────────────────────────┤
│ 核心组件：                                               │
│ • LLM (大脑) - GPT-4 / Claude / 开源模型                │
│ • Memory (记忆) - 短期/长期记忆存储                      │
│ • Tools (工具) - API、函数、外部服务                     │
│ • Planning (规划) - 任务分解与执行策略                   │
│ • Reflection (反思) - 结果校验与自我修正                 │
└─────────────────────────────────────────────────────────┘
```

#### 各模块详解：

**感知层（Perception）**：
- 接收用户输入、环境信息、系统状态、约束条件
- 通过大模型进行意图识别、实体抽取、关键信息提取
- 多模态输入处理：文本（BERT）、图像（CLIP）、语音（Whisper）

**决策层（Planning）**：
- 将复杂目标拆解为多个有序子任务
- 确定执行顺序、依赖关系、执行条件
- 常见规划方式：链式思考（CoT）、推理行动（ReAct）、计划执行（Plan-and-Solve）

**记忆层（Memory）**：

| 记忆类型 | 存储内容 | 技术实现 |
|----------|----------|----------|
| 短期记忆 | 当前对话上下文 | Transformer注意力机制 |
| 工作记忆 | 当前步骤的执行状态、中间结果 | 会话级存储 |
| 长期记忆 | 历史任务、用户偏好、行业知识 | 向量数据库（Chroma/Milvus） |
| 外部记忆 | 实时网页信息 | RAG检索增强技术 |

**执行层（Action）**：
- 工具调用三范式：内置工具（计算器/代码解释器）、插件扩展（API接入）、RPA机器人（模拟操作）
- 通过函数调用（Function Calling）连接外部世界

**反馈层（Feedback）**：
- 结果校验：验证数据一致性、判断输出是否合理
- 反思机制：识别错误、矛盾，进行修正、回退或重新规划
- 学习优化：存储执行路径，优化下次执行效率

### 2.2 Agent Loop 工作流程

**标准执行流程**（六阶段演进模型）：

```
用户目标输入 → 意图解析与目标确认 → 规划路径 → 工具执行 → 结果评估 → 学习优化 → 循环/结束
```

**ReAct 框架循环**（推理+行动）：

1. **Thought（思考）**：分析当前状态，决定下一步该做什么
2. **Action（行动）**：选择一个Tool并传入参数执行
3. **Observation（观察）**：获取Tool返回的结果
4. **Loop（循环）**：带着新的观察结果回到Thought，直到得出最终答案

**ReAct 执行轨迹示例**：

```
Question: 张三上周买的 iPhone 15 发货了吗？

Thought: 用户想知道订单发货状态。我需要先查询订单信息。
Action: query_order(user_name="张三", product="iPhone 15")
Observation: {"order_id": "ORD-2024-0612-001", "status": "shipped", 
 "carrier": "顺丰", "tracking_no": "SF1234567890"}

Thought: 订单已发货，快递单号是 SF1234567890。我可以再查一下物流详情。
Action: query_logistics(tracking_no="SF1234567890")
Observation: {"current_status": "运输中", "location": "深圳转运中心", 
 "estimated_delivery": "2024-06-14"}

Thought: 我已经获得了足够的信息来回答用户。
Final Answer: 张三，您的 iPhone 15（订单号 ORD-2024-0612-001）已于昨日发货，
当前由顺丰承运，最新状态为"运输中"，目前在深圳转运中心，预计 6 月 14 日送达。
```

### 2.3 技能体系分类

**基础交互技能**（Agent的"沟通桥梁"）：
- 自然语言理解与生成
- 意图识别与实体抽取
- 多模态交互（文本、图像、语音）
- 对话管理与上下文维护

**决策规划技能**（Agent的"思考中枢"）：
- 任务拆解与子任务规划
- 优先级排序与资源分配
- 链式思考（CoT）与推理
- 不确定性处理与风险评估

**执行操作技能**（Agent的"行动手脚"）：
- 工具调用与API集成
- 代码执行与调试
- 文件操作与数据处理
- RPA自动化与流程编排

**学习进化技能**（Agent的"成长引擎"）：
- 反馈收集与结果评估
- 经验总结与知识沉淀
- 模型微调与策略优化
- 自适应学习与持续进化

### 2.4 渐进式披露机制

**核心思想**：Agent仅在需要时加载特定的技能上下文，而非一次性加载所有信息。

**三层架构**：

```
Level 1: Metadata（元数据）
  └── 技能名称、描述、关键字
      └── Level 2: Core Content（核心内容）
          └── 详细指令、规则、逻辑
              └── Level 3: Detailed Resources（详细资源）
                  └── 参考文档、脚本、资产文件
```

**优势**：
- 减少上下文使用：只加载2-3个需要的技能，而非全部
- 支持团队自治：不同团队可以独立开发专业技能
- 高效扩展：添加数十或数百个技能而不压垮上下文
- 简化对话历史：避免技能内容重复出现在历史记录中

### 2.5 MCP 协议架构

**核心组件**：
- **MCP Server**：提供工具能力的服务端
- **MCP Client**：调用工具的客户端（AI应用）
- **MCP Host**：管理客户端与服务器连接的中间层

**通信协议**：
- 基于JSON-RPC 2.0
- 支持HTTP和SSE（Server-Sent Events）传输
- 请求消息：method、params、id
- 响应消息：result、error、id
- 通知消息：无响应的异步消息

**连接生命周期**：
1. 客户端发现并连接到服务器
2. 服务器返回可用工具列表
3. 客户端选择工具并调用
4. 服务器执行并返回结果
5. 连接保持或关闭

---

## 三、代码实现

### 3.1 LangChain Agent 开发

#### 环境准备

```bash
# Python 3.11+
pip install langchain==1.0.8
pip install langchain-core==1.0.7
pip install langchain-community==0.4.1
pip install langchain-openai==1.0.2
pip install langchain-ollama==1.0.0
pip install python-dotenv
```

#### 模型初始化

```python
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.rate_limiters import InMemoryRateLimiter

load_dotenv(override=True)

rate_limiter = InMemoryRateLimiter(
    requests_per_second=5,
    check_every_n_seconds=1.0
)

def load_chat_model(model: str, provider: str, temperature: float = 0.7):
    return init_chat_model(
        model=model,
        model_provider=provider,
        temperature=temperature,
        rate_limiter=rate_limiter
    )

llm = load_chat_model("gpt-4o-mini", "openai", temperature=0.3)
```

#### 工具定义

```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """
    获取指定城市的天气信息
    
    Args:
        city: 城市名称，如"北京"、"上海"
    
    Returns:
        该城市的天气描述
    """
    weather_data = {
        "北京": "晴朗，气温25°C",
        "上海": "多云，气温28°C",
        "广州": "小雨，气温30°C",
        "深圳": "阴天，气温27°C",
        "杭州": "晴转多云，气温26°C"
    }
    return weather_data.get(city, f"未找到{city}的天气信息")

@tool
def calculate(expression: str) -> str:
    """
    计算数学表达式
    
    Args:
        expression: 数学表达式，如"2 + 3 * 4"
    
    Returns:
        计算结果
    """
    try:
        result = eval(expression)
        return f"计算结果: {result}"
    except Exception as e:
        return f"计算错误: {str(e)}"

tools = [get_weather, calculate]
```

#### 创建 Agent

```python
from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个智能助手，可以调用工具完成任务。"),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}")
])

agent = create_agent(llm, tools, prompt)

# 执行任务
result = agent.invoke({"input": "北京今天天气怎么样？"})
print(result["output"])
```

### 3.2 MCP Server 搭建

#### 使用 FastMCP（Python）

```bash
pip install fastmcp
```

```python
from fastmcp import FastMCP
from pydantic import BaseModel, Field

app = FastMCP()

class WeatherInput(BaseModel):
    city: str = Field(description="城市名称")
    days: int = Field(default=3, description="预报天数（1-7天）")

@app.tool(
    name="get_weather_forecast",
    description="查询指定城市未来7天的天气预报",
    input_model=WeatherInput
)
async def get_weather_forecast(city: str, days: int = 3) -> str:
    mock_data = {
        "北京": ["晴 25°C", "多云 26°C", "小雨 23°C"],
        "上海": ["多云 28°C", "阴 27°C", "晴 29°C"]
    }
    forecast = mock_data.get(city, ["未知"])
    return "\n".join(forecast[:days])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

#### 使用 TypeScript

```bash
npm install @mcp/server @mcp/sdk
```

```typescript
import { createServer } from '@mcp/server';
import { z } from 'zod';

const server = createServer({
    name: 'weather-mcp-server',
    description: '天气预报服务',
});

server.tool(
    'get_weather_forecast',
    '查询指定城市未来7天的天气预报',
    {
        city: z.string().describe('城市名称'),
        days: z.number().min(1).max(7).default(3).describe('预报天数'),
    },
    async ({ city, days }) => {
        const mockData: Record<string, string[]> = {
            '北京': ['晴 25°C', '多云 26°C', '小雨 23°C'],
            '上海': ['多云 28°C', '阴 27°C', '晴 29°C'],
        };
        const forecast = mockData[city] || ['未知'];
        return forecast.slice(0, days).join('\n');
    }
);

server.listen(8000);
```

### 3.3 Agent Skills 创建

#### SKILL.md 格式

```markdown
---
name: expense-report
description: 按公司政策提交和验证员工费用报告。当用户询问费用提交、报销规则或支出限额时使用。
license: Apache-2.0
compatibility: Requires python3
metadata:
  author: finance-team
  version: "2.1"
allowed-tools: ["read-file", "python-script-runner", "send-email"]
---

# 费用报告处理指南

## 处理流程

1. **接收费用报告**：确认报告包含所有必填字段
2. **验证金额**：检查是否符合报销限额
3. **分类费用**：按照类别（差旅、餐饮、办公）分类
4. **生成审批请求**：创建标准化审批表单
5. **发送通知**：通知申请人审批结果

## 报销限额

| 类别 | 每日限额 | 说明 |
|------|----------|------|
| 差旅 | ¥500 | 包含交通和住宿 |
| 餐饮 | ¥150 | 午餐和晚餐合计 |
| 办公 | ¥5000 | 单次采购限额 |

## 验证规则

- 所有费用必须提供发票
- 差旅费用必须有行程单
- 超过限额需要主管审批
- 费用必须在发生后30天内提交

## 执行脚本

使用 `scripts/validate_expense.py` 进行自动验证：

```
python scripts/validate_expense.py <report_path>
```
```

#### 技能目录结构

```
expense-report/
├── SKILL.md                     # 核心说明文件
├── scripts/
│   └── validate_expense.py      # 费用验证脚本
├── references/
│   ├── POLICY_FAQ.md            # 政策常见问题
│   └── ERROR_CODES.md           # 错误代码表
└── assets/
    └── expense-report-template.md  # 报告模板
```

#### validate_expense.py 示例

```python
import json
import sys
from datetime import datetime, timedelta

def validate_expense(report_path: str) -> str:
    with open(report_path, 'r') as f:
        report = json.load(f)
    
    errors = []
    
    # 检查必填字段
    required_fields = ['employee_id', 'date', 'amount', 'category', 'receipt']
    for field in required_fields:
        if field not in report:
            errors.append(f"缺少必填字段: {field}")
    
    # 检查费用日期（30天内）
    expense_date = datetime.strptime(report['date'], '%Y-%m-%d')
    if datetime.now() - expense_date > timedelta(days=30):
        errors.append("费用必须在30天内提交")
    
    # 检查金额限额
    limits = {'travel': 500, 'meals': 150, 'office': 5000}
    if report['category'] in limits and report['amount'] > limits[report['category']]:
        errors.append(f"{report['category']}类别超过限额¥{limits[report['category']]}")
    
    if errors:
        return "验证失败:\n" + "\n".join(f"- {e}" for e in errors)
    return "验证通过"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python validate_expense.py <report_path>")
        sys.exit(1)
    print(validate_expense(sys.argv[1]))
```

### 3.4 工具定义与调用

#### LangChain 工具定义（StructuredTool）

```python
from langchain.tools import StructuredTool
from pydantic import BaseModel, Field
from typing import Optional

class OrderQueryInput(BaseModel):
    user_name: str = Field(description="用户姓名")
    product: Optional[str] = Field(default=None, description="商品名称（可选）")

def query_order(user_name: str, product: Optional[str] = None) -> str:
    """查询用户订单信息"""
    mock_db = {
        "张三": [
            {"order_id": "ORD-2024-0612-001", "product": "iPhone 15",
             "status": "shipped", "carrier": "顺丰", "tracking_no": "SF1234567890"}
        ]
    }
    orders = mock_db.get(user_name, [])
    if product:
        orders = [o for o in orders if product in o["product"]]
    
    if not orders:
        return f"未找到 {user_name} 的订单记录"
    
    result = []
    for o in orders:
        result.append(f"订单号: {o['order_id']}, 商品: {o['product']}, "
                      f"状态: {o['status']}, 快递: {o['carrier']} {o['tracking_no']}")
    return "\n".join(result)

order_tool = StructuredTool.from_function(
    func=query_order,
    name="query_order",
    description="查询用户的订单信息。传入 user_name（必填）和 product（可选）",
    args_schema=OrderQueryInput,
)
```

#### TypeScript 工具定义

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const calculatorTool = tool(
    async ({ a, b, operation }) => {
        let result: number;
        switch (operation) {
            case 'add': result = a + b; break;
            case 'subtract': result = a - b; break;
            case 'multiply': result = a * b; break;
            case 'divide': result = b !== 0 ? a / b : 0; break;
            default: return '未知操作';
        }
        return `结果: ${result}`;
    },
    {
        name: 'calculator',
        description: '执行数学运算',
        schema: z.object({
            a: z.number().describe('第一个数字'),
            b: z.number().describe('第二个数字'),
            operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('运算类型'),
        }),
    }
);
```

---

## 四、应用场景

### 4.1 行业落地案例

#### 金融服务：风控与客服双场景赋能
- **风控Agent**：实时监控交易异常、自动触发风控规则、生成风险报告
- **客服Agent**：自动查询账户信息、处理常见问题、升级复杂问题给人工

#### 工业运维：预测性维护提升效率
- 监控设备状态、预测故障风险、自动生成维护工单、优化备件库存

#### 智能办公：自动化流程解放人力
- 自动整理会议纪要、生成周报月报、安排日程、管理邮件

#### 科研辅助：文献挖掘加速创新
- 自动检索学术论文、总结研究成果、发现研究趋势、生成研究报告

#### 医疗诊断：辅助诊疗决策
- 分析患者症状、检索相似病例、调用医学知识库、生成鉴别诊断报告
- 案例：上海中医药大学"仲景数字人"诊断准确率达92%，缩短医生60%决策时间

### 4.2 多Agent协作模式

**协作架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                    任务分配中心                              │
│                     Task Dispatcher                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  研发Agent  │  │  测试Agent  │  │  运维Agent  │         │
│  │  Developer  │  │   Tester    │  │  DevOps     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                  │
│                ┌─────────────────┐                          │
│                │   协作知识库    │                          │
│                │  Shared Memory  │                          │
│                └─────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

**协作模式类型**：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 分工协作 | 不同Agent负责不同任务 | 软件开发（研发、测试、运维） |
| 层级协作 | 高层Agent规划，低层Agent执行 | 复杂业务流程 |
| 竞争协作 | 多个Agent竞争完成同一任务 | 方案优选、创意生成 |
| 知识共享 | Agent之间共享知识和经验 | 跨领域问题解决 |

### 4.3 典型使用场景

#### 智能客服
- 理解用户意图、查询订单状态、追踪物流信息、处理退换货请求

#### 数据查询助手
- 自然语言查询数据库、生成SQL语句、执行查询、可视化结果

#### 自动化运维
- 监控系统状态、检测异常、自动修复、生成运维报告

#### 个人效率工具
- 日程管理、邮件处理、文档整理、知识检索

#### 代码助手
- 代码生成、代码审查、调试修复、技术文档编写

---

## 五、最佳实践

### 5.1 安全规范

#### 权限控制
- 使用 `allowed-tools` 限制技能可访问的工具
- 遵循最小权限原则，避免权限滥用
- 敏感操作需要人工确认

#### 输入校验
- 对所有输入进行严格校验
- 防范SQL注入、XSS攻击、CSRF攻击
- 使用类型安全的参数定义（Pydantic/Zod）

#### 数据保护
- 敏感数据传输加密（HTTPS/TLS）
- 数据存储加密（AES-256-GCM）
- 日志脱敏处理，避免泄露敏感信息

#### 安全审计
- 记录所有工具调用日志
- 定期审计Agent行为
- 建立异常检测机制

### 5.2 性能优化

#### 渐进式披露
- 延迟加载技能内容，只在需要时加载
- 通过 `tool_search` 能力动态查找工具
- 可将上下文使用量降低5倍

#### 上下文管理
- 使用滑动窗口管理对话历史
- 定期总结长对话，减少冗余信息
- 利用向量数据库存储长期记忆

#### 缓存策略
- 缓存频繁调用的工具结果
- 实现缓存穿透、击穿、雪崩防护机制
- 设置合理的TTL（Time-To-Live）

#### 并行执行
- 支持多个工具并行调用
- 使用异步编程提升响应速度
- 避免串行等待

### 5.3 开发规范

#### 工具设计原则
- 遵循单一职责原则
- 工具描述清晰、参数明确
- 返回结构化数据

#### 技能开发规范
- 使用标准的SKILL.md格式
- 技能命名统一规范（小写字母、数字、连字符）
- 包含版本信息和作者信息

#### 代码质量
- 关键逻辑添加注释
- 单函数行数≤50行
- 圈复杂度≤10
- 遵循DRY原则

#### 测试规范
- 核心代码测试覆盖率≥80%
- 新增代码重复率≤5%
- 编写单元测试和集成测试

---

## 六、学习心得

### 核心认知

1. **Agent是大模型的进化方向**：单纯的大模型只能"说"，而Agent能"做"。Agent = LLM + 记忆 + 工具 + 规划能力，是从"信息处理器"到"目标达成者"的跃迁。

2. **Skills是Agent的核心竞争力**：如果说MCP给了Agent"手"，那么Skills就是教会Agent"怎么做事"。Skills让AI记住你的工作方式，避免每次重新解释。

3. **渐进式披露是关键优化**：不要一次性加载所有信息，而是按需加载。这不仅节省Token，还能让Agent更快、更准确地找到所需知识。

4. **MCP和Skills互补而非竞争**：MCP适合外部系统集成（实时数据、API调用），Skills适合知识打包（领域专家经验、工作流程）。生产级Agent需要同时使用两者。

### 实践体会

1. **工具定义是关键**：工具的描述质量直接影响Agent的调用准确性。好的工具描述需要包含：做什么、什么时候用、参数含义。

2. **记忆管理很重要**：没有记忆的Agent每次都是"重新开始"。合理的记忆管理能让Agent具备个性化和连续性。

3. **反思机制提升可靠性**：Agent不是完美的，需要反思模块来校验结果、发现错误、自我修正。

4. **多Agent协作是趋势**：复杂任务需要多个Agent分工协作，就像人类团队一样。设计良好的协作模式能大幅提升任务完成质量。

### 未来展望

1. **技能生态化**：从单一技能到标准化技能市场，技能可以像App一样被发现、安装、分享。

2. **垂直场景深耕**：通用技能向专业技能升级，每个行业都将有专属的Agent技能体系。

3. **多Agent技能协同**：构建"数字工作团队"，多个Agent分工协作完成复杂任务。

4. **技能可解释性与安全性**：提升技能的可解释性，让用户明白Agent为什么这么做；加强安全机制，防范恶意使用。

### 学习路径建议

1. **基础阶段**：理解Agent核心概念、学习LangChain框架、掌握工具调用机制
2. **进阶阶段**：深入MCP协议、学习技能开发、实现渐进式披露
3. **实践阶段**：构建完整Agent应用、尝试多Agent协作、优化性能和安全
4. **高级阶段**：探索Agent在垂直领域的落地、研究最新技术趋势、参与开源社区

---

## 七、主流Agent框架对比

### 7.1 框架概览

| 框架 | GitHub Stars | 核心定位 | 最佳场景 |
|------|-------------|----------|----------|
| **LangChain** | 80K+ | LLM应用开发框架 | 快速原型、多工具集成 |
| **LangGraph** | 15K+ | 图结构工作流 | 复杂状态机、企业级工作流 |
| **CrewAI** | 12K+ | 多Agent协作 | 角色分工明确的团队任务 |
| **AutoGen (AG2)** | 25K+ | 生产级Agent系统 | 企业部署、复杂对话流 |
| **AutoGPT** | 160K+ | 自主任务执行 | 实验探索、通用自动化 |
| **MetaGPT** | 60K+ | 结构化团队协作 | 软件开发模拟、流程化任务 |

### 7.2 核心能力对比

#### 性能指标

| 指标 | LangChain | LangGraph | CrewAI | AutoGen | AutoGPT | MetaGPT |
|------|-----------|-----------|--------|---------|---------|---------|
| 吞吐量 | 1000+ TPS | 800+ TPS | 800 TPS | 500 TPS | 300 TPS | 400 TPS |
| 延迟 | 150ms | 100ms | 200ms | 300ms | 400ms | 250ms |
| Token效率 | 一般 | 高 | 中等 | 中等 | 低 | 中等 |

#### 功能特性

| 特性 | LangChain | LangGraph | CrewAI | AutoGen | AutoGPT | MetaGPT |
|------|-----------|-----------|--------|---------|---------|---------|
| 多Agent协作 | ✓✓ | ✓✓ | ✓✓✓ | ✓✓✓ | ✓ | ✓✓ |
| 状态管理 | ✓✓ | ✓✓✓ | ✓✓ | ✓✓ | ✓ | ✓✓ |
| 记忆系统 | ✓✓✓ | ✓✓✓ | ✓✓ | ✓✓ | ✓ | ✓✓ |
| 工具集成 | ✓✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓ |
| 反思机制 | ✓✓ | ✓✓✓ | ✓✓ | ✓✓ | ✓ | ✓ |
| 可视化 | ✓ | ✓✓✓ | ✓ | ✓ | ✗ | ✓ |

#### 企业级能力

| 能力 | LangChain | LangGraph | CrewAI | AutoGen | AutoGPT | MetaGPT |
|------|-----------|-----------|--------|---------|---------|---------|
| 安全性 | ✓✓ | ✓✓✓ | ✓ | ✓✓✓ | ✗ | ✓✓ |
| 可观察性 | ✓✓ | ✓✓✓ | ✓ | ✓✓ | ✗ | ✓ |
| 权限控制 | ✓✓ | ✓✓ | ✓ | ✓✓✓ | ✗ | ✓✓ |
| 合规支持 | ✓✓ | ✓✓ | ✓ | ✓✓✓ | ✗ | ✓✓ |

### 7.3 选型决策树

```
项目需求评估
    │
    ├─ 快速原型开发 → AutoGPT / CrewAI
    │
    ├─ 多工具集成 → LangChain
    │
    ├─ 复杂工作流 → LangGraph
    │
    ├─ 多Agent协作 → CrewAI / AutoGen
    │
    ├─ 企业级部署 → AutoGen / LangGraph
    │
    └─ 结构化流程 → MetaGPT
```

### 7.4 各框架代码示例

#### LangGraph

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    input: str
    agent_outcome: str
    intermediate_steps: list

workflow = StateGraph(AgentState)

workflow.add_node("agent", call_agent)
workflow.add_node("action", perform_action)

workflow.add_edge("agent", "action")
workflow.add_conditional_edges(
    "action",
    should_continue,
    {"continue": "agent", "end": END}
)

app = workflow.compile()
result = app.invoke({"input": "Search for AI news"})
```

#### CrewAI

```python
from crewai import Agent, Task, Crew

researcher = Agent(
    role='Senior Research Analyst',
    goal='Uncover cutting-edge developments in AI',
    backstory='You work at a leading tech think tank...',
    verbose=True,
    allow_delegation=False,
    tools=[search_tool]
)

writer = Agent(
    role='Tech Content Strategist',
    goal='Craft compelling content on tech advancements',
    backstory='You are a renowned content strategist...',
    verbose=True,
    allow_delegation=True
)

task1 = Task(description='Analyze the latest AI trends', agent=researcher)
task2 = Task(description='Write an article based on the analysis', agent=writer)

crew = Crew(agents=[researcher, writer], tasks=[task1, task2])
result = crew.kickoff()
```

---

## 八、Agent测试与评估方法论

### 8.1 评估框架设计

#### 五大核心评估维度

| 维度 | 评估内容 | 核心指标 |
|------|----------|----------|
| **任务完成度** | Agent是否达成用户目标 | 任务成功率、步骤正确率、意图理解准确度 |
| **工具调用质量** | Agent是否正确调用工具 | 工具选择准确率、参数正确率、无效调用率 |
| **性能效率** | Agent执行效率与资源消耗 | 端到端延迟、工具调用次数、Token消耗 |
| **安全性** | Agent行为是否合规安全 | 敏感信息泄露率、越权访问率、幻觉率 |
| **用户满意度** | 用户对Agent的评价 | 点赞率、转人工率、重复提问率 |

### 8.2 核心评估指标

#### 定量指标

| 指标 | 定义 | 健康值 |
|------|------|--------|
| **任务成功率** | 成功完成任务数/总测试用例数 | ≥ 85% |
| **工具选择准确率** | 调用正确工具的次数/总调用次数 | ≥ 95% |
| **参数正确率** | 参数值符合业务规则的次数/总调用次数 | ≥ 90% |
| **无效调用率** | 不必要的工具调用次数/总调用次数 | ≤ 5% |
| **端到端延迟** | 从用户输入到最终输出的时间 | < 5s（交互式场景） |
| **Token消耗** | 输入+输出总token数/任务 | 尽可能低 |
| **点赞率** | 对话结束点赞数/总对话数 | ≥ 70% |
| **转人工率** | 用户主动要求人工的次数/总对话数 | ≤ 15% |
| **重复提问率** | 同一问题问2次以上的次数/总对话数 | ≤ 10% |

### 8.3 评估方法

#### 8.3.1 自动化测试

```python
import jsonschema

expected_schema = {
    "type": "object",
    "properties": {
        "flight_number": {"type": "string"},
        "price": {"type": "number"},
        "booking_url": {"type": "string", "format": "uri"}
    },
    "required": ["flight_number", "price"]
}

def validate_task_output(output: dict) -> bool:
    try:
        jsonschema.validate(instance=output, schema=expected_schema)
        return True
    except jsonschema.ValidationError:
        return False

def evaluate_agent(agent, test_cases):
    results = []
    for case in test_cases:
        output = agent.invoke(case["input"])
        is_valid = validate_task_output(output)
        results.append({
            "input": case["input"],
            "output": output,
            "is_valid": is_valid
        })
    success_rate = sum(1 for r in results if r["is_valid"]) / len(results)
    return {"success_rate": success_rate, "results": results}
```

#### 8.3.2 LLM-as-Judge

```python
from langchain.chat_models import ChatOpenAI

llm_judge = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def llm_as_judge(agent_output, expected_output, task_description):
    prompt = f"""
    请评估以下Agent输出是否满足任务要求：
    
    任务描述：{task_description}
    
    Agent输出：{agent_output}
    
    期望输出：{expected_output}
    
    请给出评分（0-10分）并说明理由。
    """
    result = llm_judge.invoke(prompt)
    return result.content
```

#### 8.3.3 人工评估

| 评估项 | 评分标准 |
|--------|----------|
| 意图理解 | 0=完全错误，5=部分正确，10=完全正确 |
| 工具选择 | 0=错误工具，5=部分正确，10=完全正确 |
| 参数正确性 | 0=完全错误，5=部分正确，10=完全正确 |
| 结果质量 | 0=不可用，5=可用但有缺陷，10=高质量 |
| 安全性 | 0=有安全风险，5=基本安全，10=完全安全 |

### 8.4 评估流程

```
1. 构建Golden Dataset（50~200条标注用例）
2. 自动化回归测试（每次Prompt/工具变更后跑一遍）
3. A/B对比（新旧版本并排评测）
4. 线上Shadow模式（AI输出但不直接给用户，人工评判）
5. 渐进放量（10% → 50% → 100%用户）
```

### 8.5 常用评估工具

| 工具 | 适用场景 | 核心功能 |
|------|----------|----------|
| **LangSmith** | LangChain生态 | Trace追踪、评测一体、可视化 |
| **Ragas** | RAG专用评测 | Faithfulness、Relevance评估 |
| **GAIA** | 真实世界任务 | 多步推理、工具调用评测 |
| **SWE-bench** | 代码修复任务 | GitHub issue修复评测 |
| **WebArena** | 网页操作任务 | 浏览器自动化评测 |

### 8.6 评估注意事项

1. **测试集质量**：覆盖主流程（80%）和边缘场景（20%）
2. **评估粒度**：区分端到端成功、步骤正确性、意图理解
3. **LLM-as-Judge局限性**：与人工标注一致性约80~85%，关键case需人工复核
4. **成本控制**：200条用例×3轮工具调用≈$5~20（API费用）
5. **持续迭代**：每季度补充新发现的bad case

---

## 九、项目实践：Gexm 平台 Agent 能力集成

### 9.1 实践概述

Gexm 电商平台在 `packages/server` 后端服务中集成了基于 LangChain 的 Agent 能力，实现了智能客服功能。该实践以 ReAct（Reasoning + Acting）框架为核心，通过大模型驱动的工具调用机制，为用户提供订单查询、商品搜索、账户管理等自然语言交互能力。项目同时实现了 MCP Server 标准化协议接口与 Agent Skills 技能包，形成"LLM + 工具 + 技能 + 协议"的完整 Agent 能力体系。

### 9.2 技术架构

项目采用以下核心技术栈构建 Agent 能力：

| 技术组件 | 版本 | 用途说明 |
|---------|------|----------|
| `@langchain/openai` | ^0.6.17 | 提供 `ChatOpenAI` 模型封装，支持 `bindTools` 绑定工具与 Function Calling |
| `@langchain/core` | ^0.3.80 | 提供 `SystemMessage`、`HumanMessage`、`AIMessage` 等消息类型定义 |
| `express` | ^4.18.3 | 构建 MCP Server 的 HTTP 服务框架，同时承载 Agent API 路由 |
| `TypeScript` | ES2020 target | 开发语言，`module: commonjs` 编译输出，提供类型安全 |
| `zod` | ^3.25.76 | 参数 Schema 校验（项目依赖） |

> 说明：项目 `tsconfig.json` 中 `module` 配置为 `commonjs`，与 `langchain` 主包（ESM-only）存在兼容性问题，因此直接使用 `@langchain/openai` 进行调用，避免 ESM/CJS 混用冲突。

### 9.3 ReAct 循环实现

项目通过 `ChatOpenAI.bindTools()` 方法绑定 OpenAI Function Calling 工具，实现 ReAct 循环（Thought → Action → Observation → Loop）：

1. **Thought（思考）**：将系统提示词与用户消息构造为消息列表，调用 `llmWithTools.invoke(messages)` 触发 LLM 推理。
2. **Action（行动）**：检查响应中的 `tool_calls` 字段，若存在工具调用，则通过 `toolExecutors` 映射表执行对应工具函数。
3. **Observation（观察）**：将工具执行结果以 `AIMessage` 形式追加到消息列表，作为下一轮推理的上下文。
4. **Loop（循环）**：重复上述步骤，直到 LLM 返回纯文本回复（无 `tool_calls`）或达到最大循环次数 `MAX_ITERATIONS = 5`。

关键实现位于 `agentService.ts` 的 `processAgentMessage` 函数，通过 `for` 循环控制迭代次数，防止无限调用。

### 9.4 工具体系

项目定义了 5 个核心工具，均以 JSON Schema 格式声明参数：

| 工具名称 | 功能说明 | 参数定义 |
|---------|----------|----------|
| `query_order` | 查询用户订单信息（含状态、金额、创建时间） | `userId: string`（必填）、`orderId: string`（必填） |
| `search_product` | 按关键词搜索商品，返回前 5 条结果 | `keyword: string`（必填） |
| `get_user_info` | 获取用户基本信息（邮箱、手机号已脱敏） | `userId: string`（必填） |
| `calculator` | 执行四则数学运算 | `a: number`、`b: number`、`operation: 'add'\|'subtract'\|'multiply'\|'divide'`（均必填） |
| `get_conversation_history` | 获取指定会话的历史消息（最近 10 条） | `conversationId: string`（必填） |

工具定义统一在 `tools.ts` 中维护，并通过 `allTools` 数组导出。`agentService.ts` 将其转换为 OpenAI Function Calling 格式（`type: 'function'` + `function` 字段）后绑定至 LLM。

### 9.5 MCP Server 实现

项目基于 JSON-RPC 2.0 协议实现了轻量级 MCP Server，使用 Express 框架承载 HTTP 接口。核心实现位于 `mcpServer.ts`，支持以下方法：

- **`tools/list`**：返回服务器提供的全部工具定义（含 `name`、`description`、`inputSchema`）。
- **`tools/call`**：根据 `params.name` 与 `params.arguments` 执行对应工具，返回 `content` 数组（`type: 'text'`）。

请求/响应遵循 JSON-RPC 2.0 规范，包含 `jsonrpc`、`id`、`result`/`error` 字段。错误处理覆盖 `-32601`（Method not found）、`-32602`（参数缺失）、`-32603`（内部错误）等标准错误码。

MCP Server 提供启动（`startMcpServer`）、停止（`stopMcpServer`）、状态查询（`getMcpServerStatus`）三个管理函数，默认监听端口 `8080`。

### 9.6 Agent Skills 技能包

项目在 `packages/server/src/services/agent/skills/` 目录下定义了 3 个技能包，遵循 `SKILL.md` 标准格式（YAML 前置元数据 + Markdown 指令体）：

| 技能包名称 | 功能说明 | 允许调用的工具 |
|-----------|----------|----------------|
| `order-inquiry` | 订单查询与跟踪，处理订单发货、物流、退款等咨询 | `query_order`、`get_conversation_history` |
| `product-search` | 商品搜索与推荐，根据关键词返回商品信息与购买建议 | `search_product` |
| `user-service` | 用户账户服务，处理账户信息查询、会员权益咨询 | `get_user_info` |

每个技能包通过 `allowed-tools` 字段限制可访问的工具范围，遵循最小权限原则。

### 9.7 安全措施

项目从数据、权限、稳定性三个维度构建 Agent 安全防护体系：

| 安全维度 | 实现方式 |
|----------|----------|
| **数据脱敏** | 用户邮箱显示为"前 2 位 + \*\*\* + @域名"，手机号显示为"前 3 位 + \*\*\*\* + 后 4 位" |
| **权限校验** | 订单查询时校验 `order.user_id !== userId`，拒绝越权访问 |
| **降级机制** | 未配置 `OPENAI_API_KEY` 时，Agent 返回预设的 mock 响应，保证服务可用性 |
| **最大循环次数限制** | `MAX_ITERATIONS = 5`，防止 ReAct 循环无限执行导致资源耗尽 |
| **异常捕获** | 工具执行与 LLM 调用均包裹 `try-catch`，异常时返回友好提示而非抛出错误 |

### 9.8 遇到的问题与解决方案

| 问题描述 | 根因分析 | 解决方案 |
|----------|----------|----------|
| `langchain` 主包为 ESM-only，与项目 CommonJS 配置不兼容 | `tsconfig.json` 中 `module: "commonjs"`，而 `langchain` 仅支持 ESM 导入 | 改用 `@langchain/openai` 直接调用 `ChatOpenAI`，绕过 `langchain` 主包的 ESM 限制 |
| MCP SDK API 与项目运行环境不兼容 | `@modelcontextprotocol/sdk` 的传输层依赖 Node 原生模块，配置复杂 | 改用 Express 实现轻量级 MCP Server，手动实现 JSON-RPC 2.0 协议处理 |
| 异步回调未捕获导致进程崩溃 | 工具执行与 LLM 调用均为异步操作，异常会沿 Promise 链传播 | 改用 Promise 链式调用 + `try-catch` 包裹 + 降级响应处理 |
| 用户数据安全风险 | 邮箱、手机号等敏感信息直接返回会泄露隐私 | 在 `executeGetUserInfo` 中对邮箱和手机号进行脱敏处理后再返回 |

### 9.9 API 接口

Agent 相关 API 路由定义在 `routes/agent.ts` 中，挂载于 `/api/agent` 路径下：

| 方法 | 路径 | 功能说明 |
|------|------|----------|
| POST | `/api/agent/chat` | Agent 对话接口，接收 `conversationId`、`userId`、`message`，返回 Agent 响应 |
| GET | `/api/agent/tools` | 获取 Agent 可用工具列表（含名称、描述、Schema） |
| GET | `/api/agent/status` | 查询 Agent 可用性与 MCP Server 运行状态 |
| POST | `/api/agent/mcp/start` | 启动 MCP Server（可选参数 `port`，默认 8080） |
| POST | `/api/agent/mcp/stop` | 停止 MCP Server |

### 9.10 关键代码文件路径

| 文件路径 | 职责说明 |
|----------|----------|
| `packages/server/src/services/agent/agentService.ts` | Agent 核心服务，实现 ReAct 循环、LLM 初始化、降级机制 |
| `packages/server/src/services/agent/tools.ts` | 工具定义与执行函数（5 个核心工具） |
| `packages/server/src/services/agent/mcpServer.ts` | MCP Server 实现，基于 Express + JSON-RPC 2.0 |
| `packages/server/src/routes/agent.ts` | Agent API 路由（5 个接口） |
| `packages/server/src/services/agent/skills/order-inquiry/SKILL.md` | 订单查询技能包 |
| `packages/server/src/services/agent/skills/product-search/SKILL.md` | 商品搜索技能包 |
| `packages/server/src/services/agent/skills/user-service/SKILL.md` | 用户服务技能包 |

---

## 参考文献

1. [【AI Agent Skills】重塑 AI Agent 竞争力](https://blog.csdn.net/weixin_45793745/article/details/156518039)
2. [读懂AI Agent 构建逻辑](https://developer.aliyun.com/article/1742675)
3. [Agent Skills 让AI记住你的工作方式](https://pub-161ae4b5ed0644c4a43b5c6412287e03.r2.dev/latest/agent-skills.pdf)
4. [Agent Skills 深度架构解析与实战](https://developer.cloud.tencent.com.cn/article/2670233)
5. [AI Agent 清华讲座笔记](https://juejin.cn/post/7643037374348820521)
6. [LangChain Agent 开发实战](https://docs.langchain.com/oss/javascript/langchain/multi-agent/skills-sql-assistant)
7. [MCP协议完全指南](https://blog.csdn.net/ziwoods/article/details/161662819)
8. [Microsoft Agent Framework Skills](https://learn.microsoft.com/sk-sk/agent-framework/agents/skills)
9. [生产级 AI Agent 构建指南](https://juejin.cn/post/7638782757923586088)

---

> 本文档整理自互联网公开资料，仅供学习参考。如有侵权，请联系删除。