# AI 大模型 + 服务器/计算机底层技术｜可转载资源精选清单（21 项）

> 编制日期：2026-10-13　|　用途：内容平台转载 / 引用　|　筛选口径：权威、公开、许可清晰优先
> 许可标签：🟢 宽松可商用 · 🟡 需署名或有附加条件 · 🔴 仅允许署名引用或需授权 · ⚠️ 许可不明确需核实
> 完整版（79 项）见 `RESOURCES.md` / 站点「资源库」页。

---

## 大模型原理与算法（4 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **Stanford CS336: Language Modeling from Scratch** | 大学课程（课件 + 作业 + 录像） | 从零构建语言模型的完整路径：tokenizer、Transformer 架构、训练系统、Scaling Law、数据清洗去重，到 SFT 与 RL 对齐；5 个重编程作业含 Triton 版 FlashAttention-2 实现。 | 进阶 / 工程 / 研究 | [课程主页](https://cs336.stanford.edu/)、[GitHub](https://github.com/stanford-cs336)、[YouTube 录像](https://www.youtube.com/playlist?list=PLoROMvodv4rMqXOcazWaTUHhq-yembLCV) | 版权归 Stanford · 需署名引用｜课件可公开下载，但整篇转载或本地化翻译建议先联系课程组；录像适用 YouTube 标准条款（可嵌入，不可下载后再分发）。 |
| **Harvard NLP《The Annotated Transformer》** | 教程 + 可执行代码 | 对 Transformer 论文的逐行实现注解，覆盖编码器 / 解码器、多头注意力、位置编码与训练期注意力可视化。 | 入门 / 进阶 | [网页版](https://nlp.seas.harvard.edu/annotated-transformer/)、[GitHub](https://github.com/harvardnlp/annotated-transformer) | 代码 MIT ｜ 文章 CC BY-SA 4.0（需核实）｜⚠️ 需核实：代码仓库为 MIT（Copyright 2018 Alexander Rush），但网页文章未给出统一许可声明，通行按 CC BY-SA 4.0 处理。风险点——文章与代码许可分离，转载前建议只引用观点与代码片段并保留原文链接。 |
| **FlashAttention（论文 + 开源实现）** | 论文 + 开源项目 | IO 感知的精确注意力算法，把注意力显存占用从 O(N²) 降到 O(N)，是现代训练与推理栈的性能基石。 | 研究 / 工程 | [arXiv:2205.14135](https://arxiv.org/abs/2205.14135)、[GitHub](https://github.com/Dao-AILab/flash-attention) | 论文版权归作者 ｜ 代码 BSD-3-Clause｜论文部分：arXiv 默认仅授予非独占传播许可，版权仍归作者 → 只能署名引用观点、重画图表并注明编号，不可全文转载；代码部分：BSD-3-Clause，保留声明即可自由使用与改写。 |
| **Datawhale《Happy-LLM》** | 中文开源教程 | 从 NLP 基础、Transformer 架构、预训练语言模型，一路讲到手写 LLaMA2、预训练与 LoRA / QLoRA 微调，再到 RAG 与 Agent。 | 入门 / 进阶（中文读者） | [GitHub](https://github.com/datawhalechina/happy-llm)、[Datawhale 社区](https://www.datawhale.cn/) | Apache-2.0｜可商用、可改编、可翻译，需保留 LICENSE 与版权声明并标注修改。注意 PDF 版预置了 Datawhale 开源水印（用于防止营销号倒卖），不得抹除。 |

## 训练与微调工具（4 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **PyTorch（官方文档与教程）** | 开源框架 + 官方文档 / 教程 | 张量计算与 autograd、分布式训练（DDP / FSDP）、编译优化；官方 Tutorials 覆盖从入门到自定义 CUDA 扩展。 | 入门 → 工程 | [官方文档](https://pytorch.org/docs/stable/index.html)、[官方教程](https://pytorch.org/tutorials/)、[GitHub](https://github.com/pytorch/pytorch) | BSD-3-Clause（代码与文档一并覆盖）｜保留版权声明与免责条款即可自由转载、改编、商用，无 copyleft 传染性。 |
| **Hugging Face Transformers / PEFT / TRL** | 开源库 + 官方文档 | 模型与 tokenizer 加载、LoRA / QLoRA 高效微调、SFT 与 RLHF 训练管线，覆盖绝大多数开源 LLM 与中文模型。 | 进阶 / 工程 | [官方文档](https://huggingface.co/docs)、[Transformers](https://github.com/huggingface/transformers)、[PEFT](https://github.com/huggingface/peft) | Apache-2.0｜可商用、可二次分发，需保留 LICENSE 与 NOTICE 并标注修改。 |
| **Datawhale《self-llm》开源大模型食用指南** | 中文开源教程（Jupyter Notebook） | 面向国内网络环境，按模型逐条走通「环境配置 → 权重下载 → 推理 → LoRA / 全参微调 → 部署」，覆盖 50+ 国内外 LLM / MLLM。 | 入门 / 工程（中文读者） | [GitHub](https://github.com/datawhalechina/self-llm) | Apache-2.0｜教程本身可商用、可改编；⚠️ 但教程涉及的模型权重须另行遵循各自许可——风险点：权重开放 ≠ 开源，Llama / Gemma / 部分 Qwen 尺寸采用自定义许可，不等于 Apache-2.0。 |
| **OLMo 2（Allen Institute for AI）** | 开源模型 + 训练代码 + 数据配方 | 真正全栈开放的模型：权重、训练代码、训练日志、数据配方与评测全部公开，是可合法复现预训练研究的稀缺样本。 | 研究 / 工程 | [GitHub](https://github.com/allenai/OLMo)、[AI2 官网](https://allenai.org/olmo) | Apache-2.0（含模型权重）｜无月活门槛、无强制品牌署名、无衍生命名限制，与 Llama / Gemma 的自定义许可形成鲜明对比。 |

## 推理部署与优化（3 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **vLLM** | 开源推理引擎 + 论文 | PagedAttention 显存分页 + 连续批处理 + OpenAI 兼容 API，是当前生产部署的事实标准。 | 工程 | [官方文档](https://docs.vllm.ai/)、[GitHub](https://github.com/vllm-project/vllm)、[arXiv:2309.06180](https://arxiv.org/abs/2309.06180) | 代码与文档 Apache-2.0 ｜ 论文版权归作者｜代码与文档可自由使用；论文仅可署名引用观点与结论，不可全文转载。 |
| **llama.cpp** | 开源推理运行时 | 纯 C / C++ 实现 + GGUF 量化，让大模型在 CPU、树莓派、手机与边缘设备上本地运行。 | 入门 / 工程 | [GitHub](https://github.com/ggml-org/llama.cpp) | MIT｜保留版权声明即可自由使用、修改、商用、再分发，是自由度最高的开源许可之一。 |
| **NVIDIA TensorRT-LLM** | 开源优化库 + 官方文档 | 面向 NVIDIA GPU 的算子融合、FP8 / INT4 量化、in-flight batching，用于压榨单卡吞吐。 | 工程 / 研究 | [GitHub](https://github.com/NVIDIA/TensorRT-LLM)、[NVIDIA 文档](https://nvidia.github.io/TensorRT-LLM/) | 代码 Apache-2.0 ｜ 文档需核实｜⚠️ 需核实：代码仓库明确 Apache-2.0，但 NVIDIA 开发者博客与文档通常保留版权。风险点——摘文档段落前需单独确认，商标与 Logo 更不在许可范围内。 |

## 服务器硬件与运维（4 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **Linux 内核官方文档** | 官方文档 | 内核子系统、驱动模型、sysfs / ABI 稳定性规则、调度与内存管理的权威说明，是理解服务器底层的第一手资料。 | 工程 / 研究 | [docs.kernel.org](https://docs.kernel.org/)、[GitHub](https://github.com/torvalds/linux) | GPL-2.0（文档随源码）｜可自由复制、修改、分发，但衍生文档须沿用 GPL-2.0 并标注修改；适合引用与改写，不适合并入专有内容。 |
| **Kubernetes 官方文档** | 开源项目文档（含中文版） | 概念、任务、教程与完整 API 参考，容器编排与集群运维的权威规范。 | 入门 → 工程 | [英文站](https://kubernetes.io/docs/)、[中文站](https://kubernetes.io/zh-cn/docs/) | CC BY 4.0｜署名即可自由使用与改编，衍生作品不要求沿用同协议，商用友好度极高。 |
| **Red Hat 产品文档（RHEL / OpenShift）** | 厂商官方文档 | 系统管理、性能调优、SELinux、OpenShift 运维的体系化手册，企业级 Linux 运维标杆。 | 工程 | [docs.redhat.com](https://docs.redhat.com/) | CC BY-SA 3.0 Unported（部分新文档为 4.0）｜以每篇文档页脚 Legal Notice 为准。需署名 + 衍生作品必须沿用同协议 + 分发时提供原版 URL；Red Hat 商标与 Logo 需单独授权。若平台内容需独家版权，请勿直接改编。 |
| **SQLite 官方文档** | 数据库文档（公有领域） | 从 SQL 语法到文件格式、WAL 机制、虚拟表与内部结构，篇幅精炼且技术密度极高。 | 入门 → 工程 | [sqlite.org](https://www.sqlite.org/docs.html) | 公有领域（Public Domain）｜无需署名即可自由复制、修改、商用，是自由度最高的技术文档之一。⚠️ 需核实：官方声明部分文档段落与测试逻辑受其他开源许可约束，整站镜像前建议抽查具体页面。 |

## 计算机网络与存储（3 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **IETF RFC 文档** | 互联网标准文档 | TCP/IP、HTTP、TLS、BGP 等协议的一手定义，网络领域最高权威性来源，社区另有大量中文译本。 | 进阶 / 工程 / 研究 | [RFC Editor](https://www.rfc-editor.org/)、[IETF Datatracker](https://datatracker.ietf.org/) | IETF Trust Legal Provisions｜可自由复制、分发、翻译与引用；但不得修改后仍称 RFC，且须保留 IETF 声明与原始出处。 |
| **MDN Web Docs** | Web 技术文档（含中文版） | HTML / CSS / JS、HTTP、Web API 与浏览器行为的权威参考，前端与网络协议交叉知识的首选来源。 | 入门 → 工程 | [MDN 中文](https://developer.mozilla.org/zh-CN/)、[MDN 英文](https://developer.mozilla.org/en-US/) | 正文 CC BY-SA 2.5+ ｜ 代码示例 CC0｜2010-08-20 之后的代码示例为 CC0，可无条件使用；正文有 ShareAlike 传染性。风险点——文档许可与代码许可分离，必须分别标注，不能一概而论。 |
| **Cloudflare 学习中心与博客** | 企业技术内容 | 以图解方式讲解 CDN、DNS、TLS 1.3、QUIC / HTTP3、DDoS 防护，是网络科普的高质量二手源。 | 入门 / 进阶 | [Cloudflare Learning](https://www.cloudflare.com/learning/) | 默认保留版权（需核实）｜⚠️ 需核实：站点未标注 CC 许可，默认保留所有权利。风险点——内容质量高易被误判为可转载，建议仅引用观点并链接原文，或先邮件获取书面授权。 |

## 数据集、基准与素材（补充类别）（3 项）

| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |
|---|---|---|---|---|---|
| **Common Crawl** | 公开语料数据集 | 按月发布的超大规模网页抓取语料（PB 级），是绝大多数开源 LLM 预训练数据的基础来源。 | 研究 / 工程 | [commoncrawl.org](https://commoncrawl.org/) | 开放获取但非 CC 授权｜数据可免费下载与使用，须遵守其 Terms of Use。⚠️ 需核实：语料中可能含个人信息与受版权保护内容，再分发原始语料风险高——建议只分发索引或过滤后的子集，并注明来源与抓取批次。 |
| **BIG-bench（Beyond the Imitation Game Benchmark）** | 开源评测基准 | 由数百个社区贡献任务组成的大模型能力评测集，用于系统性衡量模型的涌现能力与局限。 | 研究 | [GitHub](https://github.com/google/BIG-bench) | Apache-2.0｜可商用、可改编，需保留 LICENSE 与版权声明。 |
| **思源黑体 / Noto Sans SC** | 开源字体（SIL OFL） | Adobe 与 Google 联合开发的开源中文字体，字重齐全、简繁覆盖完整，解决中文排版与配图的字体授权问题。 | 全员 | [Google Fonts](https://fonts.google.com/specimen/Noto+Sans+SC)、[GitHub](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1｜个人与企业均可免费商用，成品（海报、网页、视频）无需署名；可修改、可嵌入、可随产品分发。红线——不得单独售卖字体文件，修改后不得沿用保留字体名（Reserved Font Name "Source"），衍生字体须同样以 OFL 开源。 |

---

## 转载注意事项小结

**1. 署名方式：按许可类型分别处理，不要一套模板走天下。** CC 家族（MDN、维基百科、Red Hat 文档、阮一峰周刊）署名需含「作者/机构 + 原标题 + 许可名称 + 原文链接 + 是否修改」五要素；Apache-2.0 / MIT / BSD 类（Transformers、vLLM、llama.cpp、Happy-LLM）必须原样保留 LICENSE 全文与版权声明行，并标注你对文件做了哪些修改；公有领域（SQLite）法律上无署名义务，但出于可信度仍建议标注来源版本与日期；字体（OFL）成品无需署名，但分发字体源文件时必须附带 OFL 全文。

**2. 原文链接必须保留且可点击。** CC 家族的署名要求核心就是「指向原始版本的可访问链接」；Red Hat 文档更在条款中明确要求分发改编版时提供原版 URL。不要只写「来源：某网站」而省略链接，也不要用跳转或短链隐藏真实出处。

**3. 二次分发的三条硬限制。** ① CC BY-SA / GPL 文档有传染性：改编作品必须以同一协议开放（MDN、Red Hat 文档、Linux 内核文档），若平台内容需要独家版权，请改为「引用 + 链接」而非直接改编。② NC（非商业）条款：CC BY-NC-SA 内容在带广告、付费墙或企业营销号的平台上使用即构成商用，需另获授权。③ ND（禁止衍生）条款：不得改写或节选重组，只能整体原样转载。

**4. arXiv 论文 ≠ 可转载。** arXiv 上多数预印本只在摘要页标注许可（部分为 CC BY / CC0），正文与图表的版权仍归作者。安全做法：引用编号与结论、用自己的话转述、重画图表并注明「改绘自 arXiv:XXXX.XXXXX」，不要直接搬运论文 PDF 或原文插图。

**5. 文档许可与代码许可常不相同，必须分开核对。** 典型如 MDN：正文 CC BY-SA 2.5+，2010-08-20 之后的代码示例却是 CC0；Annotated Transformer：代码 MIT，网页文章许可未明示。摘取代码块时按代码许可处理，摘取解释性文字时按文档许可处理。

**6. 模型权重不是开源软件。** Llama 4 Community License 有月活用户门槛、强制 "Built with Llama" 署名、衍生模型命名限制；Gemma 与部分 Qwen 尺寸采用 Research License——这些都不是 OSI 许可。清单中优先收录 Apache-2.0 权重的 OLMo 2 正是为了规避这一风险。引用教程（如 self-llm）时，教程本身 Apache-2.0 可自由使用，但教程涉及的模型权重须另行遵守各自许可。

**7. 中文源风险最高，别把「注明出处」当授权。** 知乎专栏、公众号原创、CSDN / 掘金默认「保留所有权利」，未标注许可即默认不可转载；企业技术博客（阿里云、美团技术团队等）通常也保留版权。只有明确标注 CC 许可的中文内容（阮一峰周刊 CC BY-NC-SA、Datawhale 系列 Apache-2.0）才可依条款使用。

**8. 翻译与摘录同样受约束。** 翻译权是著作权的一项，CC BY-SA 内容翻译后仍须署名原作者并沿用同协议；大段连续摘录（尤其是原文章 30% 以上）即便注明出处也可能构成侵权，建议以「观点转述 + 关键引语 + 原文链接」的方式处理。

**9. 商标、Logo 与截图不在内容许可内。** 转载 Red Hat 文档不等于可以使用 Red Hat 商标；产品截图常同时包含商标与 UI 版权，须单独确认。

**10. 许可会变，留好证据。** 上游项目换许可（如 Redis、Terraform 前例）并不罕见。转载时截图保存源页面的许可声明页并记录抓取日期，一旦上游变更，可证明转载当时的授权状态。

### 合规速查：三步判断能否转载

1. **找许可声明**——页面页脚 / 仓库 LICENSE / 文档 Legal Notice。找不到 → 默认不可转载，走邮件授权。
2. **看条款类型**——CC 系列查 BY / SA / NC / ND 四个要素；开源项目查 OSI 许可名；论文查摘要页许可标注。
3. **定使用方式**——原样转载 / 改编 / 翻译 / 商用，逐项对照上述限制，确认署名要素与链接是否齐备。

---

> 本清单许可信息基于 2026-10-13 的公开声明核实，仅供合规参考，不构成法律意见。上游许可可能变更，正式商用前建议再次核对原始许可页面。
