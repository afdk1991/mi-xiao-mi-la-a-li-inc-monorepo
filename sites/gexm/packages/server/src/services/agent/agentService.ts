/**
 * Agent 核心服务
 * 基于 ReAct 框架（Thought → Action → Observation → Loop）实现
 * 使用 @langchain/openai 的 ChatOpenAI 进行 LLM 调用
 * 工具调用通过 OpenAI Function Calling API 实现
 */
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import logger from '../../utils/logger'
import {
  allTools,
  executeQueryOrder,
  executeSearchProduct,
  executeGetUserInfo,
  executeCalculator,
  executeGetConversationHistory,
} from './tools'

// Agent 单例
let llmInstance: ChatOpenAI | null = null

// 最大循环次数，防止无限调用
const MAX_ITERATIONS = 5

// OpenAI Function Calling 工具定义
const openaiTools = allTools.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.schema,
  },
}))

// 工具名到执行函数的映射
const toolExecutors: Record<string, (args: Record<string, unknown>) => Promise<string> | string> = {
  query_order: (args) => executeQueryOrder(args.userId as string, args.orderId as string),
  search_product: (args) => executeSearchProduct(args.keyword as string),
  get_user_info: (args) => executeGetUserInfo(args.userId as string),
  calculator: (args) =>
    executeCalculator(args.a as number, args.b as number, args.operation as string),
  get_conversation_history: (args) => executeGetConversationHistory(args.conversationId as string),
}

/**
 * 初始化 LLM 实例
 * 如果未配置 OPENAI_API_KEY，返回 null，使用降级响应
 */
function initLLM(): ChatOpenAI | null {
  if (llmInstance) {
    return llmInstance
  }

  const apiKey = process.env.OPENAI_API_KEY || ''
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY 未配置，Agent 使用降级模式')
    return null
  }

  try {
    llmInstance = new ChatOpenAI({
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      },
    })
    logger.info('Agent LLM 初始化成功')
    return llmInstance
  } catch (error) {
    logger.error('Agent LLM 初始化失败:', error)
    return null
  }
}

// 降级响应（未配置 API Key 时使用）
const mockResponses = [
  '您好！我是 Gexm 智能助手，很高兴为您服务。请问有什么可以帮您？',
  '感谢您的提问，我来为您分析一下这个问题。',
  '这是一个很好的问题，让我为您详细解答。',
  '根据您描述的情况，我建议您可以尝试以下方案...',
  '您的反馈很有价值，我会记录下来并持续改进服务。',
  '如果您有其他问题，随时可以向我提问。',
]

// 系统提示词
const SYSTEM_PROMPT = `你是 Gexm 智能助手，一个专业的电商平台智能客服。

你的核心职责：
1. 理解用户意图并提供准确的回答
2. 根据需要调用工具获取实时数据（订单、商品、用户信息等）
3. 使用自然、友好的语言与用户交流
4. 处理用户的订单查询、商品搜索、账户问题等需求

可用工具：
- query_order: 查询用户订单信息（需要 userId 和 orderId）
- search_product: 搜索商品信息（需要 keyword）
- get_user_info: 获取用户基本信息（需要 userId）
- calculator: 执行数学运算（需要 a, b, operation）
- get_conversation_history: 获取会话历史消息（需要 conversationId）

注意事项：
- 只有在需要获取实时数据时才调用工具
- 如果用户的问题可以直接回答，则不需要调用工具
- 调用工具时请提供正确的参数
- 回答要简洁明了，避免冗余`

/**
 * 执行工具调用
 */
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const executor = toolExecutors[name]
  if (!executor) {
    return `未知工具: ${name}`
  }
  try {
    return await executor(args)
  } catch (error) {
    logger.error(`执行工具 ${name} 失败:`, error)
    return `执行工具 ${name} 失败: ${(error as Error).message}`
  }
}

/**
 * ReAct 循环：思考 → 行动 → 观察 → 循环
 *
 * 实现流程：
 * 1. 将用户消息发送给 LLM
 * 2. 如果 LLM 返回工具调用，执行工具
 * 3. 将工具结果反馈给 LLM
 * 4. 重复直到 LLM 返回最终文本回复
 */
export async function processAgentMessage(
  conversationId: string,
  userId: string,
  message: string
): Promise<string> {
  try {
    const llm = initLLM()

    // 降级模式：未配置 API Key
    if (!llm) {
      logger.info(`Agent 降级模式: 用户 ${userId}, 会话 ${conversationId}`)
      return mockResponses[Math.floor(Math.random() * mockResponses.length)]
    }

    logger.info(`Agent 处理消息: 用户 ${userId}, 会话 ${conversationId}`)

    // 构建消息列表
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(message),
    ]

    // 将 LLM 绑定工具
    const llmWithTools = llm.bindTools(openaiTools)

    // ReAct 循环
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Thought：调用 LLM 进行思考
      const response = await llmWithTools.invoke(messages)
      const aiMessage = response as AIMessage

      // 如果没有工具调用，返回最终回复
      if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
        const content =
          typeof aiMessage.content === 'string' ? aiMessage.content : '抱歉，我无法理解您的问题。'
        logger.info(`Agent 响应完成: 用户 ${userId}, 迭代次数 ${i + 1}`)
        return content
      }

      // 将 AI 消息（含工具调用）加入消息列表
      messages.push(aiMessage)

      // Action：执行工具调用
      for (const toolCall of aiMessage.tool_calls) {
        const { name, args } = toolCall
        logger.info(`Agent 调用工具: ${name}, 参数: ${JSON.stringify(args)}`)

        // Observation：获取工具执行结果
        const result = await executeTool(name, args)

        // 将工具结果加入消息列表（作为 ToolMessage 的替代方案）
        messages.push(new AIMessage(`工具 ${name} 的结果: ${result}`))
      }
    }

    // 超过最大循环次数，返回默认回复
    logger.warn(`Agent 超过最大循环次数 ${MAX_ITERATIONS}`)
    return '抱歉，处理您的请求花费了太长时间，请尝试简化问题后重试。'
  } catch (error) {
    logger.error('Agent 处理消息失败:', error)
    return '抱歉，我现在无法处理您的请求，请稍后再试。'
  }
}

/**
 * 获取可用工具列表
 */
export function getAvailableTools() {
  return allTools.map((t) => ({
    name: t.name,
    description: t.description,
    schema: t.schema,
  }))
}

/**
 * 检查 Agent 是否可用（已配置 API Key）
 */
export function isAgentAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY
}
