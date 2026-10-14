# AI 大模型与服务器 / 计算机技术 · 可转载资源清单

> 整理时间：2026-10 ｜ 共 79 项资源 ｜ 分 8 大类
>
> **免责声明**：本清单为整理性索引，不构成法律意见。开源许可可能随版本变更，模型权重许可与代码许可相互独立。**正式转载、商用或翻译前请逐项核对目标页面 / 仓库当前的 LICENSE 声明。**

| 许可标记 | 含义 |
|---|---|
| 🟢 | 宽松可商用：保留许可声明即可商用、改写、再分发 |
| 🟡 | 可转载但需署名 / 相同方式共享，或附带使用限制（如 RFC 不得修改、自定义模型许可门槛） |
| 🔴 | 仅可引用片段或需书面授权：arXiv 默认许可、非商业许可、默认版权内容 |

---

## A. 大模型原理与算法（15 项）

课程讲义、可视化教程与奠基性论文，覆盖 Transformer、Scaling Law、注意力机制与对齐方法论。

### 1. Stanford CS336: Language Modeling from Scratch

- **编号**：A1　｜　**类型**：大学课程（课件+作业+录像）
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：课件/作业版权归 Stanford，公开可下载；引用需注明来源，整篇转载或本地化翻译建议先联系课程组。YouTube 录像适用 YouTube 标准条款（可嵌入、不可下载再分发）。
- **主要内容**：从零构建语言模型：tokenizer、Transformer 架构、训练系统、Scaling Law、数据清洗去重，到 SFT 与 RL 对齐。5 个重编程作业，含 Triton 版 FlashAttention2 实现。
- **适合人群**：有 PyTorch 与系统优化基础的工程师、研究者
- **获取渠道**：[课程主页](https://cs336.stanford.edu/) ｜ [GitHub](https://github.com/stanford-cs336) ｜ [YouTube 录像](https://www.youtube.com/playlist?list=PLoROMvodv4rMqXOcazWaTUHhq-yembLCV)

### 2. Stanford CS324 · 大型语言模型（Percy Liang）

- **编号**：A2　｜　**类型**：大学课程资料
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：课件与讲稿版权归 Stanford / CRFM，注明出处可引用；整篇转载需授权。
- **主要内容**：系统梳理 LLM 的能力与风险：模型架构、训练目标、适配、 prompting 与评测，是中文社区广泛引用的课程大纲来源。
- **适合人群**：想建立 LLM 全景认知的开发者与产品经理
- **获取渠道**：[GitHub](https://github.com/stanford-crfm/cs324)

### 3. MIT 6.S191 · Introduction to Deep Learning

- **编号**：A3　｜　**类型**：课程（视频+Colab 代码）
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：教学视频版权归 MIT，注明出处可引用；配套 Colab / 代码多为 MIT 许可，以仓库 LICENSE 为准。
- **主要内容**：一周密集课：CNN、RNN、Transformer、自注意力、生成模型（VAE/GAN/Diffusion）、深度强化学习，配可运行 Colab 实验。
- **适合人群**：入门者、在校学生、需要快速补齐深度学习知识的工程师
- **获取渠道**：[课程主页](http://introtodeeplearning.com/)

### 4. fast.ai《Practical Deep Learning for Coders》

- **编号**：A4　｜　**类型**：视频课程 + Notebook
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：课程内容采用 CC BY-NC-SA 类许可（非商业、署名、相同方式共享），以官网版权声明为准。
- **主要内容**：自上而下的实践路线：先用起来再补理论，覆盖图像、表格、NLP、协同过滤与从零手写训练循环，附 fastai 库源码精读。
- **适合人群**：偏好"先动手"的工程师、转行学习者
- **获取渠道**：[课程主页](https://course.fast.ai/)

### 5. Harvard NLP《The Annotated Transformer》

- **编号**：A5　｜　**类型**：教程 + 可执行代码
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：代码仓库 MIT（Copyright 2018 Alexander Rush，保留 LICENSE 即可自由使用与改写）；网页版文章通常以 CC BY-SA 4.0 流通，需核实：页面底部未给出统一许可声明，转载前建议只引用观点与代码片段并保留原文链接。
- **主要内容**：逐行注释复现《Attention Is All You Need》，把论文公式与 PyTorch 实现一一对应，是读 Transformer 代码的最佳入口。
- **适合人群**：需要读懂并改造 Transformer 实现的工程师
- **获取渠道**：[在线版](https://nlp.seas.harvard.edu/annotated-transformer/) ｜ [GitHub](https://github.com/harvardnlp/annotated-transformer)

### 6. Attention Is All You Need（arXiv:1706.03762）

- **编号**：A6　｜　**类型**：奠基论文
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：arXiv 默认"perpetual non-exclusive license"：版权归作者，全文转载/翻译需作者授权；仅当该版本标注 CC BY/CC0 才可自由转载。摘要与元数据为 CC0，可自由使用。
- **主要内容**：提出 Transformer 与多头自注意力，取代 RNN/CNN 成为主流架构，是现代大模型的原点。
- **适合人群**：所有从事大模型相关工作的人
- **获取渠道**：[arXiv](https://arxiv.org/abs/1706.03762)

### 7. Language Models are Few-Shot Learners（GPT-3, arXiv:2005.14165）

- **编号**：A7　｜　**类型**：奠基论文
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：同 arXiv 默认许可，全文转载需授权；引用观点与数据、注明编号即可。
- **主要内容**：确立 in-context learning / few-shot prompting 范式，给出参数规模与任务能力的经验关系。
- **适合人群**：算法与产品侧均需了解的从业者
- **获取渠道**：[arXiv](https://arxiv.org/abs/2005.14165)

### 8. Scaling Laws for Neural Language Models（arXiv:2001.08361）

- **编号**：A8　｜　**类型**：奠基论文
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：同 arXiv 默认许可，转载需授权；可引用图表结论并注明出处。
- **主要内容**：给出损失随参数量、数据量、算力变化的幂律关系，是模型规模规划的定量基础。
- **适合人群**：做算力预算与模型选型的技术负责人
- **获取渠道**：[arXiv](https://arxiv.org/abs/2001.08361)

### 9. FlashAttention（论文 arXiv:2205.14135 / 代码仓库）

- **编号**：A9　｜　**类型**：论文 + 开源实现
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：代码：BSD-3-Clause（宽松可商用）；论文部分同 arXiv 默认许可，转载需授权。二者许可相互独立。
- **主要内容**：IO 感知的精确注意力算法，通过分块与重计算把显存占用从 O(N²) 降到 O(N)，几乎所有推理/训练框架都已集成。
- **适合人群**：做训练与推理性能优化的工程师
- **获取渠道**：[论文](https://arxiv.org/abs/2205.14135) ｜ [代码](https://github.com/Dao-AILab/flash-attention)

### 10. PagedAttention / vLLM 论文（arXiv:2309.06180）

- **编号**：A10　｜　**类型**：论文 + 开源实现
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：代码：Apache-2.0；论文同 arXiv 默认许可。
- **主要内容**：用操作系统虚拟内存分页的思想管理 KV Cache，配合连续批处理大幅提升吞吐，是当下推理引擎的事实标准方案。
- **适合人群**：负责推理服务成本与吞吐的工程师
- **获取渠道**：[论文](https://arxiv.org/abs/2309.06180) ｜ [代码](https://github.com/vllm-project/vllm)

### 11. Distill.pub（可视化机器学习期刊）

- **编号**：A11　｜　**类型**：期刊文章
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：正文 CC BY 4.0（署名即可，可商用、可改编），代码多为 MIT/Apache；是少数"高自由度 + 高质量"的技术内容源。
- **主要内容**：交互式图表讲解注意力、特征可视化、神经 ODE 等难懂概念，每篇都附带可交互 demo。
- **适合人群**：需要向他人解释模型原理的讲师与作者
- **获取渠道**：[官网](https://distill.pub/)

### 12. 维基百科 / Wikipedia（Transformer、深度学习等条目）

- **编号**：A12　｜　**类型**：百科条目
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：CC BY-SA 4.0（与 GFDL 双许可）：可商用、可改写，须署名且衍生作品沿用相同许可；链接回原文可满足署名要求。
- **主要内容**：概念定义、发展脉络与引用的二手文献索引，适合作为文章的"背景介绍"段的基础素材。
- **适合人群**：所有内容创作者
- **获取渠道**：[中文站](https://zh.wikipedia.org/) ｜ [英文站](https://en.wikipedia.org/)

### 13. 3Blue1Brown《神经网络与 Transformer 可视化系列》

- **编号**：A13　｜　**类型**：科普视频
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：版权归作者 Grant Sanderson；其公开声明允许非商业性使用并注明出处，具体以频道/官网说明为准，商用需授权。
- **主要内容**：用动画解释梯度下降、反向传播、注意力与 GPT 的内部机制，是引用率最高的可视化素材。
- **适合人群**：教学、分享、科普场景
- **获取渠道**：[YouTube](https://www.youtube.com/@3blue1brown)

### 14. The Illustrated Transformer / GPT-2（Jay Alammar）

- **编号**：A14　｜　**类型**：图解博客
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：版权归作者；允许注明出处引用与链接，整篇转载或翻译需取得授权，图示不可直接复制进商业稿件。
- **主要内容**：逐步图解 Encoder-Decoder、自注意力与 GPT-2 前向过程，中文版流传极广。
- **适合人群**：需要图示化讲解的读者与写作者
- **获取渠道**：[原文](https://jalammar.github.io/illustrated-transformer/)

### 15. 《Deep Learning》（Goodfellow / Bengio / Courville）在线版

- **编号**：A15　｜　**类型**：教材（免费在线）
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：免费在线阅读，但版权归作者与 MIT Press；转载、翻译、重排需联系出版社，以 deeplearningbook.org 声明为准。
- **主要内容**：深度学习经典教材，涵盖线性代数、概率、深度网络、正则化、优化与生成模型等基础理论。
- **适合人群**：需要系统补齐理论的研究者与高阶工程师
- **获取渠道**：[在线版](https://www.deeplearningbook.org/)


## B. 训练与微调工具（13 项）

预训练、分布式训练、LoRA/QLoRA 微调与实验管理的主流开源工具链。

### 1. PyTorch

- **编号**：B1　｜　**类型**：开源框架
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：源码 BSD-3-Clause 风格（宽松可商用）；官方文档以页面页脚声明为准（多为宽松许可），引用注明即可。
- **主要内容**：深度学习研究与工业训练的事实标准框架，含 autograd、分布式训练（DDP/FSDP）与 torch.compile。
- **适合人群**：所有算法与训练工程师
- **获取渠道**：[官网](https://pytorch.org/) ｜ [GitHub](https://github.com/pytorch/pytorch)

### 2. Hugging Face Transformers

- **编号**：B2　｜　**类型**：开源库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0（可商用、可改写，保留 LICENSE、NOTICE 并标注改动）。
- **主要内容**：数万个预训练模型的统一加载、训练与推理接口，配套 Trainer、Tokenizer 与 Pipeline，生态最完整。
- **适合人群**：需要快速接入与微调开源模型的开发者
- **获取渠道**：[GitHub](https://github.com/huggingface/transformers) ｜ [文档](https://huggingface.co/docs/transformers)

### 3. Hugging Face PEFT / TRL / Accelerate

- **编号**：B3　｜　**类型**：开源库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：PEFT 提供 LoRA/QLoRA/Prefix-Tuning 等参数高效微调；TRL 提供 SFT、DPO、PPO、GRPO 等对齐训练；Accelerate 屏蔽单机多卡与混合精度差异。
- **适合人群**：做微调与对齐训练的工程师
- **获取渠道**：[PEFT](https://github.com/huggingface/peft) ｜ [TRL](https://github.com/huggingface/trl)

### 4. Microsoft DeepSpeed

- **编号**：B4　｜　**类型**：开源库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：ZeRO 系列显存优化（1/2/3 + Infinity 卸载）、3D 并行、稀疏 MoE 训练，是千亿参数训练的核心工程组件。
- **适合人群**：大规模分布式训练工程师
- **获取渠道**：[GitHub](https://github.com/deepspeedai/DeepSpeed) ｜ [文档](https://www.deepspeed.ai/)

### 5. NVIDIA Megatron-LM / Megatron-Core

- **编号**：B5　｜　**类型**：开源库
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：NVIDIA 自定义许可（非标准 Apache/MIT），以仓库 LICENSE 为准，商用前须逐条核对。
- **主要内容**：张量并行 / 流水线并行 / 序列并行的成熟实现，GPT-3 到万亿参数级别的训练实践参考。
- **适合人群**：超大规模预训练团队
- **获取渠道**：[GitHub](https://github.com/NVIDIA/Megatron-LM)

### 6. Unsloth

- **编号**：B6　｜　**类型**：开源工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：手写 Triton 内核重写训练热点，单卡微调速度提升数倍、显存占用大幅下降，支持大多数主流开源模型。
- **适合人群**：显存受限、追求微调性价比的个人与小团队
- **获取渠道**：[GitHub](https://github.com/unslothai/unsloth) ｜ [文档](https://docs.unsloth.ai/)

### 7. LLaMA-Factory

- **编号**：B7　｜　**类型**：开源工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：国产主流微调一体化框架，含 Web UI，覆盖预训练、SFT、奖励模型、DPO/PPO 与量化导出，中文模型支持完善。
- **适合人群**：偏好可视化操作、以中文场景为主的开发者
- **获取渠道**：[GitHub](https://github.com/hiyouga/LLaMA-Factory)

### 8. Axolotl

- **编号**：B8　｜　**类型**：开源工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：以 YAML 配置驱动的微调框架，支持多 LoRA、packing、多种注意力后端，便于把训练过程配置化、版本化。
- **适合人群**：需要工程化、可复现训练流程的团队
- **获取渠道**：[GitHub](https://github.com/axolotl-ai-cloud/axolotl)

### 9. Colossal-AI

- **编号**：B9　｜　**类型**：开源库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：国产大规模训练系统，提供多维并行、异构内存管理、ZeRO 优化与推理一体化方案。
- **适合人群**：追求国产化训练栈的团队
- **获取渠道**：[GitHub](https://github.com/hpcaistudioai/ColossalAI)

### 10. OLMo 2（Allen Institute for AI）

- **编号**：B10　｜　**类型**：开源模型 + 训练代码 + 数据
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。模型权重、训练代码、训练数据与评测工具全部开放，是少见的"完全可复现"模型。
- **主要内容**：真正开放的 LLM 研究栈：从 Dolma 数据集、训练框架到 checkpoint 与 eval 全链路可查，适合研究训练配方与数据配比。
- **适合人群**：学术研究、需要可复现训练基线的团队
- **获取渠道**：[GitHub](https://github.com/allenai/OLMo) ｜ [HuggingFace](https://huggingface.co/allenai)

### 11. Weights & Biases 文档与教程

- **编号**：B11　｜　**类型**：技术文档/教程
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：文档版权归 W&B，通常允许注明出处引用；整篇转载需授权，以站点 Terms 为准。
- **主要内容**：实验追踪、超参搜索、训练可视化与团队协作的实践指南，是 MLOps 落地常见参考。
- **适合人群**：搭建训练实验管理流程的团队
- **获取渠道**：[文档](https://docs.wandb.ai/)

### 12. OpenAI Cookbook

- **编号**：B12　｜　**类型**：示例代码集
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：以仓库 LICENSE 文件为准（OpenAI 各仓库许可并不统一），使用前务必现场核对。
- **主要内容**：官方示例：embedding、函数调用、RAG、结构化输出、评测等 API 使用范式。
- **适合人群**：基于 API 构建应用的开发者
- **获取渠道**：[GitHub](https://github.com/openai/openai-cookbook)

### 13. Datawhale 开源课程（happy-llm、self-llm 等）

- **编号**：B13　｜　**类型**：中文开源教程
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：各仓库许可不统一（Apache-2.0 与 CC BY-NC-SA 均有），以每个仓库的 LICENSE 为准。
- **主要内容**：中文社区维护的大模型原理与部署实践教程，从手写 Transformer 到开源模型本地部署，适合国内学习路径。
- **适合人群**：中文读者、大模型入门者
- **获取渠道**：[GitHub 组织](https://github.com/datawhalechina)


## C. 推理部署与优化（14 项）

推理引擎、量化、服务化框架与本地/边缘运行时，是"跑得起来、跑得便宜"的关键。

### 1. vLLM

- **编号**：C1　｜　**类型**：推理引擎
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。2024 年已由 UC Berkeley 捐给 Linux Foundation，现为 PyTorch Foundation 托管项目。
- **主要内容**：PagedAttention + 连续批处理 + 前缀缓存 + chunked prefill + 投机解码，支持 200+ 模型架构与 OpenAI 兼容 API，数据中心级吞吐首选。
- **适合人群**：需要高并发在线推理服务的团队
- **获取渠道**：[GitHub](https://github.com/vllm-project/vllm) ｜ [文档](https://docs.vllm.ai/)

### 2. SGLang

- **编号**：C2　｜　**类型**：推理引擎
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：RadixAttention 前缀缓存复用 + 压缩状态机引导的结构化输出，对 Agent、JSON/正则约束生成与多轮调用场景优势明显。
- **适合人群**：Agent、结构化输出、复杂编排场景
- **获取渠道**：[GitHub](https://github.com/sgl-project/sglang) ｜ [文档](https://docs.sglang.ai/)

### 3. llama.cpp

- **编号**：C3　｜　**类型**：本地推理运行时
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：MIT（最宽松，保留版权声明即可商用改写）。
- **主要内容**：纯 C/C++ 实现，GGUF 量化格式的事实标准，CPU / Apple Silicon / 各类 GPU 后端通吃，是本地与边缘部署的基石。
- **适合人群**：本地部署、嵌入式与边缘推理
- **获取渠道**：[GitHub](https://github.com/ggml-org/llama.cpp)

### 4. Ollama

- **编号**：C4　｜　**类型**：本地推理工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：MIT。
- **主要内容**：一条命令拉取并运行模型，自带 Modelfile 打包与 OpenAI 兼容接口，本地开发体验最佳。
- **适合人群**：本地开发、快速验证、桌面端应用
- **获取渠道**：[官网](https://ollama.com/) ｜ [GitHub](https://github.com/ollama/ollama)

### 5. NVIDIA TensorRT-LLM

- **编号**：C5　｜　**类型**：推理优化库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：NVIDIA GPU 上的极致吞吐方案：内核融合、量化（FP8/FP4/INT4）、in-flight batching，与 Triton 搭配组成生产栈。
- **适合人群**：追求 NVIDIA GPU 极限性能的团队
- **获取渠道**：[GitHub](https://github.com/NVIDIA/TensorRT-LLM)

### 6. LMDeploy（上海 AI Lab / InternLM）

- **编号**：C6　｜　**类型**：推理与部署工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：自研持久化批处理与 W4A16/KV 量化，对 InternLM、Qwen 等国产模型支持完善，含 API 服务与 Gradio 界面。
- **适合人群**：以国产模型为主的部署团队
- **获取渠道**：[GitHub](https://github.com/InternLM/lmdeploy)

### 7. NVIDIA Triton Inference Server

- **编号**：C7　｜　**类型**：服务化框架
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：BSD-3-Clause。
- **主要内容**：生产级多后端模型服务：动态批处理、并发模型执行、gRPC/HTTP、Prometheus 指标与模型仓库管理。
- **适合人群**：需要统一多模型服务与可观测性的平台团队
- **获取渠道**：[GitHub](https://github.com/triton-inference-server/server)

### 8. ONNX Runtime

- **编号**：C8　｜　**类型**：跨平台推理引擎
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：MIT。
- **主要内容**：跨框架、跨硬件的模型加速运行时，支持 CPU/GPU/NPU 与量化、图优化，适合传统模型与边缘落地。
- **适合人群**：异构硬件部署与模型标准化交付
- **获取渠道**：[GitHub](https://github.com/microsoft/onnxruntime)

### 9. Intel OpenVINO

- **编号**：C9　｜　**类型**：推理优化工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：面向 Intel CPU / iGPU / NPU 的模型压缩与加速工具链，支持量化、蒸馏与异构拆分。
- **适合人群**：x86 服务器与边缘部署
- **获取渠道**：[GitHub](https://github.com/openvinotoolkit/openvino)

### 10. MLC-LLM / WebLLM

- **编号**：C10　｜　**类型**：浏览器端推理
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：基于 TVM 的编译式部署，可在浏览器 WebGPU 中直接运行量化模型，无需服务端。
- **适合人群**：端侧与浏览器内推理、隐私敏感场景
- **获取渠道**：[GitHub](https://github.com/mlc-ai/web-llm)

### 11. Hugging Face Text Generation Inference（TGI）

- **编号**：C11　｜　**类型**：推理服务
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0（自 2025 年 12 月起进入维护模式，仍可沿用与转载）。
- **主要内容**：Rust + Python 实现的推理服务，支持张量并行、量化与流式输出，曾是 HF 生态默认部署方案。
- **适合人群**：既有 TGI 栈的维护者
- **获取渠道**：[GitHub](https://github.com/huggingface/text-generation-inference)

### 12. Xinference

- **编号**：C12　｜　**类型**：模型服务框架
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0。
- **主要内容**：国产多模型推理框架，统一管理 LLM、Embedding、Rerank 与多模态模型，内置分布式与 OpenAI 兼容接口。
- **适合人群**：需要一套框架管多类模型的团队
- **获取渠道**：[GitHub](https://github.com/xorbitsai/inference)

### 13. GGUF 格式规范与量化文档（llama.cpp 生态）

- **编号**：C13　｜　**类型**：技术规范文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：随 llama.cpp 采用 MIT 许可。
- **主要内容**：定义量化类型（Q4_K_M、Q5_K_S、IQ 系列等）与元数据布局，是本地模型分发的事实标准格式说明。
- **适合人群**：做量化与本地模型分发者
- **获取渠道**：[GGUF 规范](https://github.com/ggml-org/llama.cpp/blob/master/ggml/docs/gguf.md)

### 14. NVIDIA 开发者技术博客

- **编号**：C14　｜　**类型**：企业技术博客
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：版权归 NVIDIA；允许注明出处引用与摘要，整篇转载或翻译需授权；NVIDIA 商标与 Logo 不在授权范围内。
- **主要内容**：GPU 架构解析、CUDA 优化、推理加速与基准测试的一手资料，技术深度高。
- **适合人群**：做 GPU 侧性能调优的工程师
- **获取渠道**：[开发者博客](https://developer.nvidia.com/blog/)


## D. 服务器硬件与运维（14 项）

Linux 系统、发行版官方文档、内核文档与可观测性/集群运维知识库。

### 1. Arch Wiki

- **编号**：D1　｜　**类型**：运维知识库
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：GNU FDL 1.3：可复制、修改、商业分发，但须保留许可文本与作者署名、标注修改、提供"透明副本"；是运维内容最丰富且明确开放的知识库之一。
- **主要内容**：Linux 系统几乎所有主题的深度文档：内核、systemd、网络、存储、显卡驱动、桌面环境，技术准确度极高。
- **适合人群**：Linux 运维、SRE、桌面折腾者
- **获取渠道**：[Arch Wiki](https://wiki.archlinux.org/) ｜ [版权声明](https://wiki.archlinux.org/title/ArchWiki:Copyrights)

### 2. Red Hat 产品文档（RHEL / OpenShift）

- **编号**：D2　｜　**类型**：厂商官方文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：CC BY-SA 3.0 Unported（以每篇文档页脚 Legal Notice 为准，部分新文档为 4.0）：可商用、可改编，需署名且衍生作品沿用同协议，分发时必须提供原版 URL；Red Hat 商标与 Logo 需单独授权。
- **主要内容**：企业级 Linux 与容器平台的官方手册，涵盖系统管理、SELinux、性能调优、安全加固与高可用。
- **适合人群**：企业 IT 运维、系统架构师
- **获取渠道**：[文档中心](https://docs.redhat.com/)

### 3. Kubernetes 官方文档

- **编号**：D3　｜　**类型**：开源项目文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：CC BY 4.0：署名即可自由使用与改编，不要求衍生作品沿用同协议，商用友好度极高。
- **主要内容**：容器编排的权威参考：概念、任务、教程与 API 参考，含中文版。
- **适合人群**：云原生运维与平台工程师
- **获取渠道**：[英文文档](https://kubernetes.io/docs/home/) ｜ [中文文档](https://kubernetes.io/zh-cn/docs/home/)

### 4. Linux 内核官方文档（docs.kernel.org）

- **编号**：D4　｜　**类型**：内核文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：GPL-2.0（强 copyleft）：可复制、修改、商用分发，衍生文档须沿用 GPL，并保留版权与许可声明。
- **主要内容**：内核子系统、驱动、调度、内存管理、sysfs ABI 与进程管理的一手说明，由内核开发者维护。
- **适合人群**：内核与底层系统工程师、驱动开发者
- **获取渠道**：[内核文档](https://docs.kernel.org/)

### 5. Linux man-pages / man7.org

- **编号**：D5　｜　**类型**：系统手册页
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：各手册页以页面内 COPYRIGHT 段为准，主体为 GPL-2.0+ / 类 BSD 许可，示例代码多为公有领域；需逐页核对。
- **主要内容**：系统调用、库函数、设备与文件格式的权威手册，是最"安全"的可引用底层资料之一。
- **适合人群**：系统编程与运维人员
- **获取渠道**：[man7.org](https://man7.org/linux/man-pages/)

### 6. nginx 官方文档

- **编号**：D6　｜　**类型**：开源项目文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：2-clause BSD-like：保留版权与许可声明即可自由使用与转载。
- **主要内容**：反向代理、负载均衡、缓存、限流与 TLS 配置的完整说明，Web 服务器运维必读。
- **适合人群**：Web 运维、网关与反向代理配置者
- **获取渠道**：[文档](https://nginx.org/en/docs/)

### 7. Prometheus / Grafana 官方文档

- **编号**：D7　｜　**类型**：开源项目文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：多为 CC BY 4.0（以站点页脚 LICENSE 声明为准）；项目代码分别为 Apache-2.0 与 AGPL-3.0。
- **主要内容**：指标采集、PromQL、告警规则、仪表盘与可视化配置，是可观测性体系的标准参考。
- **适合人群**：SRE、监控体系建设者
- **获取渠道**：[Prometheus](https://prometheus.io/docs/) ｜ [Grafana](https://grafana.com/docs/)

### 8. PostgreSQL 官方文档

- **编号**：D8　｜　**类型**：数据库文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：PostgreSQL License（BSD 类宽松许可）：保留版权声明即可自由使用与转载。
- **主要内容**：SQL 语法、索引类型、事务与 MVCC、复制、分区、性能调优与扩展机制的权威说明，中文版质量高。
- **适合人群**：DBA、后端工程师
- **获取渠道**：[英文文档](https://www.postgresql.org/docs/) ｜ [中文文档](https://www.postgresql.org/docs/current/zh/)

### 9. SQLite 官方文档

- **编号**：D9　｜　**类型**：数据库文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：公有领域（Public Domain）：源码与文档主体由作者宣誓放弃版权，无需署名即可自由复制、修改、商用。需核实：官方声明部分文档段落与测试逻辑受其他开源许可约束，整站大段镜像前建议抽查具体页面。
- **主要内容**：语法参考、文件格式、WAL 机制、虚拟表与性能建议；篇幅不大但工程价值极高。
- **适合人群**：嵌入式、客户端存储与工具开发者
- **获取渠道**：[文档](https://www.sqlite.org/docs.html)

### 10. Ceph 官方文档

- **编号**：D10　｜　**类型**：分布式存储文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：以官方站点页脚 LICENSE 声明为准（多为宽松/CC 类许可），转载前需现场确认。
- **主要内容**：分布式存储集群架构、CRUSH 算法、RBD/RGW/CephFS 部署与运维手册。
- **适合人群**：存储与云平台运维
- **获取渠道**：[文档](https://docs.ceph.com/)

### 11. FreeBSD Handbook / 官方文档

- **编号**：D11　｜　**类型**：发行版文档
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：FreeBSD Documentation License（BSD 风格）：保留版权与许可声明即可自由复制、修改与分发。
- **主要内容**：UNIX 系统管理经典：启动流程、 jail、ZFS、网络栈与内核配置。
- **适合人群**：BSD 系系统管理员与网络工程师
- **获取渠道**：[Handbook](https://docs.freebsd.org/en/books/handbook/)

### 12. Debian 官方文档与《Debian 管理员手册》

- **编号**：D12　｜　**类型**：发行版文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：Debian 官方文档多为宽松/GFDL 类许可；《Debian Administrator's Handbook》以书籍版权页为准（GFDL / CC BY-SA 双许可之一），转载前核对。
- **主要内容**：包管理、系统安装、网络配置与 Debian 政策手册，是 Linux 运维方法论的可靠来源。
- **适合人群**：Debian/Ubuntu 系运维
- **获取渠道**：[Debian 文档](https://www.debian.org/doc/)

### 13. Ubuntu Server 官方文档

- **编号**：D13　｜　**类型**：发行版文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：Canonical 文档多为 CC BY-SA 类（以站点页脚为准）；Ubuntu 名称与商标受 Canonical 商标政策约束。
- **主要内容**：服务器安装、MAAS、LXD、云镜像、安全加固与 LTS 支持政策说明。
- **适合人群**：Ubuntu 服务器运维与云部署
- **获取渠道**：[文档](https://documentation.ubuntu.com/server/)

### 14. 鸟哥的 Linux 私房菜

- **编号**：D14　｜　**类型**：中文教程
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：网站声明为非商业性使用（CC BY-NC-SA 类）：可自由转载但禁止商用、须署名、衍生须同协议；商用出版或商业账号转载需另行授权。
- **主要内容**：中文世界影响最大的 Linux 入门体系：文件权限、Shell、磁盘、进程与服务管理，语言通俗。
- **适合人群**：中文 Linux 初学者与运维入门
- **获取渠道**：[官网](https://linux.vbird.org/)


## E. 计算机网络与存储（8 项）

RFC 标准、Web 技术文档、数据库官方文档与存储行业规范。

### 1. IETF RFC 文档（RFC Editor）

- **编号**：E1　｜　**类型**：互联网标准文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：Trust Legal Provisions (TLP-5)：可自由下载、复制、全文分发与翻译，但不得修改后仍称 RFC，须保留 IETF 声明、注明 RFC 编号与出处；文档内代码组件按 Revised BSD 授权。
- **主要内容**：TCP/IP、HTTP/1.1、HTTP/2、HTTP/3、QUIC、TLS、DNS 等一切互联网协议的原始规范，权威性与引用价值最高。
- **适合人群**：网络工程师、协议实现者、标准研究者
- **获取渠道**：[RFC Editor](https://www.rfc-editor.org/) ｜ [使用说明](https://www.rfc-editor.org/series/rfc-use/)

### 2. MDN Web Docs

- **编号**：E2　｜　**类型**：Web 技术文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：文档 CC BY-SA 2.5+（署名 + 衍生同协议）；2010-08-20 之后的代码示例为 CC0 公有领域，可无条件使用——文档与代码的许可需分开处理。
- **主要内容**：HTML/CSS/JavaScript、HTTP、Web API、WebAssembly、浏览器兼容性的事实标准参考，含中文版。
- **适合人群**：前端与全栈工程师
- **获取渠道**：[MDN](https://developer.mozilla.org/) ｜ [许可说明](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license)

### 3. W3C 标准与文档

- **编号**：E3　｜　**类型**：标准文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：W3C Document License：允许复制与分发，须注明 W3C 与文档链接；W3C 商标与 Logo 不在授权内。
- **主要内容**：Web 平台标准原文，涵盖 DOM、CSS 规范、可访问性（WCAG）与 WebRTC 等。
- **适合人群**：前端工程师、标准合规与无障碍改造
- **获取渠道**：[W3C](https://www.w3.org/)

### 4. Cloudflare 学习中心与博客

- **编号**：E4　｜　**类型**：企业技术内容
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：版权归 Cloudflare；允许注明出处引用与摘要，整篇转载/翻译需授权；品牌与 Logo 需单独授权。
- **主要内容**：CDN、DNS、TLS/SSL、DDoS、HTTP 演进与网络基础概念的图解式讲解，通俗易懂，常被引用。
- **适合人群**：网络入门、运维与产品侧
- **获取渠道**：[学习中心](https://www.cloudflare.com/learning/) ｜ [博客](https://blog.cloudflare.com/)

### 5. High Performance Browser Networking（免费在线版）

- **编号**：E5　｜　**类型**：技术书籍（在线免费）
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：版权归作者 Ilya Grigorik 与 O'Reilly；在线免费阅读，但转载、翻译、再分发需授权。
- **主要内容**：TCP/UDP/TLS 优化、HTTP 各版本、移动网络与浏览器网络栈的性能实践，是网络性能领域的经典。
- **适合人群**：后端与前端性能优化工程师
- **获取渠道**：[在线版](https://hpbn.co/)

### 6. Wireshark 用户指南与 Wiki

- **编号**：E6　｜　**类型**：开源项目文档
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：文档多为 GFDL / GPL 类许可（以站点声明为准）；Wireshark 本体为 GPL-2.0+。
- **主要内容**：抓包分析、协议解析、显示过滤器与统计功能说明，网络排障实战必备。
- **适合人群**：网络排障与安全分析人员
- **获取渠道**：[用户指南](https://www.wireshark.org/docs/)

### 7. SNIA（全球网络存储工业协会）词典与白皮书

- **编号**：E7　｜　**类型**：行业标准资料
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：免费下载与引用，须注明 SNIA 出处；不可未经许可转售或改署名再分发。
- **主要内容**：存储术语标准词典、NVMe / NVMe-oF / Zoned Storage / SMB 等规范的科普与白皮书，术语定义权威。
- **适合人群**：存储工程师、技术写作者
- **获取渠道**：[SNIA 词典](https://www.snia.org/education/dictionary)

### 8. 维基百科网络与存储条目（TCP/IP、RAID、NVMe 等）

- **编号**：E8　｜　**类型**：百科条目
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：CC BY-SA 4.0（署名 + 衍生同协议），链接回原文即可满足署名要求。
- **主要内容**：协议历史、原理概览与对比表格，适合作为技术文章的"背景与定义"来源。
- **适合人群**：所有内容创作者
- **获取渠道**：[中文站](https://zh.wikipedia.org/wiki/TCP/IP%E5%8D%8F%E8%AE%AE%E6%97%8F)


## F. 数据集与评测基准（5 项）

预训练语料、指令数据集与公开基准，注意每份数据自带独立许可。

### 1. Common Crawl

- **编号**：F1　｜　**类型**：公开语料
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：数据免费开放，但受使用条款（Terms of Use）约束：可抓取、可再分发并注明出处；具体子集内容版权归原站点，商用需自行做合规评估。
- **主要内容**：PB 级网页爬取语料，几乎所有开源 LLM 预训练数据的源头，提供 WARC/WET/WAT 多种格式。
- **适合人群**：预训练数据构建者
- **获取渠道**：[官网](https://commoncrawl.org/)

### 2. Hugging Face Datasets Hub

- **编号**：F2　｜　**类型**：数据集平台
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：每个数据集自带 license 卡片，许可各不相同（Apache-2.0 / CC / ODC-BY / 自定义 / 未知），必须逐项核对后再使用与转载。
- **主要内容**：数十万数据集的统一检索与加载入口，涵盖预训练语料、指令数据、多模态与评测集。
- **适合人群**：所有做数据与评测的人
- **获取渠道**：[Datasets](https://huggingface.co/datasets)

### 3. The Pile

- **编号**：F3　｜　**类型**：公开语料
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：整体为可自由用于研究的集合，但由 20+ 个子集拼成，各子集许可不一，商用前需逐子集核对。
- **主要内容**：825GB 高质量多领域语料，包含 arXiv、PubMed、GitHub、StackExchange 等，是开源预训练的经典配方。
- **适合人群**：预训练与数据配比研究者
- **获取渠道**：[官网](https://pile.eleuther.ai/)

### 4. BIG-bench（Beyond the Imitation Game Benchmark）

- **编号**：F4　｜　**类型**：评测基准
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：Apache-2.0（代码与任务定义）；任务数据由社区贡献，个别子任务可能有附加条件。
- **主要内容**：200+ 由社区贡献的多样化评测任务，用于衡量 LLM 的涌现能力与局限。
- **适合人群**：模型评测与能力研究者
- **获取渠道**：[GitHub](https://github.com/google/BIG-bench)

### 5. MLPerf（MLCommons）

- **编号**：F5　｜　**类型**：行业基准
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：基准规范与结果可引用，但结果发布须遵守 MLPerf 提交规则；MLPerf 商标与 Logo 使用需授权。
- **主要内容**：训练与推理性能的行业标准基准（含 MLPerf Inference 的 LLM 场景），是硬件与引擎选型的重要参考。
- **适合人群**：做硬件选型与性能对比的技术决策者
- **获取渠道**：[官网](https://mlcommons.org/benchmarks/)


## G. 配图 / 图标 / 字体素材（5 项）

用于转载文章配图、图表与排版的高自由度素材来源。

### 1. Wikimedia Commons

- **编号**：G1　｜　**类型**：图片素材库
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：逐文件核对：CC BY-SA / CC BY / 公有领域 等多种并存，下载页会标注具体许可与署名要求。
- **主要内容**：数千万张自由授权图片、图表与摄影作品，涵盖技术示意图与硬件实拍。
- **适合人群**：需要配图的内容创作者
- **获取渠道**：[Commons](https://commons.wikimedia.org/)

### 2. Unsplash / Pexels

- **编号**：G2　｜　**类型**：图片素材库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：各自自有许可（Unsplash License / Pexels License）：免费商用、无需署名，但禁止未经改动直接转售。
- **主要内容**：高质量摄影素材，适合文章头图与场景配图。
- **适合人群**：需要商业可用配图的运营与作者
- **获取渠道**：[Unsplash](https://unsplash.com/) ｜ [Pexels](https://www.pexels.com/)

### 3. Lucide / Feather Icons

- **编号**：G3　｜　**类型**：图标库
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：MIT / ISC（宽松，可商用可改写）。
- **主要内容**：线条风开源图标集，适合文档、PPT 与网页 UI。
- **适合人群**：所有内容与技术文档作者
- **获取渠道**：[Lucide](https://lucide.dev/) ｜ [Feather](https://feathericons.com/)

### 4. Mermaid

- **编号**：G4　｜　**类型**：图表工具
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：MIT。
- **主要内容**：用类 Markdown 文本生成流程图、时序图、架构图与甘特图，GitHub 与多数文档平台原生支持。
- **适合人群**：需要画架构与流程图的技术写作者
- **获取渠道**：[官网](https://mermaid.js.org/)

### 5. 思源黑体 / Noto Sans SC

- **编号**：G5　｜　**类型**：开源字体
- **许可等级**：🟢 宽松可商用
- **许可 / 版权说明**：SIL Open Font License 1.1：可自由使用、嵌入与商用；若修改字体再分发需改用其他名称并保留许可。
- **主要内容**：Adobe 与 Google 联合开源的中文字体，字重齐全，解决中文排版与截图字体授权问题。
- **适合人群**：需要做图、排版与视频封面的创作者
- **获取渠道**：[思源黑体](https://github.com/adobe-fonts/source-han-sans)


## H. 中文内容与社区（转载风险区）（5 项）

中文技术内容传播价值高，但许可最容易被忽略，务必逐项确认。

### 1. 阮一峰《科技爱好者周刊》与网络日志

- **编号**：H1　｜　**类型**：中文技术博客
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：版权声明明确为「自由转载-非商用-非衍生-保持署名（CC BY-NC-SA 类）」：可转载但禁止商用、须完整署名、衍生须同协议；商业公众号使用需另行授权。
- **主要内容**：每周科技与开源项目推荐，覆盖 AI、工具与工程实践，是国内转载率最高的中文技术来源之一。
- **适合人群**：中文技术读者与内容运营
- **获取渠道**：[官网](https://www.ruanyifeng.com/blog/)

### 2. Datawhale / 中文开源学习组织

- **编号**：H2　｜　**类型**：中文开源教程
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：各仓库许可不统一（Apache-2.0 与 CC BY-NC-SA 均有），以每个仓库 LICENSE 为准。
- **主要内容**：开源协作式中文教程与学习路线，覆盖机器学习、LLM、数据工程与 MLOps。
- **适合人群**：中文学习者、高校与培训场景
- **获取渠道**：[GitHub 组织](https://github.com/datawhalechina)

### 3. 阿里云开发者社区 / 腾讯云开发者 / 美团技术团队

- **编号**：H3　｜　**类型**：企业技术博客
- **许可等级**：🟡 需署名 / 有限制
- **许可 / 版权说明**：通常仅提供站内转载机制：须保留原文链接、作者与出处，不得断章取义；商业用途或站外整篇转载建议先取得书面同意。各站声明不同，需逐一确认。
- **主要内容**：国内大厂的一手工程实践：容器化、存储、数据库、大模型落地与大规模集群经验。
- **适合人群**：关注国内工程落地的架构师与工程师
- **获取渠道**：[阿里云开发者](https://developer.aliyun.com/) ｜ [美团技术团队](https://tech.meituan.com/)

### 4. InfoQ / CSDN / 掘金

- **编号**：H4　｜　**类型**：中文技术媒体
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：默认「保留所有权利」：即使注明出处也不等于获得授权；须通过站内转载功能或联系作者/平台取得书面许可。
- **主要内容**：中文技术资讯与实战文章集散地，信息密度高但版权风险最大。
- **适合人群**：需引用国内技术动态的从业者
- **获取渠道**：[InfoQ](https://www.infoq.cn/)

### 5. 知乎专栏 / 公众号原创文章

- **编号**：H5　｜　**类型**：中文 UGC 内容
- **许可等级**：🔴 需授权 / 禁止转载
- **许可 / 版权说明**：默认版权归作者所有、禁止转载；站内"规范转载"功能或作者授权书是唯一安全路径。
- **主要内容**：从业者的经验复盘与观点文章，引用价值高但法律风险最高。
- **适合人群**：所有做中文内容整合的人
- **获取渠道**：[知乎](https://www.zhihu.com/)


---

## 附录 A：许可合规速查表

| 许可类型 | 可商用 | 需署名 | 衍生需同协议 | 可修改 | 典型来源 |
|---|---|---|---|---|---|
| CC0 / 公有领域 | ✅ | 否 | 否 | ✅ | SQLite 官方文档、MDN 代码示例、Wikipedia 元数据 |
| MIT / BSD / PostgreSQL License | ✅ | 保留版权与许可文本 | 否 | ✅ | llama.cpp、Ollama、ONNX Runtime、nginx 文档 |
| Apache-2.0 | ✅ | 保留 LICENSE + NOTICE、标注改动 | 否 | ✅ | vLLM、SGLang、Transformers、Qwen3、OLMo 2 |
| GPL-2.0（文档/代码） | ✅ | ✅ | ✅ 强 copyleft | ✅ | Linux 内核文档、man-pages |
| GFDL 1.3 | ✅ | ✅ | ✅ | ✅ | Arch Wiki、部分 Debian 文档 |
| CC BY 4.0 | ✅ | ✅ | 否 | ✅ | Kubernetes 官方文档、Distill.pub |
| CC BY-SA 4.0 | ✅ | ✅ | ✅ 衍生须同协议 | ✅ | 维基百科、MDN 文档、Red Hat 文档 |
| CC BY-NC-SA / BY-NC-ND | ❌ 仅限非商业 | ✅ | ✅ | ND 变体禁止改写 | 阮一峰周刊、部分中文教程 |
| 自定义模型许可（Llama / Gemma / Qwen Research） | 部分允许，附规模与命名限制 | ✅ 且常含品牌露出要求 | 视具体条款 | ✅ | 须逐模型核对 model card |
| arXiv 默认非独占许可 | ❌ 全文转载需作者授权 | — | — | ❌ | 仅 CC BY / CC0 版本可自由转载 |
| 默认版权（知乎 / CSDN / 商业博客） | ❌ 须书面授权 | — | — | ❌ | 站内转载功能或联系作者 |
| IETF TLP-5（RFC） | ✅ 可复制 / 分发 / 翻译全文 | ✅ 注明 IETF 与 RFC 编号 | — | ❌ 不得修改后仍称 RFC | RFC Editor；代码组件按 Revised BSD |

## 附录 B：转载五条红线

1. **权重开放 ≠ 开源。** Llama 4（700M MAU 门槛 + 必须展示 "Built with Llama" + 衍生模型须以 Llama 开头命名）、Gemma 自定义条款、部分 Qwen 尺寸的 Qwen Research License（非商用）——均非 OSI 认可许可，商用前必须逐模型看 model card。
2. **arXiv 论文默认不可全文转载。** 默认 "perpetual non-exclusive license" 下版权仍归作者 / 出版方；只有摘要页显式标注 CC BY / CC BY-SA / CC0 的版本才可自由转载。安全做法：引用观点、重画图表、注明 arXiv 编号。
3. **商标、Logo、网站外观不在 CC 授权范围内。** Mozilla、Red Hat、NVIDIA、Cloudflare 等品牌标识需单独授权。
4. **中文社区内容默认禁止转载。** 知乎、CSDN、掘金默认"保留所有权利"，注明出处不等于获得授权。
5. **数据集许可独立于模型许可。** 模型是 Apache-2.0 不代表训练语料可再分发；Common Crawl、The Pile 由多子集拼成，需逐子集核对。

## 附录 C：署名模板（可直接套用）

**CC BY-SA 4.0（维基百科 / MDN / Red Hat 文档）**

```
本文部分内容来自「<文章标题>」（<原文 URL>），作者 <作者 / Mozilla Contributors>,
采用 CC BY-SA 4.0 许可发布，本文沿用相同许可。
（如有改动已在此说明：<改动说明>）
```

**CC BY-NC-SA（阮一峰周刊等）**

```
本文转载自《<标题>》（<原文 URL>），作者 <作者>，
采用「自由转载-非商用-非衍生-保持署名（CC BY-NC-SA）」许可，仅作非商业用途。
```

**Apache-2.0 / MIT 代码与文档**

```
本文代码/内容基于 <项目名>（<仓库 URL>）修改，Copyright <年份> <版权方>，
以 Apache License 2.0 发布；修改处已标注。完整许可文本见 https://www.apache.org/licenses/LICENSE-2.0
```

**RFC / 标准文档**

```
本节译自 IETF RFC <编号>（<标题>），版权归 IETF Trust，按 Trust Legal Provisions 复制与翻译，
未作修改。原文：https://www.rfc-editor.org/rfc/rfc<编号>
```
