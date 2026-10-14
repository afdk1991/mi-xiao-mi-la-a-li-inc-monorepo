# AI 大模型与服务器技术 · 完整正文合集

> 本文件是**正文全文**，不是链接清单。所有内容可直接阅读、复制、转载。
> 由 `export-content.js` 从站点数据源 `assets/articles.js`（原创）+ `assets/fetched.js`（官方原文转载）自动导出，与网站页面同源。

**统计**：共 13 篇　·　原创 5 篇　·　官方原文转载 8 篇　·　正文约 123417 字

## 目录
### 一、原创科普（5 篇）

1. 一文读懂 Transformer 与注意力机制：大模型是怎么"理解"文字的　（`#transformer`）
2. 从预训练到微调：开源大模型训练工具链全景与选型　（`#training`）
3. 让大模型跑得更快更省：推理部署与量化优化实战指南　（`#inference`）
4. 为大模型选服务器：GPU、显存、CPU 与散热运维要点　（`#hardware`）
5. 大模型背后的网络与存储：数据怎么来、怎么存、怎么传　（`#network`）

### 二、官方原文转载（8 篇）

6. nginx 新手指南：启动停止、配置结构与静态/代理服务（官方文档全文）　（`#nginx-beginner`）
7. SQLite 官方：什么场景下该用 / 不该用 SQLite（公有领域全文）　（`#sqlite-whentouse`）
8. PostgreSQL 官方：PostgreSQL 是什么（PostgreSQL License 全文）　（`#postgres-whatis`）
9. Kubernetes 官方中文：集群组件架构（CC BY 4.0 全文）　（`#k8s-components`）
10. ArchWiki：systemd 系统与服务管理（GFDL 1.3 全文节选）　（`#archwiki-systemd`）
11. RFC 9110：HTTP 语义（IETF 标准全文节选）　（`#rfc9110-http`）
12. vLLM 官方快速上手：离线推理、OpenAI 兼容服务与分布式部署（Apache-2.0 全文）　（`#vllm-quickstart`）
13. PyTorch 官方教程：Learn the Basics（张量 / DataLoader / 神经网络 / 自动求导 / 优化）　（`#pytorch-basics`）

---
<!-- ===== 原创科普 ===== -->

<a id="transformer"></a>
<a id="training"></a>
<a id="inference"></a>
<a id="hardware"></a>
<a id="network"></a>

# 一文读懂 Transformer 与注意力机制：大模型是怎么"理解"文字的

> **原创科普**　·　许可：CC BY 4.0　·　阅读约 约 7 分钟　·　更新 2026-10

**摘要**：从 Token、自注意力、多头机制到位置编码与 Transformer 层骨架，讲清大模型共同的地基。

---

**本文为原创技术科普，采用 CC BY 4.0 许可，可自由转载、改编，仅需注明作者与出处。

## 一、从"看懂词"到"看懂句"

人类阅读时，看到"苹果"会立刻联想到水果或手机品牌，取决于上下文。早期的语言模型（如 Word2Vec）把每个词变成一个固定向量（词嵌入，Embedding），但同一个词在任何句子里都是同一个向量，无法区分歧义。

大模型的突破在于：每个词的含义，由它所处的整句话动态决定**。实现这一点的核心结构，就是 2017 年论文《Attention Is All You Need》提出的 Transformer，以及其中的自注意力机制（Self-Attention）。

## 二、Token：模型眼中的"字"

模型并不直接读汉字或英文单词，而是先把文本切分成 Token——可以是一个字、一个词，或词的一部分。例如"人工智能"可能被切成 2~3 个 Token。每个 Token 映射为一个高维向量（如 4096 维），这一步就是 Embedding。

```
输入："大模型很好用"
Token 化：[大][模型][很][好用]
Embedding：每个 Token → 一个 4096 维向量
```

## 三、自注意力：让每个词"环顾四周"

自注意力的本质是：对句子里的每一个词，计算它与其他所有词的"相关程度"，再按相关程度把其他词的信息加权汇总到自己身上。

它用三个向量完成这件事：

- **Q（Query，查询）**："我在找什么信息？"
- **K（Key，键）**："我能提供什么信息？"
- **V（Value，值）**："我实际携带的信息是什么？"
计算分三步：

- 用 Q 与每个词的 K 做点积，得到"关注度分数"；
- 除以 √d（d 是向量维度）做缩放，防止数值过大；
- 用 Softmax 归一化成权重，再对 V 加权求和。

```
Attention(Q,K,V) = Softmax( Q·Kᵀ / √d ) · V
```

举例，句子"猫坐在垫子上，它很软"：处理"它"这个词时，注意力会高度集中在"垫子"上，于是模型把"垫子"的特征融合进"它"的表示里，正确消解了指代。

## 四、多头注意力：从多个角度同时看

单一注意力只能捕捉一种关系（比如主谓）。Transformer 把注意力复制成若干份，称为"头"（Head），每个头用不同的参数关注不同模式——有的头看语法结构，有的头看语义搭配。最后把所有头的结果拼接、线性变换，得到更丰富的表示。主流模型通常有 32~128 个头。

## 五、位置编码：告诉模型"顺序"

注意力本身是无序的（把句子打乱，每个词算出的结果不变）。但语言高度依赖顺序，因此必须注入位置信息。早期用正弦/余弦函数生成固定位置向量（位置编码，Positional Encoding），加在 Embedding 上；现代模型多用"旋转位置编码（RoPE）"，让位置关系随维度旋转，效果更好且支持长上下文。

## 六、Transformer 的完整骨架

一个标准层包含：

- 多头自注意力（捕捉词间关系）；
- 残差连接 + 层归一化（LayerNorm，稳定训练，防止梯度消失）；
- 前馈网络（FFN，对每个位置独立做非线性变换，相当于"逐词思考"）；
- 再一次残差 + 层归一化。

```
输出 = LayerNorm( x + Attention(x) )
输出 = LayerNorm( 输出 + FFN(输出) )
```

大模型（如 GPT 系列）只保留解码器（Decoder）部分，并靠"因果掩码"保证生成第 n 个词时只能看到前 n-1 个词，从而实现逐字生成。

## 七、为什么大模型都基于它

- **可并行**：注意力对整句同时计算，比循环网络（RNN）快得多，能利用 GPU 大规模训练；
- **长程依赖**：任意两个词直接相连，不受距离限制；
- **可扩展**：堆叠层数（如 70 层甚至上百层）和参数量（7B~万亿）后，涌现出翻译、推理、代码等能力。

## 八、小结

Transformer 用"自注意力"让每个词动态吸收上下文，用"多头"捕获多维度关系，用"位置编码"保留顺序，再用残差与归一化把几十层叠稳。理解这套机制，就理解了今天所有大模型的共同地基。

可转载说明：本文为原创，转载请保留本段署名（作者：AI 资源站 / 许可：CC BY 4.0），并保留文内公式与示例原貌。

---


# 从预训练到微调：开源大模型训练工具链全景与选型

> **原创科普**　·　许可：CC BY 4.0　·　阅读约 约 7 分钟　·　更新 2026-10

**摘要**：理清预训练/SFT/对齐/领域微调四阶段，拆解 PyTorch、DeepSpeed、PEFT、LLaMA-Factory 等工具分工与选型。

---

**本文为原创技术科普，采用 CC BY 4.0 许可，可自由转载、改编，仅需注明作者与出处。

## 一、先分清四种"训练"

很多人把"训练模型"混为一谈，实际上至少分四个阶段：

- 预训练（Pre-training）**：在海量无标注文本上，让模型学会"预测下一个词"，积累通用语言与世界知识。这是最烧算力的一步，常需数千张 GPU 跑数月。
- **监督微调（SFT，Supervised Fine-Tuning）**：用人工编写的高质量"指令—回答"样例，教模型按人类期望的格式对话。
- **偏好对齐（RLHF / DPO）**：用人类或模型打分，让回答更安全、有用、符合价值观。
- **领域微调（Domain Tuning）**：用行业数据（如医疗、法律）注入垂直知识。
对绝大多数团队而言，**预训练交给大厂，自己只做后三步**即可，成本和门槛都低得多。

## 二、核心框架

- **PyTorch**：事实标准深度学习框架，动态图设计直观，社区生态最全。模型训练脚本几乎都基于它。
- **DeepSpeed（微软）**：解决"一张卡放不下大模型"的问题，核心是可分片优化器状态、梯度、参数的 **ZeRO** 技术，能把训练显存压到原来的几分之一。
- **Megatron-LM（NVIDIA）**：擅长超大规模模型（百亿参数以上）的张量并行与流水线并行。

```
显存不够时的一般路径：
单卡 → 梯度累积 → ZeRO-2 → ZeRO-3 → 张量并行 + 流水线并行
```

## 三、参数高效微调（PEFT）

全量微调要更新全部参数，显存和算力开销极大。**参数高效微调**只训练少量新增参数，冻结原模型：

- **LoRA**：在原有权重旁插入低秩矩阵（如把 4096×4096 的更新近似成 4096×8 与 8×4096 两个小矩阵），训练量骤降，还能为一个基座模型挂载多个"适配器"。
- **QLoRA**：在 LoRA 基础上把基座量化到 4 位，单张消费级显卡也能微调 13B~70B 模型。
- **PEFT 库（Hugging Face）**：把上述方法封装成统一接口，几行代码即可启用。

## 四、开箱即用的工具

- **Hugging Face Transformers / TRL**：加载主流模型、Tokenizer、训练循环一站式；TRL 专门支持 SFT、DPO、PPO 等对齐训练。
- **LLaMA-Factory**：国产明星项目，提供 Web UI 与命令行，支持上百种模型、LoRA/QLoRA、多模态，零代码也能跑通微调。
- **Unsloth**：重写了训练内核，在保持精度下把显存占用和速度优化 2 倍左右，特别适合单卡玩家。

## 五、数据准备要点

微调效果七分靠数据。数据应：

- **格式统一**：常见为 JSONL，每条含 `instruction`（指令）、`input`（可选输入）、`output`（期望回答）；
- **去重与清洗**：剔除低质、重复、含隐私的样例；
- **量不在多而在精**：几百到几千条高质量指令数据，往往胜过几万条噪声数据；
- **防灾难性遗忘**：混合少量通用数据，避免模型忘记原有能力。

## 六、选型建议

场景推荐组合个人/小团队，单张 24G 显卡QLoRA + Unsloth / LLaMA-Factory企业多卡集群DeepSpeed ZeRO-3 + Megatron只想快速出效果、不想写代码LLaMA-Factory Web UI需要精细对齐（更安全有用）TRL（SFT → DPO）

## 七、小结

大模型训练不是"从零造轮子"。预训练交给基础设施雄厚的大厂，多数团队的价值在于：**用 PEFT 方法在开源基座上做高质量 SFT 与对齐，用对工具把显存和人力成本压到最低**。PyTorch + DeepSpeed + PEFT/QLoRA + LLaMA-Factory，是当前最务实的开源训练栈。

可转载说明：本文为原创，转载请保留本段署名（作者：AI 资源站 / 许可：CC BY 4.0），并保留文内表格与示例原貌。

---


# 让大模型跑得更快更省：推理部署与量化优化实战指南

> **原创科普**　·　许可：CC BY 4.0　·　阅读约 约 7 分钟　·　更新 2026-10

**摘要**：讲清 TTFT/吞吐/显存三指标，对比 vLLM、llama.cpp、TensorRT-LLM，拆解量化、KV Cache 与连续批处理。

---

**本文为原创技术科普，采用 CC BY 4.0 许可，可自由转载、改编，仅需注明作者与出处。

## 一、推理与训练有什么不同

训练是"教模型"，需要反向传播、保存全部中间状态，极度吃显存；推理（Inference）是"用模型"**，只需前向计算生成回答，目标是：**延迟低、吞吐高、显存省、成本低**。一个 70B 模型训练要几百张卡，但优化得当后，可在单张消费级显卡上跑推理。

## 二、三个关键指标

- **首字延迟（TTFT）**：用户发问到出现第一个字的时间，影响"响应快不快"的体感；
- **吞吐（Tokens/s）**：单位时间生成多少字，决定能同时服务多少用户；
- **显存占用**：模型权重 + KV Cache 共同决定需要的显卡大小。

## 三、推理引擎选型

- **vLLM**：业界标杆，核心是 **PagedAttention**——像操作系统管理内存分页一样管理 KV Cache，显存利用率大幅提升，并支持"连续批处理（Continuous Batching）"，把多个用户的请求动态拼批，吞吐数倍提升。
- **llama.cpp**：纯 C/C++ 实现，支持 CPU、GPU、Apple 芯片，几乎零依赖，是本地和边缘部署首选，配合 GGUF 量化格式开箱即用。
- **TensorRT-LLM（NVIDIA）**：在 NV 显卡上极致优化，融合算子、量化、In-flight Batching，延迟最低，但仅限 N 卡且配置较复杂。
- **Ollama**：基于 llama.cpp 的"一键本地跑模型"工具，命令行拉取即用，适合个人体验。
- **LMDeploy（上海 AI 实验室）**：国产高性能方案，TurboMind 引擎对量化与吞吐优化出色。

## 四、量化：用精度换显存

模型权重默认用 16 位浮点（FP16/BF16）存储，量化就是把它们压成更低比特：

- **INT8 / FP8**：几乎无损，显存减半，速度提升明显；
- **INT4（GPTQ / AWQ）**：显存降到 1/4，70B 模型可塞进 24G 显卡，精度有轻微下降但日常对话可接受；
- **GGUF 中的 Q4_K_M 等**：llama.cpp 生态的量化等级，按"质量—体积"细分，方便按需选择。

```
70B 模型显存粗略估算：
FP16  ≈ 140 GB（需多卡）
INT4  ≈ 35 GB（单张 48G 卡可跑）
```

## 五、KV Cache 与批处理

生成每个新词都要回顾之前所有词，这些历史中间结果缓存下来就是 **KV Cache**。它的体积随上下文长度线性增长，是长对话的显存杀手。优化手段：

- **PagedAttention / 分页管理**：避免碎片，提高利用率；
- **连续批处理**：不等一个请求跑完再接下一个，而是随时插入新请求，GPU 始终满载；
- **上下文截断与滑动窗口**：限制历史长度，控制缓存上限。

## 六、部署形态

- **本地/私有化**：用 Ollama、llama.cpp，数据不出内网，适合对隐私敏感的政企；
- **云端 API**：用 vLLM、TensorRT-LLM 自建服务，或用厂商 API；
- **边缘/移动端**：量化到 INT4 + llama.cpp，可在笔记本甚至手机跑小模型。

## 七、实战 checklist

- 先量化到 INT4/INT8，显存立刻松绑；
- 优先上 vLLM 或 LMDeploy 拿到连续批处理；
- 设置合理的 `max_model_len` 与并发数，避免 KV Cache 撑爆；
- 用流式输出（Streaming）改善首字体感；
- 监控显存与吞吐，再决定是否上 TensorRT-LLM 进一步压延迟。

## 八、小结

推理优化的主线是：**量化降显存 → 分页管理 KV Cache → 连续批处理提吞吐 → 选对引擎（vLLM / TensorRT-LLM / llama.cpp）**。同一模型，优化前后成本可差数倍，这正是工程落地的关键战场。

可转载说明：本文为原创，转载请保留本段署名（作者：AI 资源站 / 许可：CC BY 4.0），并保留文内公式、表格与清单原貌。

---


# 为大模型选服务器：GPU、显存、CPU 与散热运维要点

> **原创科普**　·　许可：CC BY 4.0　·　阅读约 约 7 分钟　·　更新 2026-10

**摘要**：从 GPU 三指标、CPU/内存/PCIe、NVMe 分层存储，到 InfiniBand 网络、供电散热与监控容器化，给出选型速查。

---

**本文为原创技术科普，采用 CC BY 4.0 许可，可自由转载、改编，仅需注明作者与出处。

## 一、GPU 是绝对主角

大模型的计算几乎全压在 GPU 上。选卡看三个硬指标：

- 显存（VRAM）**：决定了能跑多大的模型、多长的上下文。它往往是比"算力"更早触顶的瓶颈——前面算过，70B 模型 FP16 需约 140GB 显存。
- **显存带宽**：注意力与矩阵乘极度依赖带宽，带宽越高，每秒生成的字越多。这也是为什么 H100 比同算力的卡贵得多。
- **互联带宽**：多卡训练时，卡间通信频率极高，NVLink 比普通 PCIe 快一个数量级。
主流选择：训练用 A100/H100/L40S 等数据中心卡；推理与微调，24G/48G 的 RTX 4090、A6000 等消费/专业卡性价比高（注意消费卡做商业训练需留意厂商许可条款）。

## 二、CPU 与内存：别成为短板

- **CPU**：负责数据预处理、Token 化、调度。核数多、单核稳即可，不必追顶级。
- **系统内存（RAM）**：建议至少为单卡显存的 1.5~2 倍，用于加载模型权重、缓存数据集，避免数据供给跟不上 GPU。
- **PCIe 通道**：多卡时确保主板提供足够通道，否则卡间数据要走慢速链路。

## 三、存储：数据集与模型的家

大模型工作流里，存储常被低估：

- **NVMe SSD**：模型文件动辄几十 GB，加载速度直接受磁盘影响；训练数据集更大，NVMe 是底线。
- **容量规划**：一个 70B 模型 FP16 约 140GB，INT4 约 35GB；训练数据集常以 TB 计，需提前留足。
- **分层存储**：热数据（当前训练集）放 NVMe，冷数据（归档、备份）放大容量 SATA SSD 或对象存储。

## 四、网络：多卡与分布式的命脉

- **卡间互联**：NVLink / NVSwitch 用于单机多卡高速通信；跨机用 **InfiniBand** 或 200G 以太网，否则分布式训练会被网络拖垮。
- **对外服务网络**：推理 API 面向用户，需要稳定带宽与低延迟，通常放在机房或云上，配负载均衡。

## 五、供电与散热：最容易翻车的环节

- **功耗**：一张 H100 整机可能上千瓦，多卡服务器需配套足功率电源与冗余。
- **散热**：GPU 满载温度高，必须保证风道通畅、环境温度受控；高密度部署常需液冷。
- **稳定性**：长时间训练任务一旦因过热降频或宕机，损失巨大，机房空调与供电冗余要重视。

## 六、运维要点

- **监控**：用 Prometheus + Grafana 盯紧 GPU 利用率、显存、温度、功耗；用 `nvidia-smi` 快速排查。
- **容器化**：用 Docker 封装 CUDA、驱动、依赖，环境一致、迁移方便。
- **编排**：多节点训练用 Kubernetes 或 Slurm 统一调度资源。
- **故障预案**：定期备份模型检查点与数据；训练任务设断点续训，避免从头再来。

## 七、选型速查

用途推荐配置方向个人学习/微调 7B~13B单卡 24G，64G 内存，1TB NVMe企业推理 70B单/双卡 48G~80G，量化部署，100G+ 网络多卡训练 70B+4~8 卡 NVLink 服务器，IB 网络，液冷，冗余电源

## 八、小结

大模型服务器的核心矛盾是 **"显存与带宽永远不够"**。选型的优先级通常是：显存容量 → 显存带宽 → 卡间互联 → CPU/内存/存储配套 → 供电散热。硬件到位后，监控、容器化、断点续训等运维手段，决定你能否把算力稳定转化为产出。

可转载说明：本文为原创，转载请保留本段署名（作者：AI 资源站 / 许可：CC BY 4.0），并保留文内表格与要点原貌。

---


# 大模型背后的网络与存储：数据怎么来、怎么存、怎么传

> **原创科普**　·　许可：CC BY 4.0　·　阅读约 约 7 分钟　·　更新 2026-10

**摘要**：梳理 Common Crawl 等语料管线、对象存储与向量库分层、API 网关+负载均衡+流式返回的推理链路与合规要点。

---

**本文为原创技术科普，采用 CC BY 4.0 许可，可自由转载、改编，仅需注明作者与出处。

## 一、数据从哪来：训练语料的源头

大模型的知识来自训练数据，规模常以 TB 计。公开且可合法使用的语料包括：

- Common Crawl**：定期抓取的全网网页存档，是多数大模型预训练语料的基石，可免费下载再分发（但其中内容本身仍受原网站版权约束，需做清洗与过滤）。
- **公开数据集**：如 Wikipedia dump、开源书籍/论文语料、代码仓库快照等。
- **自有数据**：企业用内部文档、日志、客服记录构建垂直语料。
数据管线一般是：**抓取 → 去重 → 质量过滤（去垃圾、去隐私）→ 格式化为训练样本**。这一步的工程质量，往往比模型结构更影响最终效果。

## 二、数据怎么存：存储层级

- **对象存储（如 S3 协议兼容服务）**：适合存海量、冷热的训练数据与模型文件，按需扩展、按量计费，是云上标配。
- **分布式文件系统**：多机训练时，需要所有节点同时高速读取数据，常用并行文件系统或 NVMe 集群，避免"数据喂不饱 GPU"。
- **数据库**：结构化业务数据（用户、订单、配置）用关系型或文档数据库；向量数据库（如 Milvus、pgvector）用于存储 Embedding，支撑检索增强生成（RAG）。
- **本地 NVMe**：当前训练集放本地最快，减少网络读取延迟。

## 三、推理服务怎么传：从请求到回答

用户调用大模型，走的是标准 Web 服务链路：

- **API 网关**：统一入口，做鉴权、限流、路由；
- **负载均衡**：把并发请求分发到多台推理服务器，避免单点过载；
- **推理引擎**：vLLM 等生成回答（见《推理部署与优化》一文）；
- **流式返回**：用 SSE（Server-Sent Events）把生成的字一个个推给前端，改善体感。

```
用户 → API 网关 → 负载均衡 → [推理节点 A / B / C] → 流式回答
```

## 四、延迟与带宽：用户体验的隐形之手

- **首字延迟**受网关排队、网络往返、模型 TTFT 共同影响；
- **长上下文**会让请求体变大，对上行带宽与网关超时配置提出要求；
- **CDN** 可用于分发静态资源（前端、文档），减轻源站压力；模型推理一般不走 CDN，需就近部署降低网络延迟。

## 五、安全与合规

- **传输加密**：对外服务一律 TLS（HTTPS），防止中间人窃听；
- **鉴权**：API Key、OAuth、签名等多种方式，确保只有授权方能用；
- **数据合规**：训练与推理涉及的个人数据需脱敏、授权；跨境传输遵守相关法规；
- **内容安全**：对外服务应加审核层，防止生成违规内容。

## 六、一个典型落地的存储网络架构

```
[数据层]  对象存储 / 向量库 / 关系库
   ↑ 训练时拉取，推理时检索(RAG)
[计算层]  GPU 推理集群（vLLM）+ 负载均衡
   ↓
[接入层]  API 网关（TLS + 鉴权 + 限流）
   ↓
[用户层]  Web / App / 第三方系统（流式接收）
```

## 七、小结

大模型不只是"一个模型文件"。它背后是一条链：**Common Crawl 等公开语料经清洗入库，对象存储与向量库分层承载数据，推理集群经网关与负载均衡对外服务，全程 TLS 与鉴权保障安全**。理解这条链，才能把模型真正落到可运营的系统中。

可转载说明：本文为原创，转载请保留本段署名（作者：AI 资源站 / 许可：CC BY 4.0），并保留文内架构图与要点原貌。

---

<!-- ===== 官方原文转载 ===== -->

<a id="nginx-beginner"></a>
<a id="sqlite-whentouse"></a>
<a id="postgres-whatis"></a>
<a id="k8s-components"></a>
<a id="archwiki-systemd"></a>
<a id="rfc9110-http"></a>
<a id="vllm-quickstart"></a>
<a id="pytorch-basics"></a>

# nginx 新手指南：启动停止、配置结构与静态/代理服务（官方文档全文）

> **官方原文转载**　·　来源：nginx.org 官方文档　·　许可：2-clause BSD（nginx 官方文档）
>
> 原文：https://nginx.org/en/docs/beginners_guide.html
> 抓取日期：转载自官方原文

**摘要**：nginx 官方新手指南全文：主进程与 worker 进程模型、启动停止与重载配置、配置文件结构、静态内容服务、反向代理与 FastCGI 代理配置。

---

**来源：**nginx.org 官方文档　·　**许可：**2-clause BSD（nginx 官方文档）**原文链接：**https://nginx.org/en/docs/beginners_guide.html

## Beginner’s Guide

Starting, Stopping, and Reloading Configuration**Configuration File’s Structure
Serving Static Content
Setting Up a Simple Proxy Server
Setting Up FastCGI Proxying

This guide gives a basic introduction to nginx and describes some
simple tasks that can be done with it.
It is supposed that nginx is already installed on the reader’s machine.
If it is not, see the Installing nginx page.
This guide describes how to start and stop nginx, and reload its
configuration, explains the structure
of the configuration file and describes how to set up nginx
to serve out static content, how to configure nginx as a proxy
server, and how to connect it with a FastCGI application.

nginx has one master process and several worker processes.
The main purpose of the master process is to read and evaluate configuration,
and maintain worker processes.
Worker processes do actual processing of requests.
nginx employs event-based model and OS-dependent mechanisms to efficiently
distribute requests among worker processes.
The number of worker processes is defined in the configuration file and
may be fixed for a given configuration or automatically adjusted to the
number of available CPU cores (see
worker_processes).

The way nginx and its modules work is determined in the configuration file.
By default, the configuration file is named `nginx.conf`
and placed in the directory
`/usr/local/nginx/conf`,
`/etc/nginx`, or
`/usr/local/etc/nginx`.

### Starting, Stopping, and Reloading Configuration

To start nginx, run the executable file.
Once nginx is started, it can be controlled by invoking the executable
with the `-s` parameter.
Use the following syntax:

```

nginx -s signal

```

Where *signal* may be one of the following:

-
`stop` — fast shutdown

-
`quit` — graceful shutdown

-
`reload` — reloading the configuration file

-
`reopen` — reopening the log files

For example, to stop nginx processes with waiting for the worker processes
to finish serving current requests, the following command can be executed:

```

nginx -s quit

```

 This command should be executed under the same user that
started nginx.

Changes made in the configuration file
will not be applied until the command to reload configuration is
sent to nginx or it is restarted.
To reload configuration, execute:

```

nginx -s reload

```

Once the master process receives the signal to reload configuration,
it checks the syntax validity
of the new configuration file and tries to apply the configuration provided
in it.
If this is a success, the master process starts new worker processes
and sends messages to old worker processes, requesting them to
shut down.
Otherwise, the master process rolls back the changes and
continues to work with the old configuration.
Old worker processes, receiving a command to shut down,
stop accepting new connections and continue to service current requests until
all such requests are serviced.
After that, the old worker processes exit.

A signal may also be sent to nginx processes with the help of Unix tools
such as the `kill` utility.
In this case a signal is sent directly to a process with a given process ID.
The process ID of the nginx master process is written, by default, to the
`nginx.pid` in the directory
`/usr/local/nginx/logs` or
`/var/run`.
For example, if the master process ID is 1628, to send the QUIT signal
resulting in nginx’s graceful shutdown, execute:

```

kill -s QUIT 1628

```

For getting the list of all running nginx processes, the `ps`
utility may be used, for example, in the following way:

```

ps -ax | grep nginx

```

For more information on sending signals to nginx, see
Controlling nginx.

### Configuration File’s Structure

nginx consists of modules which are controlled by directives specified
in the configuration file.
Directives are divided into simple directives and block directives.
A simple directive consists of the name and parameters separated by spaces
and ends with a semicolon (`;`).
A block directive has the same structure as a simple directive, but
instead of the semicolon it ends with a set of additional instructions
surrounded by braces (`{` and `}`).
If a block directive can have other directives inside braces,
it is called a context (examples:
events,
http,
server,
and
location).

Directives placed in the configuration file outside
of any contexts are considered to be in the
main context.
The `events` and `http` directives
reside in the `main` context, `server`
in `http`, and `location` in
`server`.

The rest of a line after the `#` sign is considered a comment.

### Serving Static Content

An important web server task is serving out
files (such as images or static HTML pages).
You will implement an example where, depending on the request,
files will be served from different local directories: `/data/www`
(which may contain HTML files) and `/data/images`
(containing images).
This will require editing of the configuration file and setting up of a
server
block inside the http
block with two location
blocks.

First, create the `/data/www` directory and put an
`index.html` file with any text content into it and
create the `/data/images` directory and place some
images in it.

Next, open the configuration file.
The default configuration file already includes several examples of
the `server` block, mostly commented out.
For now comment out all such blocks and start a new
`server` block:

```

http {
 server {
 }
}

```

Generally, the configuration file may include several
`server` blocks
distinguished by ports on which
they listen to
and by
server names.
Once nginx decides which `server` processes a request,
it tests the URI specified in the request’s header against the parameters of the
`location` directives defined inside the
`server` block.

Add the following `location` block to the
`server` block:

```

location / {
 root /data/www;
}

```

This `location` block specifies the
“`/`” prefix compared with the URI from the request.
For matching requests, the URI will be added to the path specified in the
root
directive, that is, to `/data/www`,
to form the path to the requested file on the local file system.
If there are several matching `location` blocks nginx
selects the one with the longest prefix.
The `location` block above provides the shortest
prefix, of length one,
and so only if all other `location`
blocks fail to provide a match, this block will be used.

Next, add the second `location` block:

```

location /images/ {
 root /data;
}

```

It will be a match for requests starting with `/images/`
(`location /` also matches such requests,
but has shorter prefix).

The resulting configuration of the `server` block should
look like this:

```

server {
 location / {
 root /data/www;
 }

 location /images/ {
 root /data;
 }
}

```

This is already a working configuration of a server that listens
on the standard port 80 and is accessible on the local machine at
`http://localhost/`.
In response to requests with URIs starting with `/images/`,
the server will send files from the `/data/images` directory.
For example, in response to the
`http://localhost/images/example.png` request nginx will
send the `/data/images/example.png` file.
If such file does not exist, nginx will send a response
indicating the 404 error.
Requests with URIs not starting with `/images/` will be
mapped onto the `/data/www` directory.
For example, in response to the
`http://localhost/some/example.html` request nginx will
send the `/data/www/some/example.html` file.

To apply the new configuration, start nginx if it is not yet started or
send the `reload` signal to the nginx’s master process,
by executing:

```

nginx -s reload

```

In case something does not work as expected, you may try to find out
the reason in `access.log` and
`error.log` files in the directory
`/usr/local/nginx/logs` or
`/var/log/nginx`.

### Setting Up a Simple Proxy Server

One of the frequent uses of nginx is setting it up as a proxy server, which
means a server that receives requests, passes them to the proxied servers,
retrieves responses from them, and sends them to the clients.

We will configure a basic proxy server, which serves requests of
images with files from the local directory and sends all other requests to a
proxied server.
In this example, both servers will be defined on a single nginx instance.

First, define the proxied server by adding one more `server`
block to the nginx’s configuration file with the following contents:

```

server {
 listen 8080;
 root /data/up1;

 location / {
 }
}

```

This will be a simple server that listens on the port 8080
(previously, the `listen` directive has not been specified
since the standard port 80 was used) and maps
all requests to the `/data/up1` directory on the local
file system.
Create this directory and put the `index.html` file into it.
Note that the `root` directive is placed in the
`server` context.
Such `root` directive is used when the
`location` block selected for serving a request does not
include its own `root` directive.

Next, use the server configuration from the previous section
and modify it to make it a proxy server configuration.
In the first `location` block, put the
proxy_pass
directive with the protocol, name and port of the proxied server specified
in the parameter (in our case, it is `http://localhost:8080`):

```

server {
 location / {
 proxy_pass http://localhost:8080;
 }

 location /images/ {
 root /data;
 }
}

```

We will modify the second `location`
block, which currently maps requests with the `/images/`
prefix to the files under the `/data/images` directory,
to make it match the requests of images with typical file extensions.
The modified `location` block looks like this:

```

location ~ \.(gif|jpg|png)$ {
 root /data/images;
}

```

The parameter is a regular expression matching all URIs ending
with `.gif`, `.jpg`, or `.png`.
A regular expression should be preceded with `~`.
The corresponding requests will be mapped to the `/data/images`
directory.

When nginx selects a `location` block to serve a request
it first checks location
directives that specify prefixes, remembering `location`
with the longest prefix, and then checks regular expressions.
If there is a match with a regular expression, nginx picks this
`location` or, otherwise, it picks the one remembered earlier.

The resulting configuration of a proxy server will look like this:

```

server {
 location / {
 proxy_pass http://localhost:8080/;
 }

 location ~ \.(gif|jpg|png)$ {
 root /data/images;
 }
}

```

This server will filter requests ending with `.gif`,
`.jpg`, or `.png`
and map them to the `/data/images` directory (by adding URI to the
`root` directive’s parameter) and pass all other requests
to the proxied server configured above.

To apply new configuration, send the `reload` signal to
nginx as described in the previous sections.

There are many more
directives that may be used to further configure a proxy connection.

### Setting Up FastCGI Proxying

nginx can be used to route requests to FastCGI servers which run
applications built with various frameworks and programming languages
such as PHP.

The most basic nginx configuration to work with a FastCGI server
includes using the
fastcgi_pass
directive instead of the `proxy_pass` directive,
and fastcgi_param
directives to set parameters passed to a FastCGI server.
Suppose the FastCGI server is accessible on `localhost:9000`.
Taking the proxy configuration from the previous section as a basis,
replace the `proxy_pass` directive with the
`fastcgi_pass` directive and change the parameter to
`localhost:9000`.
In PHP, the `SCRIPT_FILENAME` parameter is used for
determining the script name, and the `QUERY_STRING`
parameter is used to pass request parameters.
The resulting configuration would be:

```

server {
 location / {
 fastcgi_pass localhost:9000;
 fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
 fastcgi_param QUERY_STRING $query_string;
 }

 location ~ \.(gif|jpg|png)$ {
 root /data/images;
 }
}

```

This will set up a server that will route all requests except for
requests for static images to the proxied server operating on
`localhost:9000` through the FastCGI protocol.

本文正文摘自 nginx.org 官方文档**（2-clause BSD（nginx 官方文档））。原文：https://nginx.org/en/docs/beginners_guide.html。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# SQLite 官方：什么场景下该用 / 不该用 SQLite（公有领域全文）

> **官方原文转载**　·　来源：sqlite.org 官方文档　·　许可：公有领域（Public Domain，SQLite 官方文档）
>
> 原文：https://www.sqlite.org/whentouse.html
> 抓取日期：转载自官方原文

**摘要**：SQLite 官方「Appropriate Uses」全文：SQLite 与客户端/服务器数据库的区别、最适合的使用场景、应当改用服务端数据库的情形，以及并发写入与网络文件系统的注意事项。

---

**来源：**sqlite.org 官方文档　·　**许可：**公有领域（Public Domain，SQLite 官方文档）**原文链接：**https://www.sqlite.org/whentouse.html
Small. Fast. Reliable.**Choose any three.

- Home
Menu
About
Documentation
Download
License
Support
Purchase

Search

About
Documentation
Download
Support
Purchase

Appropriate Uses For SQLite

Table Of Contents
1. Situations Where SQLite Works Well
2. Situations Where A Client/Server RDBMS May Work Better
3. Checklist For Choosing The Right Database Engine

SQLite is not directly comparable to client/server SQL database engines such
as MySQL, Oracle, PostgreSQL, or SQL Server since SQLite is trying to
solve a different problem.

Client/server SQL database engines strive to implement a shared repository
of enterprise data. They emphasize scalability, concurrency, centralization,
and control.
SQLite strives to provide local data storage for
individual applications and devices. SQLite emphasizes economy,
efficiency, reliability, independence, and simplicity.

SQLite does not compete with client/server databases.
SQLite competes with fopen().

## 1. Situations Where SQLite Works Well

Embedded devices and the internet of things**

Because an SQLite database requires no administration,
it works well in devices that must operate without expert human support.
SQLite is a good fit for use in
cellphones, set-top boxes, televisions, game consoles,
cameras, watches, kitchen appliances, thermostats, automobiles,
machine tools, airplanes, remote sensors, drones, medical devices,
and robots: the "internet of things".

Client/server database engines are designed to live inside a
lovingly-attended datacenter at the core of the network.
SQLite works there too, but SQLite also thrives at the edge of the network,
fending for itself while providing fast and
reliable data services to applications that would otherwise
have dodgy connectivity.

- **Application file format**

SQLite is often used as the on-disk file format
for desktop applications such as version control systems,
financial analysis tools, media cataloging and editing suites, CAD
packages, record keeping programs, and so forth. The traditional
File/Open operation calls sqlite3_open() to attach to the database
file. Updates happen automatically as application content is revised
so the File/Save menu option becomes superfluous. The File/Save_As
menu option can be implemented using the backup API.

There are many benefits to this approach, including improved
performance, reduced cost and complexity, and
improved reliability. See technical notes
"aff_short.html" and
"appfileformat.html" and
"fasterthanfs.html" for more information.
This use case is closely related to the
data transfer format and
data container use cases below.

- **Websites**

SQLite works great as the database engine for most low to
medium traffic websites (which is to say, most websites).
The amount of web traffic that SQLite can handle depends
on how heavily the website uses its database. Generally
speaking, any site that gets fewer than 100K hits/day should work
fine with SQLite.
The 100K hits/day figure is a conservative estimate, not a
hard upper bound.
SQLite has been demonstrated to work with 10 times that amount
of traffic.

The SQLite website (https://sqlite.org/) uses SQLite itself,
of course, and as of this writing (2015) it handles about 400K to 500K
HTTP requests per day, about 15-20% of which are dynamic pages touching
the database. Dynamic content uses about 200 SQL statements per webpage.
This setup runs on a single VM that shares a physical server with 23 others
and yet still keeps the load average below 0.1 most of the time.

See also: Hacker News discussion from 2022-12-13.

- **Data analysis**

People who understand SQL can employ the
sqlite3 command-line shell (or various third-party
SQLite access programs) to analyze large
datasets. Raw data can be imported from CSV files, then that
data can be sliced and diced to generate a myriad of summary
reports. More complex analysis can be done using simple scripts written
in Tcl or Python (both of which come with SQLite built-in) or in R or
other languages using readily available adaptors.
Possible uses include website log analysis, sports
statistics analysis, compilation of programming metrics, and
analysis of experimental results. Many bioinformatics researchers
use SQLite in this way.

The same thing can be done with an enterprise client/server
database, of course. The advantage of SQLite is
that it is easier to install and use and the resulting database
is a single file that can be written to a USB memory stick
or emailed to a colleague.

- **Cache for enterprise data**

Many applications use SQLite as a cache of relevant content from
an enterprise RDBMS.
This reduces latency, since most queries now occur against the local
cache and avoid a network round-trip. It also reduces the load
on the network and on the central database server. And in many cases,
it means that the client-side application can continue operating during
network outages.

- **Server-side database**

Systems designers
report success using SQLite as a data store on server applications
running in the datacenter, or in other words, using SQLite as the underlying
storage engine for an application-specific database server.

With this pattern, the overall system is still client/server:
clients send requests to the server and get back replies over the network.
But instead of sending generic SQL and getting back raw table content,
the client requests and server responses are high-level and
application-specific.
The server translates requests into multiple SQL queries, gathers the
results, does post-processing, filtering, and analysis, then constructs
a high-level reply containing only the essential information.

Developers report that SQLite is often faster than a client/server
SQL database engine in this scenario.
Database requests are serialized by the server, so concurrency is not
an issue. Concurrency is also improved by "database sharding":
using separate database files for different subdomains. For
example, the server might have a separate SQLite database for each
user, so that the server can handle hundreds or thousands of simultaneous
connections, but each SQLite database is only used by one connection.

- **Data transfer format**

Because an SQLite database is a single compact file in a
well-defined cross-platform format, it is often used
as a container for transferring content from one system to another.
The sender gathers content into an SQLite database file, transfers
that one file to the receiver, then the receiver uses SQL to extract
the content as needed.

An SQLite database facilitates data transfer between systems even
when the endpoints have different word sizes and/or byte orders.
The data can be a complex mix of large binary blobs, text, and small
numeric or boolean values. The data format can be easily extended
by adding new tables and/or columns, without breaking legacy receivers.
The SQL query language means that receivers are not required to parse
the entire transfer all at once, but can instead query the
received content as needed. The data format is "transparent" in the
sense that it is easily decoded for human viewing using
a variety of universally available, open-source tools, from multiple
vendors.

- **File archive and/or data container**

The SQLite Archive idea shows how
SQLite can be used as a substitute for ZIP archives or Tarballs.
An archive of files stored in SQLite is only very slightly larger, and
in some cases actually smaller, than the equivalent ZIP archive.
And an SQLite archive features incremental and atomic updating
and the ability to store much richer metadata.

Fossil version 2.5 and later offers
SQLite Archive files as a download format, in addition
to traditional tarball and ZIP archive.
The sqlite3.exe command-line shell version 3.22.0 and later will create,
list, or unpack an SQL archive using the
.archive command.

SQLite is a good solution for any situation that requires bundling
diverse content into a self-contained and self-describing package
for shipment across a network.
Content is encoded in a
well-defined, cross-platform, and stable file format.
The encoding is efficient, and receivers can extract small subsets
of the content without having to read and parse the entire file.

SQL archives are useful as the distribution format for software
or content updates that are broadcast to many clients. Variations
on this idea are used, for example, to transmit TV programming guides
to set-top boxes and to send over-the-air updates to vehicle navigation
systems.

- **Replacement for *ad hoc* disk files**

Many programs use
fopen(),
fread(), and
fwrite() to create and
manage files of data in home-grown formats. SQLite works
particularly well as a
replacement for these *ad hoc* data files.
Contrary to intuition, SQLite can be faster than the filesystem
for reading and writing content to disk.

- **Internal or temporary databases**

For programs that have a lot of data that must be sifted and sorted
in diverse ways, it is often easier and quicker to load the data into
an in-memory SQLite database and use queries with joins and ORDER BY
clauses to extract the data in the form and order needed rather than
to try to code the same operations manually.
Using an SQL database internally in this way also gives the program
greater flexibility since new columns and indices can be added without
having to recode every query.

- **Stand-in for an enterprise database during demos or testing**

Client applications typically use a generic database interface that allows
connections to various SQL database engines. It makes good sense to
include SQLite in the mix of supported databases and to statically
link the SQLite engine in with the client. That way the client program
can be used standalone with an SQLite data file for testing or for
demonstrations.

- **Education and Training**

Because it is simple to setup and use (installation is trivial: just
copy the **sqlite3** or **sqlite3.exe** executable to the target machine
and run it) SQLite makes a good database engine for use in teaching SQL.
Students can easily create as many databases as they like and can
email databases to the instructor for comments or grading. For more
advanced students who are interested in studying how an RDBMS is
implemented, the modular and well-commented and documented SQLite code
can serve as a good basis.

- **Experimental SQL language extensions**

The simple, modular design of SQLite makes it a good platform for
prototyping new, experimental database language features or ideas.

## 2. Situations Where A Client/Server RDBMS May Work Better

- **Client/Server Applications**

If there are many client programs sending SQL to the same
database over a network, then use a client/server database
engine instead of SQLite. SQLite will work over a network filesystem,
but because of the latency associated with most network filesystems,
performance will not be great. Also, file locking logic is buggy in
many network filesystem implementations (on both Unix and Windows).
If file locking does not work correctly,
two or more clients might try to modify the
same part of the same database at the same time, resulting in
corruption. Because this problem results from bugs in
the underlying filesystem implementation, there is nothing SQLite
can do to prevent it.

A good rule of thumb is to avoid using SQLite
in situations where the same database will be accessed directly
(without an intervening application server) and simultaneously
from many computers over a network.

- **High-volume Websites**

SQLite will normally work fine as the database backend to a website.
But if the website is write-intensive or is so busy that it requires
multiple servers, then consider using an enterprise-class client/server
database engine instead of SQLite.

- **Very large datasets**

An SQLite database is limited in size to 281 terabytes
(248 bytes, 256 tibibytes).
And even if it could handle larger databases, SQLite stores the entire
database in a single disk file and many filesystems limit the maximum
size of files to something less than this. So if you are contemplating
databases of this magnitude, you would do well to consider using a
client/server database engine that spreads its content across multiple
disk files, and perhaps across multiple volumes.

- **High Concurrency**

SQLite supports an unlimited number of simultaneous readers, but it
will only allow one writer at any instant in time.
For many situations, this is not a problem. Writers queue up. Each application
does its database work quickly and moves on, and no lock lasts for more
than a few dozen milliseconds. But there are some applications that require
more concurrency, and those applications may need to seek a different
solution.

## 3. Checklist For Choosing The Right Database Engine

- **Is the data separated from the application by a network?
 &rarr; choose client/server**

Relational database engines act as bandwidth-reducing data filters.
So it is best to keep the database engine and the data on
the same physical device so that the high-bandwidth engine-to-disk
link does not have to traverse the network, only the lower-bandwidth
application-to-engine link.

But SQLite is built into the application. So if the data is on a
separate device from the application, it is required that the higher
bandwidth engine-to-disk link be across the network. This works, but
it is suboptimal. Hence, it is usually better to select a client/server
database engine when the data is on a separate device from the
application.

*Nota Bene:*
In this rule, "application" means the code that issues SQL statements.
If the "application" is an application server and
if the content resides on the same physical machine as the application server,
then SQLite might still be appropriate even though the end user is
another network hop away.

- **Many concurrent writers? &rarr; choose client/server**

If many threads and/or processes need to write the
database at the same instant (and they cannot queue up and take turns)
then it is best to select a database engine that supports that
capability, which always means a client/server database engine.

SQLite only supports one writer at a time per database file.
But in most cases, a write transaction only takes milliseconds and
so multiple writers can simply take turns. SQLite will handle
more write concurrency than many people suspect. Nevertheless,
client/server database systems, because they have a long-running
server process at hand to coordinate access, can usually handle
far more write concurrency than SQLite ever will.

- **Big data? &rarr; choose client/server**

If your data will grow to a size that you are uncomfortable
or unable to fit into a single disk file, then you should select
a solution other than SQLite. SQLite supports databases up to
281 terabytes in size, assuming you can find a disk drive and filesystem
that will support 281-terabyte files. Even so, when the size of the
content looks like it might creep into the terabyte range, it would
be good to consider a centralized client/server database.

- **Otherwise &rarr; choose SQLite!**

For device-local storage with low writer concurrency and less than a
terabyte of content, SQLite is almost always a better solution. SQLite
is fast and reliable and it requires no configuration or maintenance.
It keeps things simple. SQLite "just works".

*This page was last updated on 2025-05-31 13:08:22Z *

本文正文摘自 **sqlite.org 官方文档**（公有领域（Public Domain，SQLite 官方文档））。原文：https://www.sqlite.org/whentouse.html。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# PostgreSQL 官方：PostgreSQL 是什么（PostgreSQL License 全文）

> **官方原文转载**　·　来源：postgresql.org 官方文档　·　许可：PostgreSQL License（PostgreSQL 官方文档）
>
> 原文：https://www.postgresql.org/docs/current/intro-whatis.html
> 抓取日期：转载自官方原文

**摘要**：PostgreSQL 官方文档「What is PostgreSQL?」：关系型数据库定位、可扩展性与数据类型/函数/索引定制能力、MVCC 并发控制、SQL 标准符合度与 ACID 特性。

---

**来源：**postgresql.org 官方文档　·　**许可：**PostgreSQL License（PostgreSQL 官方文档）**原文链接：**https://www.postgresql.org/docs/current/intro-whatis.html

 1. What Is PostgreSQL?

 Prev
 Up
 Preface
 Home
  Next

## 1. What Is PostgreSQL? #

 PostgreSQL is an object-relational database management system (ORDBMS) based on POSTGRES, Version 4.2, developed at the University of California at Berkeley Computer Science Department. POSTGRES pioneered many concepts that only became available in some commercial database systems much later.

 PostgreSQL is an open-source descendant of this original Berkeley code. It supports a large part of the SQL standard and offers many modern features:

- complex queries

- foreign keys

- triggers

- updatable views

- transactional integrity

- multiversion concurrency control

 Also, PostgreSQL can be extended by the user in many ways, for example by adding new

- data types

- functions

- operators

- aggregate functions

- index methods

- procedural languages

 And because of the liberal license, PostgreSQL can be used, modified, and distributed by anyone free of charge for any purpose, be it private, commercial, or academic.

 Prev
 Up
  Next

 Preface
 Home
  2. A Brief History of PostgreSQL

本文正文摘自 **postgresql.org 官方文档**（PostgreSQL License（PostgreSQL 官方文档））。原文：https://www.postgresql.org/docs/current/intro-whatis.html。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# Kubernetes 官方中文：集群组件架构（CC BY 4.0 全文）

> **官方原文转载**　·　来源：kubernetes.io 官方中文文档　·　许可：CC BY 4.0（Kubernetes 官方文档）
>
> 原文：https://kubernetes.io/zh-cn/docs/concepts/overview/components/
> 抓取日期：转载自官方原文

**摘要**：Kubernetes 官方中文文档「Kubernetes 组件」：控制平面组件（kube-apiserver、etcd、kube-scheduler、kube-controller-manager、cloud-controller-manager）与 Node 组件（kubelet、kube-proxy、容器运行时）的职责与协作方式，以及插件（Addons）层。

---

**来源：**kubernetes.io 官方中文文档　·　**许可：**CC BY 4.0（Kubernetes 官方文档）**原文链接：**https://kubernetes.io/zh-cn/docs/concepts/overview/components/

## Kubernetes 组件

组成 Kubernetes 集群的关键组件概述。本文档概述了一个正常运行的 Kubernetes 集群所需的各种组件。

Kubernetes 集群的组件

## 核心组件

Kubernetes 集群由控制平面和一个或多个工作节点组成。以下是主要组件的简要概述：

### 控制平面组件

这些控制平面组件（Control Plane Component）管理集群的整体状态：

kube-apiserver公开 Kubernetes HTTP API 的核心组件服务器。etcd具备一致性和高可用性的键值存储，用于所有 API 服务器的数据存储。kube-scheduler查找尚未绑定到节点的 Pod，并将每个 Pod 分配给合适的节点。kube-controller-manager运行控制器来实现 Kubernetes API 行为。cloud-controller-manager (optional)与底层云驱动集成。

### Node 组件

在每个节点上运行，维护运行的 Pod 并提供 Kubernetes 运行时环境：

kubelet确保 Pod 及其容器正常运行。kube-proxy（可选）维护节点上的网络规则以实现 Service 的功能。容器运行时（Container runtime）负责运行容器的软件，阅读容器运行时以了解更多信息。&#128711; 本条目指向第三方项目或产品，而该项目（产品）不是 Kubernetes 的一部分。更多信息你的集群可能需要每个节点上运行额外的软件；例如，你可能还需要在 Linux
节点上运行 systemd 来监督本地组件。

## 插件（Addons）

插件扩展了 Kubernetes 的功能。一些重要的例子包括：

DNS集群范围内的 DNS 解析。Web 界面（Dashboard）通过 Web 界面进行集群管理。容器资源监控用于收集和存储容器指标。集群层面日志用于将容器日志保存到中央日志存储。

## 架构灵活性

Kubernetes 允许灵活地部署和管理这些组件。此架构可以适应各种需求，从小型开发环境到大规模生产部署。

有关每个组件的详细信息以及配置集群架构的各种方法，
请参阅集群架构页面。

## 反馈

此页是否对你有帮助？

感谢反馈。如果你有一个关于如何使用 Kubernetes 的具体问题需要答案，可以访问
Stack Overflow.
如果需要，请在 GitHub 仓库 上登记新的问题
报告问题
或者
提出改进建议.

最后修改 June 18, 2026 at 11:33 AM PST: [zh-cn]sync overview/_index components (2ef2f60d15)本页面中的条目引用了第三方产品或项目，这些产品（项目）提供了 Kubernetes 所需的功能。Kubernetes 项目的开发人员不对这些第三方产品（项目）负责。请参阅CNCF 网站指南了解更多细节。

在提交更改建议，向本页添加新的第三方链接之前，你应该先阅读内容指南。

本文正文摘自 **kubernetes.io 官方中文文档**（CC BY 4.0（Kubernetes 官方文档））。原文：https://kubernetes.io/zh-cn/docs/concepts/overview/components/。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# ArchWiki：systemd 系统与服务管理（GFDL 1.3 全文节选）

> **官方原文转载**　·　来源：ArchWiki（wiki.archlinux.org）　·　许可：GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可）
>
> 原文：https://wiki.archlinux.org/title/Systemd
> 抓取日期：转载自官方原文

**摘要**：ArchWiki「systemd」条目：systemctl 基本用法、服务单元管理、target 与运行级别、日志（journalctl）、电源管理，以及编写自定义 service 单元的要点。

---

**来源：**ArchWiki（wiki.archlinux.org）　·　**许可：**GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可）**原文链接：**https://wiki.archlinux.org/title/Systemd

- Home
- Packages
- Forums
- Wiki
- GitLab
- Security
- AUR
- Download

Jump to content

 **ArchWiki**

Search

- Create account

- Log in

Personal tools

-

Create account

-

Log in

## systemd

11 languages

- Deutsch
- Español
- Suomi
- Français
- Magyar
- Italiano
- 日本語
- Português
- Русский
- Türkçe
- 中文（简体）

 From ArchWiki

Related articles

- systemd/User

- systemd/Timers

- systemd/Journal

- systemd/Sandboxing

- systemd/FAQ

- init

- udev

- Improving performance/Boot process

- Allow users to shutdown

From the project web page:

*systemd* is a suite of basic building blocks for a Linux system. It provides a system and service manager that runs as PID 1 and starts the rest of the system. *systemd* provides aggressive parallelization capabilities, uses socket and D-Bus activation for starting services, offers on-demand starting of daemons, keeps track of processes using Linux control groups, maintains mount and automount points, and implements an elaborate transactional dependency-based service control logic. Other parts include a logging daemon, utilities to control basic system configuration like the hostname, date, locale, maintain a list of logged-in users and running containers and virtual machines, system accounts, runtime directories and settings, and daemons to manage simple network configuration, network time synchronization, log forwarding, and name resolution.
Historically, what systemd calls "service" was named daemon: any program that runs as a "background" process (without a terminal or user interface), commonly waiting for events to occur and offering services. A good example is a web server that waits for a request to deliver a page, or an ssh server waiting for someone trying to log in. While these are full featured applications, there are daemons whose work is not that visible. Daemons are for tasks like writing messages into a log file (e.g. `syslog`, `metalog`) or keeping your system time accurate (e.g. ntpd). For more information see daemon(7).

**Note** For a detailed explanation of why Arch moved to *systemd*, see this forum post.

## Basic systemctl usage

The main command used to introspect and control *systemd* is *systemctl*. Some of its uses are examining the system state and managing the system and services. See systemctl(1) for more details.

**Tip**

- You can use all of the following *systemctl* commands with the `-H *user*@*host*` switch to control a *systemd* instance on a remote machine. This will use SSH to connect to the remote *systemd* instance.

- Plasma users can install systemdgenie as a graphical frontend for *systemctl*.

### Using units

Units commonly include, but are not limited to, services (*.service*), mount points (*.mount*), devices (*.device*) and sockets (*.socket*).

When using *systemctl*, you generally have to specify the complete name of the unit file, including its suffix, for example `sshd.socket`. There are however a few short forms when specifying the unit in the following *systemctl* commands:

- If you do not specify the suffix, systemctl will assume *.service*. For example, `netctl` and `netctl.service` are equivalent.

- Mount points will automatically be translated into the appropriate *.mount* unit. For example, specifying `/home` is equivalent to `home.mount`.

- Similar to mount points, devices are automatically translated into the appropriate *.device* unit, therefore specifying `/dev/sda2` is equivalent to `dev-sda2.device`.

See systemd.unit(5) for details.

**Note** Some unit names contain an `@` sign (e.g. `name@*string*.service`): this means that they are instances of a *template* unit, whose actual file name does not contain the `*string*` part (e.g. `name@.service`). `*string*` is called the *instance identifier*, and is similar to an argument that is passed to the template unit when called with the *systemctl* command: in the unit file it will substitute the `%i` specifier. To be more accurate, *before* trying to instantiate the `name@.*suffix*` template unit, *systemd* will actually look for a unit with the exact `name@*string*.*suffix*` file name, although by convention such a "clash" happens rarely, i.e. most unit files containing an `@` sign are meant to be templates. Also, if a template unit is called without an instance identifier, it will generally fail (except with certain *systemctl* commands, like `cat`).
The commands in the below table operate on **system units** since `--system` is the implied default for *systemctl*. To instead operate on **user units** (for the *calling user*), use systemctl --user without root privileges. See also systemd/User#Basic setup to enable/disable user units for *all users*.

**Tip**

- Most commands also work if multiple units are specified, see systemctl(1) for more information.

- The `--now` switch can be used in conjunction with `enable`, `disable`, and `mask` to start or stop the unit *immediately* rather than after rebooting.

- A package may offer units for different purposes. If you just installed a package, `pacman -Qql *package* | grep -Fe .service -e .socket` can be used to check and find them.

- When available, enabling `*unit*.socket` instead of `*unit*.service` might be beneficial because the socket would start the service when necessary. See #Socket activation for more details.

- A search *pattern* can be appended to a lot of commands, making the use of *grep* unnecessary. For example, you can search the manual by executing `systemctl help '*dbus**'`, or list specific units with `systemctl list-units '*dbus**'`.

Action
Command
Note

Analyzing the system state

**Show system status**
`systemctl status`

**List running** units
`systemctl` or**`systemctl list-units`

List failed** units
`systemctl --failed`

**List installed** unit files1
`systemctl list-unit-files`

**Show process status** for a PID
`systemctl status *pid*`
cgroup slice, memory and parent

Checking the unit status

**Show a manual page** associated with a unit
`systemctl help *unit*`
as supported by the unit

**Status** of a unit
`systemctl status *unit*`
including whether it is running or not

**Check** whether a unit is enabled
`systemctl is-enabled *unit*`

Starting, restarting, reloading a unit

**Start** a unit immediately
`systemctl start *unit*` as root

**Stop** a unit immediately
`systemctl stop *unit*` as root

**Restart** a unit
`systemctl restart *unit*` as root

**Reload** a unit and its configuration
`systemctl reload *unit*` as root

**Reload systemd manager** configuration2
`systemctl daemon-reload` as root
scan for new or changed units

Enabling a unit

**Enable** a unit to start automatically at boot
`systemctl enable *unit*` as root

**Enable** a unit to start automatically at boot and **start** it immediately
`systemctl enable --now *unit*` as root

**Disable** a unit to no longer start at boot
`systemctl disable *unit*` as root

**Disable** a unit to no longer start at boot and **stop** it immediately
`systemctl disable --now *unit*` as root

**Reenable** a unit3
`systemctl reenable *unit*` as root
i.e. disable and enable anew

Masking a unit

**Mask** a unit to make it impossible to start4
`systemctl mask *unit*` as root

**Unmask** a unit
`systemctl unmask *unit*` as root

- See systemd.unit(5)&#32;§&#8239;UNIT FILE LOAD PATH for the directories where available unit files can be found.

- This does not ask the changed units to reload their own configurations (see the **Reload** action).

- For example, in case its `[Install]` section has changed since last enabling it.

- Both manually and as a dependency, which makes masking dangerous. Check for existing masked units with:

```
$ systemctl list-unit-files --state=masked
```

### Power management

polkit is necessary for power management as an unprivileged user. If you are in a local *systemd-logind* user session and no other session is active, the following commands will work without root privileges. If not (for example, because another user is logged into a tty), *systemd* will automatically ask you for the root password.

Action
Command

Shut down and reboot the system
`systemctl reboot`

Shut down and power-off the system
`systemctl poweroff`

Suspend the system
`systemctl suspend`

Put the system into hibernation (write RAM to disk)
`systemctl hibernate`

Put the system into hybrid-sleep state (also called suspend-to-both, it saves RAM to disk and then suspends)
`systemctl hybrid-sleep`

First suspend the system, then wake up after a configured time in order to just hibernate the system
`systemctl suspend-then-hibernate`

Perform a reboot of the userspace-only with a #Soft reboot.
`systemctl soft-reboot`

### Soft reboot

Soft reboot is a special kind of a userspace-only reboot operation that does not involve the kernel. It is implemented by systemd-soft-reboot.service(8) and can be invoked through `systemctl soft-reboot`. As with kexec, it skips firmware re-initialization, but additionally the system does not go through kernel initialization and initramfs, and unlocked dm-crypt devices remain attached.

When `/run/nextroot/` contains a valid root file system hierarchy (e.g. is the root mount of another distribution or another snapshot), *soft-reboot* would switch the system root into it, allowing for switching to another installation without losing states managed by kernel, e.g. networking.

**Tip** `/run/nextroot/` is not necessarily a mount point or backed by physical device. For example, it can reside in the `/run/` tmpfs. *systemd* will turn `/run/nextroot/` automatically into a mount point on *soft-reboot*.
**Note** Do not invoke `systemctl soft-reboot` after package updates that involved the kernel and initramfs.

## Writing unit files

The syntax of *systemd'*s unit files (systemd.unit(5)) is inspired by XDG Desktop Entry Specification .desktop files, which are in turn inspired by Microsoft Windows .ini files. Unit files are loaded from multiple locations (to see the full list, run `systemctl show --property=UnitPath`), but the main ones are (listed from lowest to highest precedence):

- `/usr/lib/systemd/system/`: units provided by installed packages

- `/run/systemd/system/`: units installed by the system administrator, deleted on power-off (useful for #Editing provided units)

- `/etc/systemd/system/`: units installed by the system administrator

**Note**

- The load paths are completely different when running *systemd* in user mode.

- *systemd* unit names may only contain ASCII alphanumeric characters, underscores and periods. All other characters must be replaced by C-style "\x2d" escapes, or employ their predefined semantics ('@', '-'). See systemd.unit(5) and systemd-escape(1) for more information.

Look at the units installed by your packages for examples, as well as systemd.service(5)&#32;§&#8239;EXAMPLES.

**Tip** Comments prepended with `#` may be used in unit-files as well, but only in new lines. Do not use end-line comments after *systemd* parameters or the unit will fail to activate.
To inspect or verify the work, systemd-analyze(1) can help with the `cat-config` or `verify` command.

### Handling dependencies

With *systemd*, dependencies can be resolved by designing the unit files correctly. The most typical case is when unit *A* requires unit *B* to be running before *A* is started. In that case add `Requires=*B*` and `After=*B*` to the `[Unit]` section of *A*. If the dependency is optional, add `Wants=*B*` and `After=*B*` instead. Note that `Wants=` and `Requires=` do not imply `After=`, meaning that if `After=` is not specified, the two units will be started in parallel.

Dependencies are typically placed on services and not on #Targets. For example, `network.target` is pulled in by whatever service configures your network interfaces, therefore ordering your custom unit after it is sufficient since `network.target` is started anyway.

### Service types

There are several different start-up types to consider when writing a custom service file. This is set with the `Type=` parameter in the `[Service]` section:

- `Type=simple` (default): *systemd* considers the service to be started up immediately. The process must not fork. Do not use this type if other services need to be ordered on this service, unless it is socket activated.

- `Type=forking`: *systemd* considers the service started up once the process forks and the parent has exited. For classic daemons, use this type unless you know that it is not necessary. You should specify `PIDFile=` as well so *systemd* can keep track of the main process.

- `Type=oneshot`: this is useful for scripts that do a single job and then exit. You may want to set `RemainAfterExit=yes` as well so that *systemd* still considers the service as active after the process has exited. Setting `RemainAfterExit=yes` is appropriate for the units which change the system state (e.g., mount some partition). See also [1] for the differences of simple and oneshot.

- `Type=notify`: identical to `Type=simple`, but with the stipulation that the daemon will send a signal to *systemd* when it is ready. The reference implementation for this notification is provided by *libsystemd-daemon.so*.

- `Type=dbus`: the service is considered ready when the specified `BusName` appears on DBus's system bus.

- `Type=idle`: *systemd* will delay execution of the service binary until all jobs are dispatched unless these take longer than 5s, where the service binary is started anyway. Other than that its behaviour is very similar to `Type=simple`. It should never be used for service ordering and is intended for helping with console output readability.

See the systemd.service(5)&#32;§&#8239;OPTIONS man page for a more detailed explanation of the `Type` values.

### Editing provided units

**This article or section needs expansion.**

**Reason:** We should fit "If `--runtime` is specified, the changes will be made temporarily in `/run/` and they will be lost on the next reboot." in here. An example would be passing debug flags to a service and not wanting to keep the changes permanently. (Discuss in Talk:Systemd)

To avoid conflicts with pacman, unit files provided by packages should not be directly edited. There are two safe ways to modify a unit without touching the original file: create a new unit file which overrides the original unit or create drop-in snippets which are applied on top of the original unit. For both methods, you must reload the unit afterwards to apply your changes. This can be done either by editing the unit with `systemctl edit` (which reloads the unit automatically) or by reloading all units with:

```
# systemctl daemon-reload

```

**Tip**

- You can use *systemd-delta* to see which unit files have been overridden or extended and what exactly has been changed.

- Use `systemctl cat *unit*` to view the content of a unit file and all associated drop-in snippets.

### Replacement unit files

**Note** The replacement units will keep on being used even if Pacman updates the original units in the future. This method makes system maintenance more difficult and therefore the next approach is preferred.
To replace the unit file `/usr/lib/systemd/system/*unit*`, create the file `/etc/systemd/system/*unit*` and reenable the unit to update the symlinks.

Alternatively, run:

```
# systemctl edit --full unit

```

This opens `/etc/systemd/system/*unit*` in your editor (copying the installed version if it does not exist yet) and automatically reloads it when you finish editing.

### Drop-in files

To create drop-in files for the unit file `/usr/lib/systemd/system/*unit*`, create the directory `/etc/systemd/system/*unit*.d/` and place *.conf* files there to override or add new options. Drop-in directories must always include the full unit name, including its extension like `.service`, `.socket`, or `.timer`, followed by `.d`. *systemd* will parse and apply these files on top of the original unit.

The easiest way to do this is to run:

```
# systemctl edit unit --drop-in=drop_in_name

```

This opens the file `/etc/systemd/system/*unit*.d/*drop_in_name*.conf` in your text editor (creating it if necessary) and automatically reloads the unit when you are done editing.
Omitting the `--drop-in=` option will result in systemd using the default file name `override.conf` .

**Note**

- The key must be still placed in the appropriate section in the override file.

- Not all keys can be overridden with drop-in files. For example, for changing `Conflicts=` a replacement file is necessary.

- You can use top-level drop-in files to affect all units of the same type. For example, a drop-in file in `/etc/systemd/system/service.d/` affects all *.service* units. You can see an example in #Notifying about failed services

### Revert to vendor version

To revert any changes to a unit made using `systemctl edit` do:

```
# systemctl revert unit

```

### Examples

For example, if you simply want to add an additional dependency to a unit, you may create the following file:

```
/etc/systemd/system/unit.d/customdependency.conf
```

```
[Unit]
Requires=new dependency
After=new dependency
```

As another example, in order to replace the `ExecStart` directive, create the following file:

```
/etc/systemd/system/unit.d/customexec.conf
```

```
[Service]
ExecStart=
ExecStart=new command
```

Note how `ExecStart` must be cleared before being re-assigned [2]. The same holds for every item that can be specified multiple times, e.g. `OnCalendar` for timers.

One more example to automatically restart a service:

```
/etc/systemd/system/unit.d/restart.conf
```

```
[Service]
Restart=always
RestartSec=30
```

### Service logging levels

For services that send logs directly to journald or syslog, you can control their verbosity by setting a numeric value between 0 and 6 for the `LogLevelMax=` parameter in the `[Service]` section using the methods described above. For example:

```
/etc/systemd/system/unit.d/override.conf
```

```
[Service]
LogLevelMax=3
```

The standard log levels are identical to those used to filter the journal. Setting a lower number excludes all higher and less important log messages from your journal.

### Suppressing a service's standard output

If a service is echoing stdout and/or stderr output, by default this will end up in the journal as well. This behavior can be suppressed by setting `StandardOutput=null` and/or `StandardError=null` in the `[Service]` section. Other values than `null` can be used to further tweak this behavior. See systemd.exec(5)&#32;§&#8239;LOGGING_AND_STANDARD_INPUT/OUTPUT.

## Targets

*systemd* uses *targets* to group units together via dependencies and as standardized synchronization points. They serve a similar purpose as runlevels but act a little differently. Each *target* is named instead of numbered and is intended to serve a specific purpose with the possibility of having multiple ones active at the same time. Some *target*s are implemented by inheriting all of the services of another *target* and adding additional services to it. There are *systemd* *target*s that mimic the common SystemVinit runlevels.

### Get current targets

The following should be used under *systemd* instead of running `runlevel`:

```
$ systemctl list-units --type=target

```

### Create custom target

The runlevels that held a defined meaning under sysvinit (i.e., 0, 1, 3, 5, and 6); have a 1:1 mapping with a specific *systemd* *target*. Unfortunately, there is no good way to do the same for the user-defined runlevels like 2 and 4. If you make use of those it is suggested that you make a new named *systemd* *target* as `/etc/systemd/system/*your target*` that takes one of the existing runlevels as a base (you can look at `/usr/lib/systemd/system/graphical.target` as an example), make a directory `/etc/systemd/system/*your target*.wants`, and then symlink the additional services from `/usr/lib/systemd/system/` that you wish to enable.

### Mapping between SysV runlevels and systemd targets

SysV Runlevel
systemd Target
Notes

0
poweroff.target
Halt the system.

1, s, single
rescue.target
Single user mode.

2, 4
multi-user.target
User-defined/Site-specific runlevels. By default, identical to 3.

3
multi-user.target
Multi-user, non-graphical. Users can usually login via multiple consoles or via the network.

5
graphical.target
Multi-user, graphical. Usually has all the services of runlevel 3 plus a graphical login.

6
reboot.target
Reboot

emergency
emergency.target
Emergency shell

### Change current target

In *systemd*, targets are exposed via *target units*. You can change them like this:

```
# systemctl isolate graphical.target

```

This will only change the current target, and has no effect on the next boot. This is equivalent to commands such as `telinit 3` or `telinit 5` in Sysvinit.

### Change default target to boot into

The standard target is `default.target`, which is a symlink to `graphical.target`. This roughly corresponds to the old runlevel 5.

To verify the current target with *systemctl*:

```
$ systemctl get-default

```

To change the default target to boot into, change the `default.target` symlink. With *systemctl*:

```
# systemctl set-default multi-user.target
```

```
Removed /etc/systemd/system/default.target.
Created symlink /etc/systemd/system/default.target -> /usr/lib/systemd/system/multi-user.target.
```

Alternatively, append one of the following kernel parameters to your boot loader:

- `systemd.unit=multi-user.target` (which roughly corresponds to the old runlevel 3),

- `systemd.unit=rescue.target` (which roughly corresponds to the old runlevel 1).

### Default target order

*systemd* chooses the `default.target` according to the following order:

- Kernel parameter shown above

- Symlink of `/etc/systemd/system/default.target`

- Symlink of `/usr/lib/systemd/system/default.target`

## systemd components

Some (not exhaustive) components of *systemd* are:

- kernel-install — to automatically move kernels and their respective initramfs images to the boot partition;

- systemd-analyze(1) — may be used to determine boot-up performance, statistics and retrieve other state and tracing information, and to verify the correctness of unit files. It is also used to access special functions useful for advanced debugging.

- systemd-boot — simple UEFI boot manager;

- systemd-creds — to securely store and retrieve credentials used by systemd units;

- systemd-cryptenroll — Enroll PKCS#11, FIDO2, TPM2 token/devices to LUKS2 encrypted volumes;

- systemd-firstboot — basic system setting initialization before first boot;

- systemd-homed — portable human-user accounts;

- systemd-logind(8) — session management;

- systemd-networkd — network configuration management;

- systemd-nspawn — light-weight namespace container;

- systemd-repart — creates partition tables, adds or grows partitions;

- systemd-resolved — network name resolution;

- systemd-run(1) / run0 — Temporarily and interactively acquire elevated or different privileges.

- systemd-stub(7) — a UEFI boot stub used for creating unified kernel images;

- systemd-sysusers(8) — creates system users and groups and adds users to groups at package installation or boot time;

- systemd-timesyncd — system time synchronization across the network;

- systemd/Journal — system logging;

- systemd/Timers — monotonic or realtime timers for controlling *.service* files or events, reasonable alternative to cron.

### systemd.mount - mounting

*systemd* is in charge of mounting the partitions and filesystems specified in `/etc/fstab`. The systemd-fstab-generator(8) translates all the entries in `/etc/fstab` into *systemd* units; this is performed at boot time and whenever the configuration of the system manager is reloaded.

*systemd* extends the usual fstab capabilities and offers additional mount options. These affect the dependencies of the mount unit. They can, for example, ensure that a mount is performed only once the network is up or only once another partition is mounted. The full list of specific *systemd* mount options, typically prefixed with `x-systemd.`, is detailed in systemd.mount(5)&#32;§&#8239;FSTAB.

An example of these mount options is *automounting*, which means mounting only when the resource is required rather than automatically at boot time. This is provided in fstab#Automount with systemd.

### GPT partition automounting

On UEFI-booted systems, GPT partitions such as `root`, `home`, `swap`, etc. can be mounted automatically following the Discoverable Partitions Specification. These partitions can thus be omitted from fstab, and if the root partition is automounted, then `root=` can be omitted from the kernel command line. See systemd-gpt-auto-generator(8).

The prerequisites are:

- When using mkinitcpio, the systemd hook is required to automount the `root` partition.

- All automounted partitions must reside on the same physical disk as the ESP.

- The correct GPT partition types must be set. See Partitioning#Partition scheme.

- The boot loader must set the LoaderDevicePartUUID EFI variable, so that the used EFI system partition can be identified. This is supported by systemd-boot, systemd-stub(7), Limine, GRUB (with *grub-mkconfig* generated `grub.cfg`; custom `grub.cfg` requires loading the bli module) and rEFInd (not enabled by default). This can be verified by running `bootctl` and checking if there is a line with `Partition:` under `Current Boot Loader` or `Current Stub` when booting via Unified kernel images.

*udev* will create symlinks to the discovered partitions which can be used to reference the partitions and volumes in configuration files.

**Tip** The automounting of a partition can be disabled by changing the partition's type GUID or setting the partition attribute bit 63 "do not automount", see gdisk#Prevent GPT partition automounting.

### /var

For `/var` automounting to work, the PARTUUID must match the SHA256 HMAC hash of the partition type UUID keyed by the machine ID. The required PARTUUID can be obtained using:

```
$ systemd-id128 -u var-partition-uuid

```

**Note** systemd-id128(1) reads the machine ID from `/etc/machine-id`, this makes it impossible to know the needed PARTUUID before the system is installed.

### systemd-sysvcompat

The primary role of systemd-sysvcompat (required by base) is to provide the traditional linux init binary. For *systemd*-controlled systems, `init` is just a symbolic link to its `systemd` executable.

In addition, it provides four convenience shortcuts that SysVinit users might be used to. The convenience shortcuts are halt(8), poweroff(8), reboot(8) and shutdown(8). Each one of those four commands is a symbolic link to `systemctl`, and is governed by *systemd* behavior. Therefore, the discussion at #Power management applies.

*systemd*-based systems can give up those System V compatibility methods by using the `init=` boot parameter (see, for example, /bin/init is in systemd-sysvcompat&#160;?) and *systemd* native `systemctl` command arguments.

### systemd-tmpfiles - temporary files

*systemd-tmpfiles* creates, deletes and cleans up volatile and temporary files and directories. It reads configuration files in `/etc/tmpfiles.d/` and `/usr/lib/tmpfiles.d/` to discover which actions to perform. Configuration files in the former directory take precedence over those in the latter directory.

Configuration files are usually provided together with service files, and they are named in the style of `/usr/lib/tmpfiles.d/*program*.conf`. For example, the Samba daemon expects the directory `/run/samba` to exist and to have the correct permissions. Therefore, the samba package ships with this configuration:

```
/usr/lib/tmpfiles.d/samba.conf
```

```
D /run/samba 0755 root root

```

Configuration files may also be used to write values into certain files on boot. For example, if you used `/etc/rc.local` to disable wakeup from USB devices with `echo USBE > /proc/acpi/wakeup`, you may use the following tmpfile instead:

```
/etc/tmpfiles.d/disable-usb-wake.conf
```

```
# Path Mode UID GID Age Argument
w! /proc/acpi/wakeup - - - - USBE

```

An exclamation mark `!` signifies that the line is only applied at boot. This will prevent re-enabling the wakeup trigger if systemd-tmpfiles is run again after boot (for example by the pacman hook).

It is possible to write multiple lines to the same file, either with `\n` in the argument or using the `w+` type on multiple lines (including the first one) for *appending*:

```
/etc/tmpfiles.d/disable-usb-wake.conf
```

```
# Path Mode UID GID Age Argument
w+! /proc/acpi/wakeup - - - - USBE
w+! /proc/acpi/wakeup - - - - LID0

```

See the systemd-tmpfiles(8) and tmpfiles.d(5) man pages for details.

**Note** This method may not work to set options in `/sys` since the *systemd-tmpfiles-setup* service may run before the appropriate device modules are loaded. In this case, you could check whether the module has a parameter for the option you want to set with `modinfo *module*` and set this option with a config file in /etc/modprobe.d. Otherwise, you will have to write a udev rule to set the appropriate attribute as soon as the device appears.

### Drop-in configuration files

**The factual accuracy of this article or section is disputed.**

**Reason:** This page is about PID 1 (init), and unit drop-ins are already mentioned. Drop-in is a generic concept, plus other systemd components have their dedicated wiki pages. Therefore this section doesn't seem to belong here. (Discuss in Talk:Systemd#YHNdnzj&#160;: Configuration files in conf.d / drop-in snippets: misplaced?)

Configuration files provided by packages should not be directly edited to avoid conflicts with pacman updates. For this, many (but not all) systemd packages provide a way to modify the configuration, but without touching the original file by creation of drop-in snippets. Check the package manual to see if drop-in configuration files are supported.

To create a drop-in configuration file for the unit file `/etc/systemd/*unit*.conf`, create the directory `/etc/systemd/*unit*.conf.d/` and place *.conf* files there to override or add new options. *systemd* will parse and apply these files on top of the original unit.

Check the overall configuration:

```
$ systemd-analyze cat-config systemd/unit.conf

```

The applied drop-in snippets file(s) and content will be listed at the end. Restart the service for the changes to take effect.

## Tips and tricks

### Socket activation

Some packages provide a *.socket* unit. For example, cups provides a `cups.socket` unit[3]. If `cups.socket` is enabled (and `cups.service` is left disabled), *systemd* will not start CUPS immediately; it will just listen to the appropriate sockets. Then, whenever a program attempts to connect to one of these CUPS sockets, *systemd* will start `cups.service` and transparently hand over control of these ports to the CUPS process.

### GUI configuration tools

- **SysD Manager** &#8212; A systemd GUI to manage service, timer, socket and other units.

https://github.com/plrigaux/sysd-manager || sysd-managerAUR

- **systemadm** &#8212; Graphical browser for *systemd* units. It can show the list of units, possibly filtered by type.

https://github.com/systemd/systemd-ui || systemd-ui

- **systemdGenie** &#8212; *systemd* management utility based on KDE technologies.

https://apps.kde.org/systemdgenie/ || systemdgenie

- **isd** &#8212; TUI for working with *systemd* units.

https://github.com/kainctl/isd || isd

### Running services after the network is up

To delay a service until after the network is up, include the following dependencies in the *.service* file:

```
/etc/systemd/system/foo.service
```

```
[Unit]
...
Wants=network-online.target
After=network-online.target
...
```

The network wait service of the network manager in use must also be enabled so that `network-online.target` properly reflects the network status.

- If using NetworkManager, `NetworkManager-wait-online.service` should be enabled together with `NetworkManager.service`. Check if this is the case with `systemctl is-enabled NetworkManager-wait-online.service`. If it is not enabled, then reenable `NetworkManager.service`.

- In the case of netctl, enable the `netctl-wait-online.service` (unless you are using *netctl-auto*; see FS#75836).

- If using systemd-networkd, `systemd-networkd-wait-online.service` should be enabled together with `systemd-networkd.service`. Check if this is the case with `systemctl is-enabled systemd-networkd-wait-online.service`. If it is not enabled, then reenable `systemd-networkd.service`.

For more detailed explanations, see the discussion in the Network configuration synchronization points.

If a service needs to perform DNS queries, it should additionally be ordered after `nss-lookup.target`:

```
/etc/systemd/system/foo.service
```

```
[Unit]
...
Wants=network-online.target
After=network-online.target nss-lookup.target
...
```

See systemd.special(7)&#32;§&#8239;Special Passive System Units.

For `nss-lookup.target` to have any effect it needs a service that pulls it in via `Wants=nss-lookup.target` and orders itself before it with `Before=nss-lookup.target`. Typically this is done by local DNS resolvers.

Check which active service, if any, is pulling in `nss-lookup.target` with:

```
$ systemctl list-dependencies --reverse nss-lookup.target

```

### Enable installed units by default

**This article or section needs expansion.**

**Reason:** How does it work with instantiated units? (Discuss in Talk:Systemd)

By default, Arch Linux does not make use of systemd presets, and does not enable most services on installation.

If you wish for systemd presets to be honored when packages are installed, you will need to create a a pacman hook in order to run `systemctl preset` or `systemctl preset-all` whenever a new systemd unit is installed. Something like

```
/etc/pacman.d/hooks/40-systemd-presets.hook
```

```
[Trigger]
Operation = Install
Type = Path
Target = usr/lib/systemd/system/*.service
Target = usr/lib/systemd/system/*.timer
Target = usr/lib/systemd/system/*.socket
Target = usr/lib/systemd/system/*.slice
Target = usr/lib/systemd/system/*.path
Target = usr/lib/systemd/system/*.target

[Action]
Description = Run systemctl preset
When = PostTransaction
Depends = systemd
NeedsTargets
# Alternatively, you could just run systemd preset-all.
# However, note that this will reset ALL services to the defaults,
# which is probably not what you want unless you have carefully configured
# your presets.
Exec = /etc/pacman.d/scripts/systemd-presets-hook

```

```
/etc/pacman.d/scripts/systemd-presets-hook
```

```
#!/bin/sh -e

while read -r f; do
 unit="${f##*/}"
 # alternatively, you could read all the units and pass them to systemctl preset in a single invocation
 systemctl preset "$unit"
done

```

Arch Linux ships with `/usr/lib/systemd/system-preset/99-default.preset` containing `disable *`. This causes *systemctl preset* to disable all units by default, such that when a new package is installed, the user must manually enable the unit.

To enable units by default instead, simply create a symlink from `/etc/systemd/system-preset/99-default.preset` to `/dev/null` or replace with a file containing `enable *` in order to override the configuration file. This will cause *systemctl preset* to enable all units that get installed—regardless of unit type—unless specified in another file in one *systemctl preset'*s configuration directories. User units are not affected. It is also possible to configure higher priority files with more specific rules on what should be enabled. See systemd.preset(5) for more information.

**Note** Enabling all units by default may cause problems with packages that contain two or more mutually exclusive units. *systemctl preset* is designed to be used by distributions and spins or system administrators. In the case where two conflicting units would be enabled, you should explicitly specify which one is to be disabled in a preset configuration file as specified in the systemd.preset(5) man page.

### Sandboxing application environments

See systemd/Sandboxing.

### Notifying about failed services

In order to notify about service failures, an `OnFailure=` directive needs to be added to the according service file, for example by using a drop-in configuration file. Adding this directive to every service unit can be achieved with a top-level drop-in configuration file. For details about top-level drop-ins, see systemd.unit(5).

Create a top-level drop-in for services:

```
/etc/systemd/system/service.d/toplevel-override.conf
```

```
[Unit]
OnFailure=failure-notification@%n.service
```

This adds `OnFailure=failure-notification@%n.service` to every service file. If *some_service_unit* fails, `failure-notification@*some_service_unit*.service` will be started to handle the notification delivery (or whatever task it is configured to perform).

Create the `failure-notification@.service` template unit:

```
/etc/systemd/system/failure-notification@.service
```

```
[Unit]
Description=Send a notification about a failed systemd unit

[Service]
Type=oneshot
ExecStart=/path/to/failure-notification.sh %i
# runs as a temporary user/group and enables several other security precautions
DynamicUser=true
```

You can create the `failure-notification.sh` script and define what to do or how to notify. Examples include sending e-mail, showing desktop notifications, using gotify, XMPP, etc. The `%i` will be the name of the failed service unit and will be passed as an argument to the script.

In order to prevent a recursion for starting instances of `failure-notification@.service` again and again if the start fails, create an empty drop-in configuration file with the same name as the top-level drop-in (the empty service-level drop-in configuration file takes precedence over the top-level drop-in and overrides the latter one):

```
# mkdir /etc/systemd/system/failure-notification@.service.d
# touch /etc/systemd/system/failure-notification@.service.d/toplevel-override.conf

```

### Notifying with e-mail

You can set up systemd to send an e-mail when a unit fails. Cron sends mail to `MAILTO` if the job outputs to stdout or stderr, but many jobs are setup to only output on error. First you need two files: an executable for sending the mail and a *.service* for starting the executable. For this example, the executable is just a shell script using `sendmail`, which is in packages that provide `smtp-forwarder`.

```
/usr/local/bin/systemd-email
```

```
#!/bin/sh

/usr/bin/sendmail -t <<ERRMAIL
To: $1
From: systemd <root@$HOSTNAME>
Subject: $2
Content-Transfer-Encoding: 8bit
Content-Type: text/plain; charset=UTF-8

$(systemctl status --full "$2")
ERRMAIL

```

Whatever executable you use, it should probably take at least two arguments as this shell script does: the address to send to and the unit file to get the status of. The *.service* we create will pass these arguments:

```
/etc/systemd/system/status_email_user@.service
```

```
[Unit]
Description=status email for %i to user

[Service]
Type=oneshot
ExecStart=/usr/local/bin/systemd-email address %i
User=nobody
Group=systemd-journal
```

Where `*user*` is the user being emailed and `*address*` is that user's email address. Although the recipient is hard-coded, the unit file to report on is passed as an instance parameter, so this one service can send email for many other units. At this point you can start `status_email_*user*@dbus.service` to verify that you can receive the emails.

Then simply edit the service you want emails for and add `OnFailure=status_email_*user*@%n.service` to the `[Unit]` section. `%n` passes the unit's name to the template.

**Note**

- If you set up sSMTP security according to sSMTP#Security the user `nobody` will not have access to `/etc/ssmtp/ssmtp.conf`, and the `systemctl start status_email_*user*@dbus.service` command will fail. One solution is to use `root` as the User in the `status_email_*user*@.service` unit.

- If you try to use `mail -s somelogs *address*` in your email script, `mail` will fork and systemd will kill the mail process when it sees your script exit. Make the mail non-forking by doing `mail -Ssendwait -s somelogs *address*`.

**Tip** Newer versions of systemd recommend using `DynamicUser=true` as a replacement for `User=nobody` which is now discouraged. See GitHub issue 428 for more details.

### Automatically turn off an external HDD at shutdown

See udisks#Automatically turn off an external HDD at shutdown.

**

### Index of configuration directives

An alphabetical index of configuration directives for various components of systemd can be found in systemd.directives(7).

### Control user unit as root

To control a systemd/User unit from root account:

（以下为节选，完整内容请见文末原文链接）

本文正文摘自 ArchWiki（wiki.archlinux.org）**（GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可））。原文：https://wiki.archlinux.org/title/Systemd。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# RFC 9110：HTTP 语义（IETF 标准全文节选）

> **官方原文转载**　·　来源：IETF RFC Editor　·　许可：IETF Trust Legal Provisions（RFC，允许全文复制/分发/翻译，须注明 IETF 与 RFC 编号）
>
> 原文：https://www.rfc-editor.org/rfc/rfc9110.txt
> 抓取日期：转载自官方原文

**摘要**：IETF STD 97 / RFC 9110「HTTP Semantics」节选：HTTP 无状态应用层协议定位、整体架构、客户端-服务器与中间盒模型、URI 方案与核心协议元素。IETF Trust Legal Provisions 允许全文复制、分发与翻译。

---

**来源：**IETF RFC Editor　·　**许可：**IETF Trust Legal Provisions（RFC，允许全文复制/分发/翻译，须注明 IETF 与 RFC 编号）**原文链接：**https://www.rfc-editor.org/rfc/rfc9110.txt**本文为 RFC 9110 开头部分（摘要与导言）的节选，完整规范请见 RFC Editor 原文。
﻿

Internet Engineering Task Force (IETF)                  R. Fielding, Ed.
Request for Comments: 9110                                         Adobe
STD: 97                                               M. Nottingham, Ed.
Obsoletes: 2818, 7230, 7231, 7232, 7233, 7235,                    Fastly
           7538, 7615, 7694                              J. Reschke, Ed.
Updates: 3864                                                 greenbytes
Category: Standards Track                                      June 2022
ISSN: 2070-1721

                             HTTP Semantics

Abstract

   The Hypertext Transfer Protocol (HTTP) is a stateless application-
   level protocol for distributed, collaborative, hypertext information
   systems.  This document describes the overall architecture of HTTP,
   establishes common terminology, and defines aspects of the protocol
   that are shared by all versions.  In this definition are core
   protocol elements, extensibility mechanisms, and the "http" and
   "https" Uniform Resource Identifier (URI) schemes.

   This document updates RFC 3864 and obsoletes RFCs 2818, 7231, 7232,
   7233, 7235, 7538, 7615, 7694, and portions of 7230.

Status of This Memo

   This is an Internet Standards Track document.

   This document is a product of the Internet Engineering Task Force
   (IETF).  It represents the consensus of the IETF community.  It has
   received public review and has been approved for publication by the
   Internet Engineering Steering Group (IESG).  Further information on
   Internet Standards is available in Section 2 of RFC 7841.

   Information about the current status of this document, any errata,
   and how to provide feedback on it may be obtained at
   https://www.rfc-editor.org/info/rfc9110.

Copyright Notice

   Copyright (c) 2022 IETF Trust and the persons identified as the
   document authors.  All rights reserved.

   This document is subject to BCP 78 and the IETF Trust's Legal
   Provisions Relating to IETF Documents
   (https://trustee.ietf.org/license-info) in effect on the date of
   publication of this document.  Please review these documents
   carefully, as they describe your rights and restrictions with respect
   to this document.  Code Components extracted from this document must
   include Revised BSD License text as described in Section 4.e of the
   Trust Legal Provisions and are provided without warranty as described
   in the Revised BSD License.

   This document may contain material from IETF Documents or IETF
   Contributions published or made publicly available before November
   10, 2008.  The person(s) controlling the copyright in some of this
   material may not have granted the IETF Trust the right to allow
   modifications of such material outside the IETF Standards Process.
   Without obtaining an adequate license from the person(s) controlling
   the copyright in such materials, this document may not be modified
   outside the IETF Standards Process, and derivative works of it may
   not be created outside the IETF Standards Process, except to format
   it for publication as an RFC or to translate it into languages other
   than English.

Table of Contents

   1.  Introduction
     1.1.  Purpose
     1.2.  History and Evolution
     1.3.  Core Semantics
     1.4.  Specifications Obsoleted by This Document
   2.  Conformance
     2.1.  Syntax Notation
     2.2.  Requirements Notation
     2.3.  Length Requirements
     2.4.  Error Handling
     2.5.  Protocol Version
   3.  Terminology and Core Concepts
     3.1.  Resources
     3.2.  Representations
     3.3.  Connections, Clients, and Servers
     3.4.  Messages
     3.5.  User Agents
     3.6.  Origin Server
     3.7.  Intermediaries
     3.8.  Caches
     3.9.  Example Message Exchange
   4.  Identifiers in HTTP
     4.1.  URI References
     4.2.  HTTP-Related URI Schemes
       4.2.1.  http URI Scheme
       4.2.2.  https URI Scheme
       4.2.3.  http(s) Normalization and Comparison
       4.2.4.  Deprecation of userinfo in http(s) URIs
       4.2.5.  http(s) References with Fragment Identifiers
     4.3.  Authoritative Access
       4.3.1.  URI Origin
       4.3.2.  http Origins
       4.3.3.  https Origins
       4.3.4.  https Certificate Verification
       4.3.5.  IP-ID Reference Identity
   5.  Fields
     5.1.  Field Names
     5.2.  Field Lines and Combined Field Value
     5.3.  Field Order
     5.4.  Field Limits
     5.5.  Field Values
     5.6.  Common Rules for Defining Field Values
       5.6.1.  Lists (#rule ABNF Extension)
         5.6.1.1.  Sender Requirements
         5.6.1.2.  Recipient Requirements
       5.6.2.  Tokens
       5.6.3.  Whitespace
       5.6.4.  Quoted Strings
       5.6.5.  Comments
       5.6.6.  Parameters
       5.6.7.  Date/Time Formats
   6.  Message Abstraction
     6.1.  Framing and Completeness
     6.2.  Control Data
     6.3.  Header Fields
     6.4.  Content
       6.4.1.  Content Semantics
       6.4.2.  Identifying Content
     6.5.  Trailer Fields
       6.5.1.  Limitations on Use of Trailers
       6.5.2.  Processing Trailer Fields
     6.6.  Message Metadata
       6.6.1.  Date
       6.6.2.  Trailer
   7.  Routing HTTP Messages
     7.1.  Determining the Target Resource
     7.2.  Host and :authority
     7.3.  Routing Inbound Requests
       7.3.1.  To a Cache
       7.3.2.  To a Proxy
       7.3.3.  To the Origin
     7.4.  Rejecting Misdirected Requests
     7.5.  Response Correlation
     7.6.  Message Forwarding
       7.6.1.  Connection
       7.6.2.  Max-Forwards
       7.6.3.  Via
     7.7.  Message Transformations
     7.8.  Upgrade
   8.  Representation Data and Metadata
     8.1.  Representation Data
     8.2.  Representation Metadata
     8.3.  Content-Type
       8.3.1.  Media Type
       8.3.2.  Charset
       8.3.3.  Multipart Types
     8.4.  Content-Encoding
       8.4.1.  Content Codings
         8.4.1.1.  Compress Coding
         8.4.1.2.  Deflate Coding
         8.4.1.3.  Gzip Coding
     8.5.  Content-Language
       8.5.1.  Language Tags
     8.6.  Content-Length
     8.7.  Content-Location
     8.8.  Validator Fields
       8.8.1.  Weak versus Strong
       8.8.2.  Last-Modified
         8.8.2.1.  Generation
         8.8.2.2.  Comparison
       8.8.3.  ETag
         8.8.3.1.  Generation
         8.8.3.2.  Comparison
         8.8.3.3.  Example: Entity Tags Varying on Content-Negotiated
                 Resources
   9.  Methods
     9.1.  Overview
     9.2.  Common Method Properties
       9.2.1.  Safe Methods
       9.2.2.  Idempotent Methods
       9.2.3.  Methods and Caching
     9.3.  Method Definitions
       9.3.1.  GET
       9.3.2.  HEAD
       9.3.3.  POST
       9.3.4.  PUT
       9.3.5.  DELETE
       9.3.6.  CONNECT
       9.3.7.  OPTIONS
       9.3.8.  TRACE
   10. Message Context
     10.1.  Request Context Fields
       10.1.1.  Expect
       10.1.2.  From
       10.1.3.  Referer
       10.1.4.  TE
       10.1.5.  User-Agent
     10.2.  Response Context Fields
       10.2.1.  Allow
       10.2.2.  Location
       10.2.3.  Retry-After
       10.2.4.  Server
   11. HTTP Authentication
     11.1.  Authentication Scheme
     11.2.  Authentication Parameters
     11.3.  Challenge and Response
     11.4.  Credentials
     11.5.  Establishing a Protection Space (Realm)
     11.6.  Authenticating Users to Origin Servers
       11.6.1.  WWW-Authenticate
       11.6.2.  Authorization
       11.6.3.  Authentication-Info
     11.7.  Authenticating Clients to Proxies
       11.7.1.  Proxy-Authenticate
       11.7.2.  Proxy-Authorization
       11.7.3.  Proxy-Authentication-Info
   12. Content Negotiation
     12.1.  Proactive Negotiation
     12.2.  Reactive Negotiation
     12.3.  Request Content Negotiation
     12.4.  Content Negotiation Field Features
       12.4.1.  Absence
       12.4.2.  Quality Values
       12.4.3.  Wildcard Values
     12.5.  Content Negotiation Fields
       12.5.1.  Accept
       12.5.2.  Accept-Charset
       12.5.3.  Accept-Encoding
       12.5.4.  Accept-Language
       12.5.5.  Vary
   13. Conditional Requests
     13.1.  Preconditions
       13.1.1.  If-Match
       13.1.2.  If-None-Match
       13.1.3.  If-Modified-Since
       13.1.4.  If-Unmodified-Since
       13.1.5.  If-Range
     13.2.  Evaluation of Preconditions
       13.2.1.  When to Evaluate
       13.2.2.  Precedence of Preconditions
   14. Range Requests
     14.1.  Range Units
       14.1.1.  Range Specifiers
       14.1.2.  Byte Ranges
     14.2.  Range
     14.3.  Accept-Ranges
     14.4.  Content-Range
     14.5.  Partial PUT
     14.6.  Media Type multipart/byteranges
   15. Status Codes
     15.1.  Overview of Status Codes
     15.2.  Informational 1xx
       15.2.1.  100 Continue
       15.2.2.  101 Switching Protocols
     15.3.  Successful 2xx
       15.3.1.  200 OK
       15.3.2.  201 Created
       15.3.3.  202 Accepted
       15.3.4.  203 Non-Authoritative Information
       15.3.5.  204 No Content
       15.3.6.  205 Reset Content
       15.3.7.  206 Partial Content
         15.3.7.1.  Single Part
         15.3.7.2.  Multiple Parts
         15.3.7.3.  Combining Parts
     15.4.  Redirection 3xx
       15.4.1.  300 Multiple Choices
       15.4.2.  301 Moved Permanently
       15.4.3.  302 Found
       15.4.4.  303 See Other
       15.4.5.  304 Not Modified
       15.4.6.  305 Use Proxy
       15.4.7.  306 (Unused)
       15.4.8.  307 Temporary Redirect
       15.4.9.  308 Permanent Redirect
     15.5.  Client Error 4xx
       15.5.1.  400 Bad Request
       15.5.2.  401 Unauthorized
       15.5.3.  402 Payment Required
       15.5.4.  403 Forbidden
       15.5.5.  404 Not Found
       15.5.6.  405 Method Not Allowed
       15.5.7.  406 Not Acceptable
       15.5.8.  407 Proxy Authentication Required
       15.5.9.  408 Request Timeout
       15.5.10. 409 Conflict
       15.5.11. 410 Gone
       15.5.12. 411 Length Required
       15.5.13. 412 Precondition Failed
       15.5.14. 413 Content Too Large
       15.5.15. 414 URI Too Long
       15.5.16. 415 Unsupported Media Type
       15.5.17. 416 Range Not Satisfiable
       15.5.18. 417 Expectation Failed
       15.5.19. 418 (Unused)
       15.5.20. 421 Misdirected Request
       15.5.21. 422 Unprocessable Content
       15.5.22. 426 Upgrade Required
     15.6.  Server Error 5xx
       15.6.1.  500 Internal Server Error
       15.6.2.  501 Not Implemented
       15.6.3.  502 Bad Gateway
       15.6.4.  503 Service Unavailable
       15.6.5.  504 Gateway Timeout
       15.6.6.  505 HTTP Version Not Supported
   16. Extending HTTP
     16.1.  Method Extensibility
       16.1.1.  Method Registry
       16.1.2.  Considerations for New Methods
     16.2.  Status Code Extensibility
       16.2.1.  Status Code Registry
       16.2.2.  Considerations for New Status Codes
     16.3.  Field Extensibility
       16.3.1.  Field Name Registry
       16.3.2.  Considerations for New Fields
         16.3.2.1.  Considerations for New Field Names
         16.3.2.2.  Considerations for New Field Values
     16.4.  Authentication Scheme Extensibility
       16.4.1.  Authentication Scheme Registry
       16.4.2.  Considerations for New Authentication Schemes
     16.5.  Range Unit Extensibility
       16.5.1.  Range Unit Registry
       16.5.2.  Considerations for New Range Units
     16.6.  Content Coding Extensibility
       16.6.1.  Content Coding Registry
       16.6.2.  Considerations for New Content Codings
     16.7.  Upgrade Token Registry
   17. Security Considerations
     17.1.  Establishing Authority
     17.2.  Risks of Intermediaries
     17.3.  Attacks Based on File and Path Names
     17.4.  Attacks Based on Command, Code, or Query Injection
     17.5.  Attacks via Protocol Element Length
     17.6.  Attacks Using Shared-Dictionary Compression
     17.7.  Disclosure of Personal Information
     17.8.  Privacy of Server Log Information
     17.9.  Disclosure of Sensitive Information in URIs
     17.10. Application Handling of Field Names
     17.11. Disclosure of Fragment after Redirects
     17.12. Disclosure of Product Information
     17.13. Browser Fingerprinting
     17.14. Validator Retention
     17.15. Denial-of-Service Attacks Using Range
     17.16. Authentication Considerations
       17.16.1.  Confidentiality of Credentials
       17.16.2.  Credentials and Idle Clients
       17.16.3.  Protection Spaces
       17.16.4.  Additional Response Fields
   18. IANA Considerations
     18.1.  URI Scheme Registration
     18.2.  Method Registration
     18.3.  Status Code Registration
     18.4.  Field Name Registration
     18.5.  Authentication Scheme Registration
     18.6.  Content Coding Registration
     18.7.  Range Unit Registration
     18.8.  Media Type Registration
     18.9.  Port Registration
     18.10. Upgrade Token Registration
   19. References
     19.1.  Normative References
     19.2.  Informative References
   Appendix A.  Collected ABNF
   Appendix B.  Changes from Previous RFCs
     B.1.  Changes from RFC 2818
     B.2.  Changes from RFC 7230
     B.3.  Changes from RFC 7231
     B.4.  Changes from RFC 7232
     B.5.  Changes from RFC 7233
     B.6.  Changes from RFC 7235
     B.7.  Changes from RFC 7538
     B.8.  Changes from RFC 7615
     B.9.  Changes from RFC 7694
   Acknowledgements
   Index
   Authors' Addresses

1.  Introduction

1.1.  Purpose

   The Hypertext Transfer Protocol (HTTP) is a family of stateless,
   application-level, request/response protocols that share a generic
   interface, extensible semantics, and self-descriptive messages to
   enable flexible interaction with network-based hypertext information
   systems.

   HTTP hides the details of how a service is implemented by presenting
   a uniform interface to clients that is independent of the types of
   resources provided.  Likewise, servers do not need to be aware of
   each client's purpose: a request can be considered in isolation
   rather than being associated with a specific type of client or a
   predetermined sequence of application steps.  This allows general-
   purpose implementations to be used effectively in many different
   contexts, reduces interaction complexity, and enables independent
   evolution over time.

   HTTP is also designed for use as an intermediation protocol, wherein
   proxies and gateways can translate non-HTTP information systems into
   a more generic interface.

   One consequence of this flexibility is that the protocol cannot be
   defined in terms of what occurs behind the interface.  Instead, we
   are limited to defining the syntax of communication, the intent of
   received communication, and the expected behavior of recipients.  If
   the communication is considered in isolation, then successful actions
   ought to be reflected in corresponding changes to the observable
   interface provided by servers.  However, since multiple clients might
   act in parallel and perhaps at cross-purposes, we cannot require that
   such changes be observable beyond the scope of a single response.

1.2.  History and Evolution

   HTTP has been the primary information transfer protocol for the World
   Wide Web since its introduction in 1990.  It began as a trivial
   mechanism for low-latency requests, with a single method (GET) to
   request transfer of a presumed hypertext document identified by a
   given pathname.  As the Web grew, HTTP was extended to enclose
   requests and responses within messages, transfer arbitrary data
   formats using MIME-like media types, and route requests through
   intermediaries.  These protocols were eventually defined as HTTP/0.9
   and HTTP/1.0 (see [HTTP/1.0]).

   HTTP/1.1 was designed to refine the protocol's features while
   retaining compatibility with the existing text-based messaging
   syntax, improving its interoperability, scalability, and robustness
   across the Internet.  This included length-based data delimiters for
   both fixed and dynamic (chunked) content, a consistent framework for
   content negotiation, opaque validators for conditional requests,
   cache controls for better cache consistency, range requests for
   partial updates, and default persistent connections.  HTTP/1.1 was
   introduced in 1995 and published on the Standards Track in 1997
   [RFC2068], revised in 1999 [RFC2616], and revised again in 2014
   ([RFC7230] through [RFC7235]).

   HTTP/2 ([HTTP/2]) introduced a multiplexed session layer on top of
   the existing TLS and TCP protocols for exchanging concurrent HTTP
   messages with efficient field compression and server push.  HTTP/3
   ([HTTP/3]) provides greater independence for concurrent messages by
   using QUIC as a secure multiplexed transport over UDP instead of TCP.

   All three major versions of HTTP rely on the semantics defined by
   this document.  They have not obsoleted each other because each one
   has specific benefits and limitations depending on the context of
   use.  Implementations are expected to choose the most appropriate
   transport and messaging syntax for their particular context.

   This revision of HTTP separates the definition of semantics (this
   document) and caching ([CACHING]) from the current HTTP/1.1 messaging
   syntax ([HTTP/1.1]) to allow each major protocol version to progress
   independently while referring to the same core semantics.

1.3.  Core Semantics

   HTTP provides a uniform interface for interacting with a resource
   (Section 3.1) -- regardless of its type, nature, or implementation --
   by sending messages that manipulate or transfer representations
   (Section 3.2).

   Each message is either a request or a response.  A client constructs
   request messages that communicate its intentions and routes those
   messages toward an identified origin server.  A server listens for
   requests, parses each message received, interprets the message
   semantics in relation to the identified target resource, and responds
   to that request with one or more response messages.  The client
   examines received responses to see if its intentions were carried
   out, determining what to do next based on the status codes and
   content received.

   HTTP semantics include the intentions defined by each request method
   (Section 9), extensions to those semantics that might be described in
   request header fields, status codes that describe the response
   (Section 15), and other control data and resource metadata that might
   be given in response fields.

   Semantics also include representation metadata that describe how
   content is intended to be interpreted by a recipient, request header
   fields that might influence content selection, and the various
   selection algorithms that are collectively referred to as "content
   negotiation" (Section 12).

1.4.  Specifications Obsoleted by This Document

   +============================================+===========+=====+
   | Title                                      | Reference | See |
   +============================================+===========+=====+
   | HTTP Over TLS                              | [RFC2818] | B.1 |
   +--------------------------------------------+-----------+-----+
   | HTTP/1.1 Message Syntax and Routing [*]    | [RFC7230] | B.2 |
   +--------------------------------------------+-----------+-----+
   | HTTP/1.1 Semantics and Content             | [RFC7231] | B.3 |
   +--------------------------------------------+-----------+-----+
   | HTTP/1.1 Conditional Requests              | [RFC7232] | B.4 |
   +--------------------------------------------+-----------+-----+
   | HTTP/1.1 Range Requests                    | [RFC7233] | B.5 |
   +--------------------------------------------+-----------+-----+
   | HTTP/1.1 Authentication                    | [RFC7235] | B.6 |
   +--------------------------------------------+-----------+-----+
   | HTTP Status Code 308 (Permanent Redirect)  | [RFC7538] | B.7 |
   +--------------------------------------------+-----------+-----+
   | HTTP Authentication-Info and Proxy-        | [RFC7615] | B.8 |
   | Authentication-Info Response Header Fields |           |     |
   +--------------------------------------------+-----------+-----+
   | HTTP Client-Initiated Content-Encoding     | [RFC7694] | B.9 |
   +--------------------------------------------+-----------+-----+

                               Table 1

   [*] This document only obsoletes the portions of RFC 7230 that are
   independent of the HTTP/1.1 messaging syntax and connection
   management; the remaining bits of RFC 7230 are obsoleted by
   "HTTP/1.1" [HTTP/1.1].

2.  Conformance

2.1.  Syntax Notation

   This specification uses the Augmented Backus-Naur Form (ABNF)
   notation of [RFC5234], extended with the notation for case-
   sensitivity in strings defined in [RFC7405].

   It also uses a list extension, defined in Section 5.6.1, that allows
   for compact definition of comma-separated lists using a "#" operator
   (similar to how the "*" operator indicates repetition).  Appendix A
   shows the collected grammar with all list operators expanded to
   standard ABNF notation.

   As a convention, ABNF rule names prefixed with "obs-" denote obsolete
   grammar rules that appear for historical reasons.

   The following core rules are included by reference, as defined in
   Appendix B.1 of [RFC5234]: ALPHA (letters), CR (carriage return),
   CRLF (CR LF), CTL (controls), DIGIT (decimal 0-9), DQUOTE (double
   quote), HEXDIG (hexadecimal 0-9/A-F/a-f), HTAB (horizontal tab), LF
   (line feed), OCTET (any 8-bit sequence of data), SP (space), and
   VCHAR (any visible US-ASCII character).

   Section 5.6 defines some generic syntactic components for field
   values.

   This specification uses the terms "character", "character encoding
   scheme", "charset", and "protocol element" as they are defined in
   [RFC6365].

2.2.  Requirements Notation

   The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
   "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
   "OPTIONAL" in this document are to be interpreted as described in
   BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all
   capitals, as shown here.

   This specification targets conformance criteria according to the role
   of a participant in HTTP communication.  Hence, requirements are
   placed on senders, recipients, clients, servers, user agents,
   intermediaries, origin servers, proxies, gateways, or caches,
   depending on what behavior is being constrained by the requirement.
   Additional requirements are placed on implementations, resource
   owners, and protocol element registrations when they apply beyond the
   scope of a single communication.

   The verb "generate" is used instead of "send" where a requirement
   applies only to implementations that create the protocol element,
   rather than an implementation that forwards a received element
   downstream.

   An implementation is considered conformant if it complies with all of
   the requirements associated with the roles it partakes in HTTP.

   A sender MUST NOT generate protocol elements that do not match the
   grammar defined by the corresponding ABNF rules.  Within a given
   message, a sender MUST NOT generate protocol elements or syntax
   alternatives that are only allowed to be generated by participants in
   other roles (i.e., a role that the sender does not have for that
   message).

   Conformance to HTTP includes both conformance to the particular
   messaging syntax of the protocol version in use and conformance to
   the semantics of protocol elements sent.  For example, a client that
   claims conformance to HTTP/1.1 but fails to recognize the features
   required of HTTP/1.1 recipients will fail to interoperate with
   servers that adjust their responses in accordance with those claims.
   Features that reflect user choices, such as content negotiation and
   user-selected extensions, can impact application behavior beyond the
   protocol stream; sending protocol elements that inaccurately reflect
   a user's choices will confuse the user and inhibit choice.

   When an implementation fails semantic conformance, recipients of that
   implementation's messages will eventually develop workarounds to
   adjust their behavior accordingly.  A recipient MAY employ such
   workarounds while remaining conformant to this protocol if the
   workarounds are limited to the implementations at fault.  For
   example, servers often scan portions of the User-Agent field value,
   and user agents often scan the Server field value, to adjust their
   own behavior with respect to known bugs or poorly chosen defaults.

2.3.  Length Requirements

   A recipient SHOULD parse a received protocol element defensively,
   with only marginal expectations that the element will conform to its
   ABNF grammar and fit within a reasonable buffer size.

   HTTP does not have specific length limitations for many of its
   protocol elements because the lengths that might be appropriate will
   vary widely, depending on the deployment context and purpose of the
   implementation.  Hence, interoperability between senders and
   recipients depends on shared expectations regarding what is a
   reasonable length for each protocol element.  Furthermore, what is
   commonly understood to be a reasonable length for some protocol
   elements has changed over the course of the past three decades of
   HTTP use and is expected to continue changing in the future.

   At a minimum, a recipient MUST be able to parse and process protocol
   element lengths that are at least as long as the values that it
   generates for those same protocol elements in other messages.  For
   example, an origin server that publishes very long URI references to
   its own resources needs to be able to parse and process those same
   references when received as a target URI.

   Many received protocol elements are only parsed to the extent
   necessary to identify and forward that element downstream.  For
   example, an intermediary might parse a received field into its field
   name and field value components, but then forward the field without
   further parsing inside the field value.

2.4.  Error Handling

   A recipient MUST interpret a received protocol element according to
   the semantics defined for it by this specification, including
   extensions to this specification, unless the recipient has determined
   (through experience or configuration) that the sender incorrectly
   implements what is implied by those semantics.  For example, an
   origin server might disregard the contents of a received
   Accept-Encoding header field if inspection of the User-Agent header
   field indicates a specific implementation version that is known to
   fail on receipt of certain content codings.

   Unless noted otherwise, a recipient MAY attempt to recover a usable
   protocol element from an invalid construct.  HTTP does not define
   specific error handling mechanisms except when they have a direct
   impact on security, since different applications of the protocol
   require different error handling strategies.  For example, a Web
   browser might wish to transparently recover from a response where the
   Location header field doesn't parse according to the ABNF, whereas a
   systems control client might consider any form of error recovery to
   be dangerous.

   Some requests can be automatically retried by a client in the event
   of an underlying connection failure, as described in Section 9.2.2.

2.5.  Protocol Version

   HTTP's version number consists of two decimal digits separated by a
   "." (period or decimal point).  The first digit (major version)
   indicates the messaging syntax, whereas the second digit (minor
   version) indicates the highest minor version within that major
   version to which the sender is conformant (able to understand for
   future communication).

   While HTTP's core semantics don't change between protocol versions,
   their expression "on the wire" can change, and so the HTTP version
   number changes when incompatible changes are made to the wire format.
   Additionally, HTTP allows incremental, backwards-compatible changes
   to be made to the protocol without changing its version through the
   use of defined extension points (Section 16).

   The protocol version as a whole indicates the sender's conformance
   with the set of requirements laid out in that version's corresponding
   specification(s).  For example, the version "HTTP/1.1" is defined by
   the combined specifications of this document, "HTTP Caching"
   [CACHING], and "HTTP/1.1" [HTTP/1.1].

   HTTP's major version number is incremented when an incompatible
   message syntax is introduced.  The minor number is incremented when
   changes made to the protocol have the effect of adding to the message
   semantics or implying additional capabilities of the sender.

   The minor version advertises the sender's communication capabilities
   even when the sender is only using a backwards-compatible subset of
   the protocol, thereby letting the recipient know that more advanced
   features can be used in response (by servers) or in future requests
   (by clients).

   When a major version of HTTP does not define any minor versions, the
   minor version "0" is implied.  The "0" is used when referring to that
   protocol within elements that require a minor version identifier.

3.  Terminology and Core Concepts

   HTTP was created for the World Wide Web (WWW) architecture and has
   evolved over time to support the scalability needs of a worldwide
   hypertext system.  Much of that architecture is reflected in the
   terminology used to define HTTP.

3.1.  Resources

   The target of an HTTP request is called a "resource".  HTTP does not
   limit the nature of a resource; it merely defines an interface that
   might
（以下为节选，完整内容请见文末原文链接）

本文正文摘自 IETF RFC Editor**（IETF Trust Legal Provisions（RFC，允许全文复制/分发/翻译，须注明 IETF 与 RFC 编号））。原文：https://www.rfc-editor.org/rfc/rfc9110.txt。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# vLLM 官方快速上手：离线推理、OpenAI 兼容服务与分布式部署（Apache-2.0 全文）

> **官方原文转载**　·　来源：vLLM 官方文档（docs.vllm.ai）　·　许可：Apache-2.0（vLLM 官方文档）
>
> 原文：https://docs.vllm.ai/en/latest/getting_started/quickstart.html
> 抓取日期：转载自官方原文

**摘要**：vLLM 官方文档 Quickstart 全文：离线批量推理、OpenAI 兼容 API 服务器启动、分布式张量并行 / 流水线并行部署，以及常用参数与性能优化要点。

---

**来源：**vLLM 官方文档（docs.vllm.ai）　·　**许可：**Apache-2.0（vLLM 官方文档）**原文链接：**https://docs.vllm.ai/en/latest/getting_started/quickstart.html

## Quickstart¶

This guide will help you quickly get started with vLLM to perform:

- Offline batched inference

- Online serving

## Prerequisites¶

- OS: Linux

- Python: 3.11 -- 3.14

Note

vLLM also works on macOS with vLLM-Metal for Apple Silicon GPU acceleration. See the GPU installation guide and select the "Apple Silicon" tab.

## Installation¶

NVIDIA CUDAAMD ROCmIntel GPUGoogle TPUAscend NPUApple Silicon (Mac)

If you are using NVIDIA GPUs, you can install vLLM using pip directly.

It's recommended to use uv, a very fast Python environment manager, to create and manage Python environments. Please follow the documentation to install `uv`. After installing `uv`, you can create a new Python environment and install vLLM using the following commands:

```
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --torch-backend=auto
vllm download-kernels

```

`vllm download-kernels` installs precompiled kernels that vLLM otherwise downloads and compiles at startup, which can add several minutes on Hopper and newer GPUs. See the installation guide for details.

`uv` can automatically select the appropriate PyTorch index at runtime by inspecting the installed CUDA driver version via `--torch-backend=auto` (or `UV_TORCH_BACKEND=auto`). To select a specific backend (e.g., `cu126`), set `--torch-backend=cu126` (or `UV_TORCH_BACKEND=cu126`).

Another delightful way is to use `uv run` with `--with [dependency]` option, which allows you to run commands such as `vllm serve` without creating any permanent environment:

```
uv run --with vllm vllm --help

```

You can also use conda to create and manage Python environments. You can install `uv` to the conda environment through `pip` if you want to manage it within the environment.

```
conda create -n myenv python=3.12 -y
conda activate myenv
pip install --upgrade uv
uv pip install vllm --torch-backend=auto

```

If you are using AMD GPUs, you can install vLLM using `uv`.

It's recommended to use uv, as it gives the extra index higher priority than the default index. `uv` is also a very fast Python environment manager, to create and manage Python environments. Please follow the documentation to install `uv`. After installing `uv`, you can create a new Python environment and install vLLM using the following commands:

```
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --extra-index-url https://wheels.vllm.ai/rocm/

```

Note

It currently supports Python 3.12, ROCm 7.0 and `glibc >= 2.35`.

Note

Note that, previously, docker images were published using AMD's docker release pipeline and were located `rocm/vllm-dev`. This is being deprecated by using vLLM's docker release pipeline.

Tip

A nightly Docker image is also available as vllm/vllm-openai-rocm:nightly for testing the latest development builds.

vLLM supports Intel GPUs through the XPU backend. Pre-built XPU wheels will be available soon.

Official Docker images for Intel GPUs are added to the vLLM release starting from v0.26.0. Nightly Docker image is also available as vllm/vllm-openai-xpu:nightly.

Tip

For more detailed instructions, including building from source and Docker image setup, please refer to the GPU installation guide and select the "Intel XPU" tab.

To run vLLM on Google TPUs, you need to install the `vllm-tpu` package.

```
uv pip install vllm-tpu

```

Note

For more detailed instructions, including Docker, installing from source, and troubleshooting, please refer to the vLLM on TPU documentation.

If you are using Ascend NPUs, you can run vLLM through vLLM Ascend, a community-maintained hardware plugin.

Follow the installation instructions in the vLLM Ascend quick start.

Note

Ascend setup depends on your NPU hardware and CANN version. For supported versions, Docker images, and troubleshooting, please refer to the vLLM Ascend documentation.

If you are using Apple Silicon Macs, you can use vLLM-Metal for GPU-accelerated inference via Apple's Metal framework.

Follow the installation instructions in the vLLM-Metal documentation.

Note

vLLM-Metal uses MLX instead of PyTorch as the compute backend and requires MLX-optimized models from the mlx-community on Hugging Face.

Tip

For more detailed instructions, please refer to the GPU installation guide and select the "Apple Silicon" tab.

Note

For more detail and non-CUDA platforms, please refer to the installation guide for specific instructions on how to install vLLM.

## Offline Batched Inference¶

With vLLM installed, you can start generating texts for list of input prompts (i.e. offline batch inferencing). See the example script: examples/basic/offline_inference/basic.py

The first line of this example imports the classes LLM and SamplingParams:

- LLM is the main class for running offline inference with vLLM engine.

- SamplingParams specifies the parameters for the sampling process.

```
from vllm import LLM, SamplingParams

```

The next section defines a list of input prompts and sampling parameters for text generation. The sampling temperature is set to `0.8` and the nucleus sampling probability is set to `0.95`. You can find more information about the sampling parameters here.

Important

By default, vLLM will use sampling parameters recommended by model creator by applying the `generation_config.json` from the Hugging Face model repository if it exists. In most cases, this will provide you with the best results by default if SamplingParams is not specified.

However, if vLLM's default sampling parameters are preferred, please set `generation_config="vllm"` when creating the LLM instance.

```
prompts = [
 "Hello, my name is",
 "The president of the United States is",
 "The capital of France is",
 "The future of AI is",
]
sampling_params = SamplingParams(temperature=0.8, top_p=0.95)

```

The LLM class initializes vLLM's engine and the OPT-125M model for offline inference. The list of supported models can be found here.

```
llm = LLM(model="facebook/opt-125m")

```

Note

By default, vLLM downloads models from Hugging Face. If you would like to use models from ModelScope, set the environment variable `VLLM_USE_MODELSCOPE` before initializing the engine.

```
export VLLM_USE_MODELSCOPE=True

```

Now, the fun part! The outputs are generated using `llm.generate`. It adds the input prompts to the vLLM engine's waiting queue and executes the vLLM engine to generate the outputs with high throughput. The outputs are returned as a list of `RequestOutput` objects, which include all of the output tokens.

```
outputs = llm.generate(prompts, sampling_params)

for output in outputs:
 prompt = output.prompt
 generated_text = output.outputs[0].text
 print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")

```

Note

The `llm.generate` method does not automatically apply the model's chat template to the input prompt. Therefore, if you are using an Instruct model or Chat model, you should manually apply the corresponding chat template to ensure the expected behavior. Alternatively, you can use the `llm.chat` method and pass a list of messages which have the same format as those passed to OpenAI's `client.chat.completions`:

Code

```
# Using tokenizer to apply chat template
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("/path/to/chat_model")
messages_list = [
 [{"role": "user", "content": prompt}]
 for prompt in prompts
]
texts = tokenizer.apply_chat_template(
 messages_list,
 tokenize=False,
 add_generation_prompt=True,
)

# Generate outputs
outputs = llm.generate(texts, sampling_params)

# Print the outputs.
for output in outputs:
 prompt = output.prompt
 generated_text = output.outputs[0].text
 print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")

# Using chat interface.
outputs = llm.chat(messages_list, sampling_params)
for idx, output in enumerate(outputs):
 prompt = prompts[idx]
 generated_text = output.outputs[0].text
 print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")

```

## Online Serving¶

vLLM can be deployed as a server that implements the OpenAI API protocol. This allows vLLM to be used as a drop-in replacement for applications using OpenAI API.
By default, it starts the server at `http://localhost:8000`. You can specify the address with `--host` and `--port` arguments. The server currently hosts one model at a time and implements endpoints such as list models, create chat completion, and create completion endpoints.

Run the following command to start the vLLM server with the Qwen2.5-1.5B-Instruct model:

```
vllm serve Qwen/Qwen2.5-1.5B-Instruct

```

Note

By default, the server uses a predefined chat template stored in the tokenizer.
You can learn about overriding it here.

Important

By default, the server applies `generation_config.json` from the huggingface model repository if it exists. This means the default values of certain sampling parameters can be overridden by those recommended by the model creator.

To disable this behavior, please pass `--generation-config vllm` when launching the server.

This server can be queried in the same format as OpenAI API. For example, to list the models:

```
curl http://localhost:8000/v1/models

```

You can pass in the argument `--api-key` or environment variable `VLLM_API_KEY` to enable the server to check for API key in the header.
You can pass multiple keys after `--api-key`, and the server will accept any of the keys passed, this can be useful for key rotation.

### OpenAI Completions API with vLLM¶

Once your server is started, you can query the model with input prompts:

```
curl http://localhost:8000/v1/completions \
 -H "Content-Type: application/json" \
 -d '{
 "model": "Qwen/Qwen2.5-1.5B-Instruct",
 "prompt": "San Francisco is a",
 "max_tokens": 7,
 "temperature": 0
 }'

```

Since this server is compatible with OpenAI API, you can use it as a drop-in replacement for any applications using OpenAI API. For example, another way to query the server is via the `openai` Python package:

Code

```
from openai import OpenAI

# Modify OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"
client = OpenAI(
 api_key=openai_api_key,
 base_url=openai_api_base,
)
completion = client.completions.create(
 model="Qwen/Qwen2.5-1.5B-Instruct",
 prompt="San Francisco is a",
)
print("Completion result:", completion)

```

A more detailed client example can be found here: examples/basic/offline_inference/basic.py

### OpenAI Chat Completions API with vLLM¶

vLLM is designed to also support the OpenAI Chat Completions API. The chat interface is a more dynamic, interactive way to communicate with the model, allowing back-and-forth exchanges that can be stored in the chat history. This is useful for tasks that require context or more detailed explanations.

You can use the create chat completion endpoint to interact with the model:

```
curl http://localhost:8000/v1/chat/completions \
 -H "Content-Type: application/json" \
 -d '{
 "model": "Qwen/Qwen2.5-1.5B-Instruct",
 "messages": [
 {"role": "system", "content": "You are a helpful assistant."},
 {"role": "user", "content": "Who won the world series in 2020?"}
 ]
 }'

```

Alternatively, you can use the `openai` Python package:

Code

```
from openai import OpenAI
# Set OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"

client = OpenAI(
 api_key=openai_api_key,
 base_url=openai_api_base,
)

chat_response = client.chat.completions.create(
 model="Qwen/Qwen2.5-1.5B-Instruct",
 messages=[
 {"role": "system", "content": "You are a helpful assistant."},
 {"role": "user", "content": "Tell me a joke."},
 ],
)
print("Chat response:", chat_response)

```

## On Attention Backends¶

Currently, vLLM supports multiple backends for efficient Attention computation across different platforms and accelerator architectures. It automatically selects the most performant backend compatible with your system and model specifications.

If desired, you can also manually set the backend of your choice using the `--attention-backend` CLI argument:

```
# For online serving
vllm serve Qwen/Qwen2.5-1.5B-Instruct --attention-backend FLASH_ATTN

# For offline inference
python script.py --attention-backend FLASHINFER

```

Some of the available backend options include:

- On NVIDIA CUDA: `FLASH_ATTN` or `FLASHINFER`.

- On AMD ROCm: `TRITON_ATTN`, `ROCM_ATTN`, `ROCM_AITER_FA`, `ROCM_AITER_UNIFIED_ATTN`, `TRITON_MLA`, `ROCM_AITER_MLA` or `ROCM_AITER_TRITON_MLA`.

- On Intel XPU: `FLASH_ATTN`, `TRITON_ATTN`, `TRITON_MLA`, `XPU_MLA_SPARSE`, `TORCH_SDPA` or `TURBOQUANT`.

Tip

FlashInfer is installed with vLLM, but its precompiled kernels are not. Run `vllm download-kernels` after installing or upgrading vLLM so they are not downloaded and compiled at startup.

 October 10, 2026本文正文摘自 **vLLM 官方文档（docs.vllm.ai）**（Apache-2.0（vLLM 官方文档））。原文：https://docs.vllm.ai/en/latest/getting_started/quickstart.html。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---


# PyTorch 官方教程：Learn the Basics（张量 / DataLoader / 神经网络 / 自动求导 / 优化）

> **官方原文转载**　·　来源：PyTorch 官方教程（pytorch.org）　·　许可：BSD 3-Clause（PyTorch 官方教程）
>
> 原文：https://pytorch.org/tutorials/beginner/basics/intro.html
> 抓取日期：转载自官方原文

**摘要**：PyTorch 官方入门教程全文：张量基础操作与 GPU 加速、自定义 Dataset 与 DataLoader、数据变换、用 nn.Module 构建神经网络、autograd 自动求导、优化循环与模型保存/加载。

---

**来源：**PyTorch 官方教程（pytorch.org）　·　**许可：**BSD 3-Clause（PyTorch 官方教程）**原文链接：**https://pytorch.org/tutorials/beginner/basics/intro.html
Rate this Page

★
★
★
★
★

beginner/basics/intro

Run in Google Colab
Colab

Download Notebook
Notebook

View on GitHub
GitHub

Note

Go to the end
to download the full example code.

**Learn the Basics** ||
Quickstart ||
Tensors ||
Datasets & DataLoaders ||
Transforms ||
Build Model ||
Autograd ||
Optimization ||
Save & Load Model

## Learn the Basics#

Created On: Feb 09, 2021 | Last Updated: Jan 20, 2026 | Last Verified: Nov 05, 2024

Authors:
Suraj Subramanian,
Seth Juarez,
Cassie Breviu,
Dmitry Soshnikov,
Ari Bornstein

Most machine learning workflows involve working with data, creating models, optimizing model
parameters, and saving the trained models. This tutorial introduces you to a complete ML workflow
implemented in PyTorch, with links to learn more about each of these concepts.

We’ll use the FashionMNIST dataset to train a neural network that predicts if an input image belongs
to one of the following classes: T-shirt/top, Trouser, Pullover, Dress, Coat, Sandal, Shirt, Sneaker,
Bag, or Ankle boot.

This tutorial assumes a basic familiarity with Python and Deep Learning concepts.

## Running the Tutorial Code#

You can run this tutorial in a couple of ways:

- **In the cloud**: This is the easiest way to get started! Each section has a “Run in Google Colab” link at the top, which opens an integrated notebook in Google Colab with the code in a fully-hosted environment.

- **Locally**: This option requires you to set up PyTorch and TorchVision first on your local machine (installation instructions). Download the notebook or copy the code into your favorite IDE.

## How to Use this Guide#

If you’re familiar with other deep learning frameworks, check out the 0. Quickstart first
to quickly familiarize yourself with PyTorch’s API.

If you’re new to deep learning frameworks, head right into the first section of our step-by-step guide: 1. Tensors.

0. Quickstart
1. Tensors
2. Datasets and DataLoaders
3. Transforms
4. Build Model
5. Automatic Differentiation
6. Optimization Loop
7. Save, Load and Use Model

`Download Jupyter notebook: intro.ipynb`

`Download Python source code: intro.py`

`Download zipped: intro.zip`

本文正文摘自 **PyTorch 官方教程（pytorch.org）**（BSD 3-Clause（PyTorch 官方教程））。原文：https://pytorch.org/tutorials/beginner/basics/intro.html。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。

---
