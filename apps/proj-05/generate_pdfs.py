#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三层卧式模块化机箱 - 全套PDF文档生成脚本"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pylibs'))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, Image, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle
from reportlab.graphics import renderPDF

# 注册中文字体
FONT_PATHS = [
    r'C:\Windows\Fonts\msyh.ttc',      # 微软雅黑
    r'C:\Windows\Fonts\simhei.ttf',    # 黑体
    r'C:\Windows\Fonts\simsun.ttc',    # 宋体
]
FONT_NAME = 'ChineseFont'
FONT_BOLD = 'ChineseFontBold'
for fp in FONT_PATHS:
    if os.path.exists(fp):
        try:
            pdfmetrics.registerFont(TTFont(FONT_NAME, fp))
            pdfmetrics.registerFont(TTFont(FONT_BOLD, fp))
            print(f"已注册字体: {fp}")
            break
        except:
            continue

# 颜色定义
PRIMARY = HexColor('#2F5496')
SECONDARY = HexColor('#D6E4F0')
ACCENT = HexColor('#C00000')
LIGHT_GRAY = HexColor('#F2F2F2')
DARK_GRAY = HexColor('#404040')

# 样式
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontName=FONT_BOLD, fontSize=22, leading=30,
    textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=6*mm
)
subtitle_style = ParagraphStyle(
    'CustomSubtitle', parent=styles['Normal'],
    fontName=FONT_NAME, fontSize=11, leading=16,
    textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=10*mm
)
h1_style = ParagraphStyle(
    'CustomH1', parent=styles['Heading1'],
    fontName=FONT_BOLD, fontSize=16, leading=22,
    textColor=PRIMARY, spaceBefore=8*mm, spaceAfter=4*mm
)
h2_style = ParagraphStyle(
    'CustomH2', parent=styles['Heading2'],
    fontName=FONT_BOLD, fontSize=13, leading=18,
    textColor=PRIMARY, spaceBefore=5*mm, spaceAfter=3*mm
)
h3_style = ParagraphStyle(
    'CustomH3', parent=styles['Heading3'],
    fontName=FONT_BOLD, fontSize=11, leading=15,
    textColor=DARK_GRAY, spaceBefore=3*mm, spaceAfter=2*mm
)
body_style = ParagraphStyle(
    'CustomBody', parent=styles['Normal'],
    fontName=FONT_NAME, fontSize=10, leading=16,
    textColor=black, alignment=TA_JUSTIFY, spaceAfter=2*mm
)
note_style = ParagraphStyle(
    'CustomNote', parent=styles['Normal'],
    fontName=FONT_NAME, fontSize=9, leading=13,
    textColor=HexColor('#666666'), alignment=TA_LEFT, spaceAfter=2*mm
)
cell_style = ParagraphStyle(
    'CellStyle', parent=styles['Normal'],
    fontName=FONT_NAME, fontSize=9, leading=12,
    textColor=black, alignment=TA_LEFT
)
cell_center_style = ParagraphStyle(
    'CellCenterStyle', parent=styles['Normal'],
    fontName=FONT_NAME, fontSize=9, leading=12,
    textColor=black, alignment=TA_CENTER
)
cell_header_style = ParagraphStyle(
    'CellHeaderStyle', parent=styles['Normal'],
    fontName=FONT_BOLD, fontSize=9, leading=12,
    textColor=white, alignment=TA_CENTER
)

BASE_DIR = r'D:\网站全栈项目\项目005机箱\三层卧式模块化机箱_项目完整交付包'

def make_table(headers, data, col_widths=None):
    """创建带样式的表格"""
    table_data = []
    # 表头
    header_row = [Paragraph(h, cell_header_style) for h in headers]
    table_data.append(header_row)
    # 数据行
    for row in data:
        table_data.append([Paragraph(str(c), cell_style) for c in row])

    if col_widths is None:
        col_widths = [170/len(headers)*mm] * len(headers)

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#BFBFBF')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t

def add_page_number(canvas, doc):
    """添加页码"""
    canvas.saveState()
    canvas.setFont(FONT_NAME, 8)
    canvas.setFillColor(HexColor('#999999'))
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(A4[0]/2, 15*mm, f'第 {page_num} 页')
    canvas.drawString(20*mm, 15*mm, '三层卧式模块化机箱项目')
    canvas.drawRightString(A4[0]-20*mm, 15*mm, '机密文件 · 仅供内部使用')
    canvas.restoreState()

def create_pdf(filename, title, subtitle, story_items):
    """创建PDF文件"""
    filepath = os.path.join(BASE_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    doc = SimpleDocTemplate(
        filepath, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=25*mm
    )
    story = []
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(subtitle, subtitle_style))
    # 分隔线
    story.append(Spacer(1, 2*mm))
    story.extend(story_items)
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"已生成: {filename}")
    return filepath

# ============================================================
# 1. 通用基准尺寸与公差规范
# ============================================================
def gen_01_benchmark():
    story = []
    story.append(Paragraph('一、文档说明', h1_style))
    story.append(Paragraph('本文档定义三层卧式模块化机箱全版本通用设计基准，所有设计、加工、检验均以本文档为唯一依据。基准一经冻结，未经书面授权不得修改。', body_style))

    story.append(Paragraph('二、整机外框基准', h1_style))
    story.append(make_table(
        ['基准项', '标称尺寸', '公差要求', '检验方法'],
        [
            ['主机架外轮廓（宽×深×高）', '450 × 360 × 400 mm', '±0.5 mm', '游标卡尺测量三面，对角线偏差≤0.5mm'],
            ['主机架材质', 'SPCC冷轧钢板 1.5mm', '—', '材质证明书+厚度千分尺'],
            ['表面处理', '哑光黑喷塑，膜厚60~80μm', '—', '膜厚仪+色差仪'],
            ['整机重量（空箱）', '约 12.5 kg', '±0.5 kg', '电子秤称重'],
        ],
        [45*mm, 40*mm, 25*mm, 60*mm]
    ))

    story.append(Paragraph('三、层间高度基准', h1_style))
    story.append(make_table(
        ['层级', '内净空高度', '公差要求', '功能说明'],
        [
            ['硬盘仓（上层）', '50 mm', '±0.3 mm', '适配3.5寸硬盘+减震位'],
            ['主板仓（中层）', '200 mm', '±0.3 mm', '兼容全高双槽显卡（120mm+）'],
            ['电源仓（下层）', '100 mm', '±0.3 mm', '适配标准ATX电源（86mm高）'],
            ['层间隔板厚度', '1.2 mm', '±0.1 mm', 'SPCC喷塑，带导风圈位'],
        ],
        [35*mm, 30*mm, 25*mm, 80*mm]
    ))

    story.append(Paragraph('四、导轨安装基准', h1_style))
    story.append(make_table(
        ['基准项', '参数', '公差', '说明'],
        [
            ['导轨规格', '12英寸二节钢珠导轨', '±0.2 mm', '标准件采购，统一孔距'],
            ['导轨承载', '单副≥35 kg', '—', '满足满载硬盘+主板重量'],
            ['硬盘-主板层中心距', '125 mm', '±0.2 mm', '层间垂直中心距'],
            ['主板-电源层中心距', '200 mm', '±0.2 mm', '层间垂直中心距'],
            ['导轨安装孔距', '标准12英寸孔距', '±0.1 mm', '与标准导轨匹配'],
        ],
        [40*mm, 40*mm, 25*mm, 65*mm]
    ))

    story.append(Paragraph('五、背部对接基准', h1_style))
    story.append(make_table(
        ['基准项', '参数', '公差', '检验方法'],
        [
            ['背板安装面距后端面', '15 mm', '±0.2 mm', '深度尺测量'],
            ['连接器中心对齐', '与各模块几何中心重合', '±0.2 mm', '工装对位检验'],
            ['电源盲插对接公差', '24Pin+8Pin', '±0.3 mm', '插拔测试≥1000次'],
            ['数据盲插对接公差', 'Mini SAS HD 36Pin', '±0.2 mm', '插拔测试≥500次'],
            ['信号盲插对接公差', '10Pin主板信号', '±0.3 mm', '键位防呆检验'],
        ],
        [40*mm, 40*mm, 25*mm, 65*mm]
    ))

    story.append(Paragraph('六、风道接口基准', h1_style))
    story.append(make_table(
        ['基准项', '参数', '公差', '说明'],
        [
            ['每层进出风等效口径', 'φ100 mm', '±0.5 mm', '层板导风圈中心对齐'],
            ['风道密封压缩量', '30%', '±5%', '阻燃泡棉1mm厚'],
            ['前进风风扇规格', '12025 PWM ×6', '—', 'DC12V，≥60CFM/个'],
            ['后排风风扇规格', '12025 PWM ×3', '—', 'DC12V，≥60CFM/个'],
            ['三层风道隔离', '独立无串风', '—', '层间隔板+密封泡棉'],
        ],
        [40*mm, 35*mm, 25*mm, 70*mm]
    ))

    story.append(Paragraph('七、面板安装基准', h1_style))
    story.append(make_table(
        ['基准项', '参数', '公差', '说明'],
        [
            ['面板安装孔位（4点）', '420 × 370 mm', '±0.3 mm', '孔距对角线测量'],
            ['前面板尺寸', '450 × 400 mm', '±0.3 mm', 'SPCC 1.5mm喷塑'],
            ['后面板尺寸', '450 × 400 mm', '±0.3 mm', '带IO/PCI/电源孔'],
            ['面板与机架间隙', '≤0.3 mm', '—', '四周均匀间隙'],
            ['快拆卡扣数量', '4个', '—', '弹簧卡扣式 镀锌钢'],
        ],
        [40*mm, 35*mm, 25*mm, 70*mm]
    ))

    story.append(Paragraph('八、基准变更管理', h1_style))
    story.append(Paragraph('1. 本基准为全版本冻结基准，任何修改须提交《基准变更申请单》，经设计、工艺、品质三方会签后生效。', body_style))
    story.append(Paragraph('2. 变更生效后，须同步更新所有相关图纸、BOM、检验规范，并通知在制订单调整。', body_style))
    story.append(Paragraph('3. 紧急变更须经技术总监书面批准，事后7个工作日内补齐变更流程。', body_style))

    create_pdf(r'01_设计文档\01_通用基准尺寸与公差规范.pdf',
        '通用基准尺寸与公差规范',
        '三层卧式模块化机箱 · 全版本冻结基准 · V1.0',
        story)

# ============================================================
# 2. 模块化架构设计说明书
# ============================================================
def gen_02_architecture():
    story = []
    story.append(Paragraph('一、产品概述', h1_style))
    story.append(Paragraph('三层卧式模块化机箱是一款面向高密度存储与计算场景的模块化服务器机箱。采用三层抽屉式模块化架构，上层为12盘位热插拔存储单元，中层为双30×30主板计算单元，下层为双ATX冗余电源单元。全机采用通用主机架+功能模块的设计理念，支持分钟级运维、功能解耦、按需配置与平滑升级。', body_style))

    story.append(Paragraph('二、核心设计理念', h1_style))
    story.append(make_table(
        ['设计理念', '具体体现', '用户价值'],
        [
            ['模块化架构', '六大模块独立设计，通用接口互换', '分钟级运维，故障模块快速更换'],
            ['功能解耦', '存储/计算/电源三层物理隔离', '单层故障不影响其他层运行'],
            ['按需配置', '单/双主板、单/双电源灵活组合', '降低入门成本，保护投资'],
            ['平滑升级', '通用主机架全版本兼容', '后续可随时升级配置'],
            ['三层独立风道', '每层独立进出风，无串风', '散热效率最大化，硬件寿命延长'],
        ],
        [30*mm, 65*mm, 75*mm]
    ))

    story.append(Paragraph('三、六大模块拆分', h1_style))
    story.append(Paragraph('整机由六大模块组成，各模块通过标准化接口与通用主机架连接：', body_style))

    modules = [
        ('M1 通用主机架', '整机承载主体，450×360×400mm SPCC 1.5mm喷塑，集成三层导轨安装座、背部背板框架、层间隔板。所有版本100%通用。'),
        ('M2 存储抽屉模块', '12盘位热插拔存储单元，6列2排布局，适配12块3.5寸硬盘。内置SATA背板、Mini SAS HD接口、硬盘状态指示灯、抽拉导轨、锁止拉手。'),
        ('M3 计算抽屉模块', '支持单/双30×30规格主板，兼容全高双槽显卡。含主板安装托盘、铜柱组、显卡固定支架、理线架、CPU导风罩、供电盲插转接板。'),
        ('M4 电源抽屉模块', '支持单/双ATX电源布置，双电源版为冗余隔舱设计。含电源舱框架、固定支架、减震胶垫、抽拉导轨、配电背板、前部拉手。'),
        ('M5 前面板模块', '集成4/6组120mm进风风扇、防尘网、前置IO（USB-A×2+Type-C+音频）、电源开关与指示灯、快拆卡扣。'),
        ('M6 后面板模块', '集成3组120mm排风风扇、主板IO挡板、PCI挡板、AC品字输入插座、固定手拧螺丝。'),
    ]
    for name, desc in modules:
        story.append(Paragraph(name, h3_style))
        story.append(Paragraph(desc, body_style))

    story.append(Paragraph('四、三大标准接口', h1_style))
    story.append(make_table(
        ['接口类型', '技术规格', '对接公差', '防呆设计', '插拔寿命'],
        [
            ['机械导轨接口', '12英寸二节钢珠导轨+锥形定位销+前部锁止拉手', '±0.2mm', '定位销不对称', '≥1000次'],
            ['电气盲插接口', '电源24Pin+8Pin / 数据Mini SAS HD 36Pin', '±0.2~0.3mm', '上下/左右不对称', '≥500~1000次'],
            ['风道密封接口', '模块四周阻燃密封海绵+层板导风圈', '±0.5mm', '导风圈定位', '永久'],
        ],
        [30*mm, 55*mm, 22*mm, 30*mm, 23*mm]
    ))

    story.append(Paragraph('五、散热系统设计', h1_style))
    story.append(Paragraph('采用三层独立风道设计，每层前进后出，物理隔离无串风：', body_style))
    story.append(make_table(
        ['风道层级', '风扇配置', '标称风量', '典型风阻', '设计目标'],
        [
            ['硬盘仓风道', '前2进+后1排', '单扇60CFM，总120CFM', '≤8Pa', '硬盘满载≤45℃'],
            ['主板仓风道', '前2进+后1排', '单扇60CFM，总120CFM', '≤10Pa', 'CPU满载≤75℃'],
            ['电源仓风道', '前2进+后1排（电源自带风扇）', '电源风扇独立散热', '≤5Pa', '电源满载≤65℃'],
        ],
        [28*mm, 35*mm, 40*mm, 22*mm, 45*mm]
    ))

    story.append(Paragraph('六、版本兼容性', h1_style))
    story.append(Paragraph('所有版本共用同一通用主机架与接口基准，可快速切换衍生：', body_style))
    story.append(make_table(
        ['版本', '主板配置', '电源配置', '亚克力件', '可升级路径'],
        [
            ['全金属标准版', '双主板', '双电源冗余', '无', '→方案A/B'],
            ['方案A基础透明款', '双主板', '双电源冗余', '顶盖+导风罩+SSD托架', '→方案B'],
            ['方案B透明定制款', '双主板', '双电源冗余', '顶盖+观察窗+导风罩+SSD托架', '→概念版'],
            ['概念展示版', '双主板', '双电源冗余', '全透明外壳+灯效', '—'],
        ],
        [35*mm, 22*mm, 28*mm, 45*mm, 30*mm]
    ))

    create_pdf(r'01_设计文档\02_模块化架构设计说明书.pdf',
        '模块化架构设计说明书',
        '三层卧式模块化机箱 · 架构定义与接口规范 · V1.0',
        story)

# ============================================================
# 3. 亚克力替代方案评估报告
# ============================================================
def gen_03_acrylic():
    story = []
    story.append(Paragraph('一、评估背景', h1_style))
    story.append(Paragraph('为提升产品视觉表现、降低部分非承重件成本、满足展示型客户需求，对机箱中可使用亚克力替代的部件进行系统性评估。评估原则：非承重、非高温、无强制电磁屏蔽要求的部件可替换；核心承重、强电、精密对接部件保留金属。', body_style))

    story.append(Paragraph('二、替代边界划分', h1_style))
    story.append(Paragraph('✅ 推荐用亚克力替代的部件', h2_style))
    story.append(make_table(
        ['类别', '具体部件', '替代理由'],
        [
            ['外观面板类', '机箱顶盖、左右侧板、前面板进风区、面板拉手与指示灯灯罩', '非承重，视觉展示需求高'],
            ['内部功能件', 'CPU区域导风罩、2.5寸SSD硬盘托架、内部理线架、风道密封导风圈', '非承重，绝缘性优于金属'],
            ['辅助标识件', '模块前部拉手装饰片、硬盘仓位指示灯导光条', '透光需求，亚克力天然适配'],
        ],
        [25*mm, 75*mm, 70*mm]
    ))

    story.append(Paragraph('❌ 禁止/不建议替代的部件', h2_style))
    story.append(make_table(
        ['类别', '具体部件', '保留理由'],
        [
            ['核心承重结构', '通用主机架、层间隔板、导轨安装座、各模块抽屉主体框架', '承重要求高，亚克力刚性不足'],
            ['高温强电区域', '电源仓框架、电源固定支架、主板安装托盘', '高温环境，亚克力耐温有限'],
            ['精密对接与屏蔽件', '后面板总成、背部背板框架、抽拉导轨、盲插连接器安装位', '精度要求高，需电磁屏蔽'],
        ],
        [25*mm, 75*mm, 70*mm]
    ))

    story.append(Paragraph('三、三档替代方案', h1_style))
    story.append(make_table(
        ['方案', '替换范围', '适用场景', '特点'],
        [
            ['展示样机版', '左右透明侧板+透明顶盖+亚克力导风罩+2.5寸SSD亚克力托架', '展会展示、产品演示、桌面创意主机', '全透呈现模块化结构，科技感强'],
            ['轻量定制版', '单面透明侧板+磨砂亚克力顶盖+亚克力理线架+指示灯导光件', '小型办公、民用存储主机', '兼顾基础屏蔽性与美观度'],
            ['内部优化版', '亚克力导风罩+SSD亚克力托架+内部理线架', '批量定制、成本敏感型订单', '外部无感知，内部轻量化+绝缘提升'],
        ],
        [25*mm, 60*mm, 45*mm, 40*mm]
    ))

    story.append(Paragraph('四、材料选型规范', h1_style))
    story.append(make_table(
        ['应用部位', '材料等级', '厚度', '关键性能要求'],
        [
            ['外观面板（顶盖/侧板）', 'V0级阻燃亚克力', '3~4mm', '耐温≥80℃，防刮硬化涂层'],
            ['CPU导风罩', '耐高温高透亚克力', '2mm', '长期耐温≥85℃，V0阻燃'],
            ['SSD托架', '黑色半透亚克力', '3mm', 'V0阻燃，孔位镶铜套'],
            ['理线架', '黑色磨砂亚克力', '2mm', '3M背胶固定，绝缘'],
            ['导光条', '透明亚克力', 'φ5mm', '入光面磨砂网点，透光率≥90%'],
            ['观察窗', '高透亚克力', '4mm', 'V0阻燃，内表面防刮涂层'],
        ],
        [35*mm, 35*mm, 20*mm, 80*mm]
    ))

    story.append(Paragraph('五、替换关键注意事项', h1_style))
    notes = [
        '厚度选择：外观面板4mm及以上，内部小件2~3mm；安装孔位建议镶金属铜套，防止螺丝滑牙。',
        '静电防护：大面积使用建议做防静电喷涂，核心硬件做好接地，避免静电积累损坏硬件。',
        '耐温等级：靠近CPU、显卡、电源的部件必须选用耐温≥85℃的高温亚克力，普通亚克力会变形。',
        '阻燃要求：工业/机房场景必须选V0级阻燃亚克力，离火3秒内自熄，无滴落。',
        '风道密封：亚克力与金属结构对接处粘贴阻燃泡棉，保证风道气密性，防止串风。',
        '电磁屏蔽：大面积亚克力替代会降低电磁屏蔽性能，工业/机房场景建议保留金属侧板或做屏蔽处理。',
        '成本控制：亚克力件单件成本高于钣金，但可减少喷塑工序，综合成本在小批量时有优势。',
    ]
    for i, n in enumerate(notes, 1):
        story.append(Paragraph(f'{i}. {n}', body_style))

    create_pdf(r'01_设计文档\03_亚克力替代方案评估报告.pdf',
        '亚克力替代方案评估报告',
        '三层卧式模块化机箱 · 材料替代可行性分析 · V1.0',
        story)

# ============================================================
# 4. SKU产品矩阵说明
# ============================================================
def gen_04_sku():
    story = []
    story.append(Paragraph('一、产品矩阵总览', h1_style))
    story.append(Paragraph('本项目共规划4个配置版本，包含3个可量产版本和1个概念展示版本。所有版本共用同一通用主机架与接口基准，可快速切换衍生。', body_style))

    story.append(make_table(
        ['版本名称', '核心配置', '产品定位', '适用场景', '单台成本估算', '成本指数'],
        [
            ['全金属标准版', '全钣金结构，无亚克力件；12盘热插拔+双主板+双电源冗余', '基础量产款', '工业存储、边缘服务器、机房部署', '2700~2900元', '100%'],
            ['方案A：基础透明款', '磨砂顶盖+金属侧板+透明导风罩+SSD托架+理线架', '入门透明定制款', '批量标配定制、桌面存储主机', '2815~3000元', '104%~106%'],
            ['方案B：透明定制款', '磨砂顶盖+侧板观察窗+透明导风罩+SSD托架+理线架', '主力透明定制款', '桌面工作站、展示型项目、中小企业定制', '2840~3080元', '107%~110%'],
            ['概念展示版', '全透明亚克力外壳+灯效优化+模块识别色', '营销展示样机', '展会、产品发布、方案演示、品牌宣传', '3230~3670元', '130%~140%'],
        ],
        [28*mm, 45*mm, 25*mm, 40*mm, 25*mm, 17*mm]
    ))

    story.append(Paragraph('二、全版本成本构成对比', h1_style))
    story.append(make_table(
        ['成本项', '全金属标准版', '方案A基础透明款', '方案B透明定制款', '概念展示版'],
        [
            ['通用金属结构件', '640元', '640元', '640元', '640元'],
            ['功能模块结构件', '1234.4元', '1234.4元', '1234.4元', '1234.4元'],
            ['亚克力件', '0元', '180~220元', '265~310元', '540~620元'],
            ['接口与电气件', '546元', '546元', '546元', '546元'],
            ['表面处理与装配', '280~480元', '210~370元', '210~370元', '430~730元'],
            ['整机合计', '2700~2900元', '2810~3010元', '2895~3100元', '3390~3770元'],
        ],
        [30*mm, 35*mm, 35*mm, 35*mm, 35*mm]
    ))

    story.append(Paragraph('三、各版本详细配置', h1_style))

    skus = [
        ('SKU-001 全金属标准版',
         '基础量产款，面向工业存储、边缘服务器、机房部署等对可靠性和电磁屏蔽要求高的场景。全钣金结构，无亚克力件，最大化结构强度与屏蔽性能。',
         ['机箱结构：全SPCC钣金，哑光黑喷塑', '存储：12盘位3.5寸热插拔，SATA背板', '计算：双30×30主板，双全高显卡支持', '电源：双ATX冗余，独立隔舱', '散热：6进3出120mm PWM风扇，三层独立风道', '接口：前置USB-A×2+Type-C+音频，后置标准ATX IO', '成本：2700~2900元（不含核心硬件）']),
        ('SKU-002 方案A 基础透明款',
         '入门透明定制款，面向批量标配定制、桌面存储主机等场景。在标准版基础上增加磨砂半透顶盖和透明CPU导风罩，提升视觉效果的同时保留金属侧板的屏蔽性能。',
         ['机箱结构：SPCC钣金+磨砂半透亚克力顶盖', '亚克力件：ACY-001顶盖+ACY-002导风罩+ACY-004 SSD托架+ACY-005理线架', '存储：12盘位3.5寸热插拔，支持SSD扩展', '计算：双30×30主板，双全高显卡支持', '电源：双ATX冗余，独立隔舱', '散热：6进3出120mm PWM风扇，三层独立风道', '成本：2815~3000元（不含核心硬件）']),
        ('SKU-003 方案B 透明定制款（主推）',
         '主力透明定制款，面向桌面工作站、展示型项目、中小企业定制等场景。在方案A基础上增加侧板透明观察窗，可直接观察内部显卡运行状态，是量产版中的主推配置。',
         ['机箱结构：SPCC钣金+磨砂半透顶盖+侧板透明观察窗', '亚克力件：ACY-001顶盖+ACY-002导风罩+ACY-003观察窗+ACY-004 SSD托架+ACY-005理线架', '观察窗：200×150mm高透亚克力，居中偏上，对准显卡区域', '存储：12盘位3.5寸热插拔，支持SSD扩展', '计算：双30×30主板，双全高显卡支持', '电源：双ATX冗余，独立隔舱', '散热：6进3出120mm PWM风扇，三层独立风道', '成本：2840~3080元（不含核心硬件）']),
        ('SKU-004 概念展示版',
         '营销展示样机，面向展会、产品发布、方案演示、品牌宣传等场景。全透明亚克力外壳，内部三层结构完全可见，配合RGB灯效和模块识别色，视觉冲击力强。不建议批量生产。',
         ['机箱结构：全透明亚克力外壳（顶盖+左右侧板+前面板进风区）', '亚克力件：ACY-G-01全透顶盖+ACY-G-02全透侧板×2+ACY-G-03前面板+ACY-002蓝透导风罩+ACY-G-04识别色装饰条+ACY-G-05灯效系统', '灯效：RGB灯带+导光板+控制器，支持多模式切换', '模块识别色：存储层蓝色/计算层绿色/电源层橙色，三色分区标识', '存储：12盘位3.5寸热插拔', '计算：双30×30主板，双全高显卡支持', '电源：双ATX冗余，独立隔舱', '成本：3230~3670元（不含核心硬件，样机级小批量价）']),
    ]
    for name, desc, specs in skus:
        story.append(Paragraph(name, h2_style))
        story.append(Paragraph(desc, body_style))
        for s in specs:
            story.append(Paragraph(f'• {s}', body_style))
        story.append(Spacer(1, 2*mm))

    story.append(Paragraph('四、选型建议', h1_style))
    story.append(make_table(
        ['客户类型', '推荐版本', '推荐理由'],
        [
            ['IDC/机房运营商', '全金属标准版', '电磁屏蔽好，可靠性高，成本最低'],
            ['中小企业IT采购', '方案B透明定制款', '兼顾性能与外观，展示效果好，性价比高'],
            ['创意工作室/极客用户', '方案B或概念展示版', '视觉效果好，可展示内部硬件'],
            ['展会/营销活动', '概念展示版', '视觉冲击力强，吸引眼球'],
            ['成本敏感型批量订单', '全金属标准版或方案A', '成本可控，满足基本需求'],
        ],
        [40*mm, 40*mm, 90*mm]
    ))

    create_pdf(r'01_设计文档\04_SKU产品矩阵说明.pdf',
        'SKU产品矩阵说明',
        '三层卧式模块化机箱 · 四版本配置与选型指南 · V1.0',
        story)

# ============================================================
# 5. 量产版亚克力件加工图汇总
# ============================================================
def gen_05_drawing_production():
    story = []
    story.append(Paragraph('一、图纸说明', h1_style))
    story.append(Paragraph('本汇总包含量产实用版全部亚克力件加工图纸，覆盖方案A与方案B共用件及方案B专属件。所有尺寸单位为毫米，公差未标注处按GB/T 1804-m级执行。', body_style))

    parts = [
        {
            'code': 'ACY-001',
            'name': '磨砂半透亚克力顶盖',
            'material': '磨砂半透亚克力，雾度70%，V0级阻燃',
            'thickness': '3 mm',
            'dimensions': '448 mm（宽）× 358 mm（深），四角圆角R5 mm',
            'holes': '4角M4通孔，φ4.2 mm；孔中心距边15 mm，横向孔距420 mm，纵向孔距330 mm；孔内嵌装M4金属铜套，高度3 mm',
            '定位': '后侧2个φ3.2 mm定位销孔，距侧边60 mm，与主机架定位销配合',
            'tolerance': '外形±0.2 mm；孔位±0.1 mm；对角线偏差≤0.2 mm',
            'process': '激光切割外形→CNC倒角C2→铰刀精加工孔位→压装铜套',
            'surface': '双面防刮硬化涂层；边缘抛光去毛刺',
            'seal': '下表面四周贴1 mm厚阻燃泡棉条，宽5 mm，压缩量30%',
            'version': '方案A / 方案B 共用',
        },
        {
            'code': 'ACY-002',
            'name': 'CPU透明导风罩',
            'material': '耐高温高透亚克力，长期耐温≥85℃，V0级阻燃',
            'thickness': '2 mm',
            'dimensions': '120 mm（长）× 100 mm（宽）× 30 mm（罩体高度）；进风口倒圆角R3 mm',
            'holes': '底部2个M3通孔，φ3.2 mm；孔距90 mm，居中布置；与主板托盘CPU区孔位对齐',
            '风道': '出风口收窄至80 mm宽，出风口中心对准显卡风扇中心；内壁做导风倒角',
            'tolerance': '外形±0.2 mm；安装孔位±0.1 mm',
            'process': '激光切割展开料→热弯一体成型→边缘去毛刺',
            'surface': '内外表面透明光洁；进风口边缘抛光',
            'seal': '—',
            'version': '方案A / 方案B 共用（每台2个）',
        },
        {
            'code': 'ACY-003',
            'name': '侧板透明观察窗（方案B专属）',
            'material': '高透亚克力，V0级阻燃',
            'thickness': '4 mm',
            'dimensions': '亚克力嵌板208 mm（宽）× 158 mm（高），四角圆角R12 mm；四周搭接边宽4 mm',
            'holes': '金属侧板开窗200×150 mm，四角圆角R10 mm；亚克力从内部嵌入，四周3点M2螺丝固定+打胶密封',
            '定位': '窗口位置：侧板居中偏上，窗口下沿距底面140 mm，中心对齐主板仓显卡区域',
            'tolerance': '开窗±0.2 mm；亚克力嵌板±0.2 mm',
            'process': '金属侧板冲压沉台（深度1.2mm）→亚克力激光切割→边缘抛光→嵌装打胶',
            'surface': '亚克力边缘抛光C1；内表面防刮涂层；四周贴1 mm厚阻燃泡棉密封',
            'seal': '四周1mm阻燃泡棉+密封胶，保证EMI与防尘',
            'version': '方案B 专属（每台1个，右侧板）',
        },
        {
            'code': 'ACY-004',
            'name': '2.5寸SSD亚克力托架',
            'material': '黑色半透亚克力，V0级阻燃',
            'thickness': '3 mm',
            'dimensions': '100 mm × 70 mm，四角圆角R3 mm',
            'holes': '4个M3通孔，φ3.2 mm；孔距75 × 45 mm；孔内嵌装M3金属铜套',
            'tolerance': '孔位±0.1 mm',
            'process': '激光切割→倒角C0.5去毛刺→压装铜套',
            'surface': '底面磨砂，正面哑光，避免反光',
            'seal': '—',
            'version': '方案A / 方案B 共用（每台最多4个）',
            'note': '卡入3.5寸硬盘托架转接槽，单槽可上下叠装2块',
        },
        {
            'code': 'ACY-005',
            'name': '亚克力理线架+指示灯导光条',
            'material': '理线架：黑色磨砂亚克力；导光条：透明亚克力',
            'thickness': '理线架2 mm；导光条φ5 mm',
            'dimensions': '理线架长200 mm；导光条长15 mm',
            'holes': '理线架带3个φ4 mm扎带孔',
            'tolerance': '—',
            'process': '理线架：激光切割→3M背胶；导光条：热弯成型→入光面磨砂网点',
            'surface': '理线架哑光；导光条入光面磨砂网点，出光面抛光',
            'seal': '—',
            'version': '方案A / 方案B 共用',
            'note': '导光条对应硬盘指示灯位置，将LED光导至前面板',
        },
    ]

    for p in parts:
        story.append(Paragraph(f"{p['code']}｜{p['name']}", h2_style))
        story.append(Paragraph(f"适用版本：{p['version']}", note_style))
        story.append(make_table(
            ['项目', '参数详情'],
            [
                ['材料', p['material']],
                ['厚度', p['thickness']],
                ['外形尺寸', p['dimensions']],
                ['安装孔位', p['holes']],
                ['定位特征', p.get('定位', p.get('风道', '—'))],
                ['公差要求', p['tolerance']],
                ['加工工艺', p['process']],
                ['表面处理', p['surface']],
                ['密封装配', p['seal']],
            ] + ([['备注', p['note']]] if 'note' in p else []),
            [30*mm, 140*mm]
        ))
        story.append(Spacer(1, 3*mm))

    story.append(Paragraph('六、打样验收标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准'],
        [
            ['尺寸配合', '顶盖扣合间隙均匀≤0.2 mm；观察窗嵌装平整无翘曲；导风罩安装孔位无偏差'],
            ['外观质量', '亚克力无划痕、气泡、缩水印；边缘抛光均匀；防刮涂层完整'],
            ['功能验证', '导风罩不干涉显卡、内存安装；观察窗视野对准显卡区域；顶盖密封泡棉压缩均匀'],
            ['耐温测试', '导风罩60℃环境放置2小时，无变形、无开裂、无异味'],
            ['阻燃测试', '离火3秒内自熄，无滴落（V0级抽检）'],
        ],
        [30*mm, 140*mm]
    ))

    create_pdf(r'02_加工图纸\量产版亚克力件图纸\量产版亚克力件加工图汇总.pdf',
        '量产版亚克力件加工图汇总',
        '三层卧式模块化机箱 · 方案A/B共用件+方案B专属件 · V1.0',
        story)

# ============================================================
# 6. 概念版亚克力件加工图汇总
# ============================================================
def gen_06_drawing_concept():
    story = []
    story.append(Paragraph('一、图纸说明', h1_style))
    story.append(Paragraph('本汇总包含全透明概念展示版全部亚克力件加工图纸。概念版主打展示营销，不建议批量生产。所有尺寸单位为毫米，公差未标注处按GB/T 1804-m级执行。', body_style))

    parts = [
        {
            'code': 'ACY-G-01',
            'name': '全透明亚克力顶盖',
            'material': '高透亚克力，V0级阻燃，透光率≥92%',
            'thickness': '4 mm',
            'dimensions': '448 mm（宽）× 358 mm（深），四角圆角R5 mm，边缘高光倒角C2',
            'holes': '4角M4通孔，φ4.2 mm；孔中心距边15 mm；孔内嵌装M4金属铜套',
            'tolerance': '外形±0.2 mm；孔位±0.1 mm',
            'process': '激光切割→CNC高光倒角→抛光→防刮涂层',
            'surface': '双面防刮硬化涂层；边缘高光抛光',
            'version': '概念展示版专属',
        },
        {
            'code': 'ACY-G-02',
            'name': '全透明亚克力侧板（左右各一）',
            'material': '高透亚克力，V0级阻燃，透光率≥92%',
            'thickness': '4 mm',
            'dimensions': '358 mm（高）× 390 mm（深），四角圆角R5 mm',
            'holes': '每侧6个M4安装孔，φ4.2 mm；孔位与主机架侧板安装位对齐；孔内嵌装M4金属铜套',
            'tolerance': '外形±0.2 mm；孔位±0.1 mm',
            'process': '激光切割→CNC高光倒角→抛光→防刮涂层',
            'surface': '双面防刮硬化涂层；边缘高光抛光',
            'version': '概念展示版专属（每台2个）',
        },
        {
            'code': 'ACY-G-03',
            'name': '前面板进风区透明件',
            'material': '高透亚克力，V0级阻燃',
            'thickness': '3 mm',
            'dimensions': '448 mm（宽）× 100 mm（高），带6组φ120 mm风扇孔位',
            'holes': '6组φ120.5 mm风扇安装孔，孔位与前面板风扇位对齐；4角M3固定孔',
            'tolerance': '外形±0.2 mm；风扇孔位±0.2 mm',
            'process': '激光切割（含风扇孔）→边缘去毛刺',
            'surface': '表面哑光处理，减少反光',
            'version': '概念展示版专属',
        },
        {
            'code': 'ACY-G-04',
            'name': '模块识别色装饰条',
            'material': 'ABS+亚克力双色共挤',
            'thickness': '2 mm',
            'dimensions': '每层1条，长420 mm，宽10 mm',
            'colors': '存储层：蓝色（#0078D4）；计算层：绿色（#107C10）；电源层：橙色（#D83B01）',
            'tolerance': '—',
            'process': '挤出成型→切割→3M背胶',
            'surface': '哑光表面',
            'version': '概念展示版专属（每台3条）',
        },
        {
            'code': 'ACY-G-05',
            'name': '灯效导光系统',
            'material': '导光板：高透亚克力；灯带：RGB LED',
            'thickness': '导光板3 mm',
            'dimensions': '底部导光板440×350 mm；侧边灯带4条',
            'spec': 'RGB灯带，WS2812B，60灯/米；支持多模式切换（呼吸/流水/常亮/音乐律动）',
            'controller': '迷你RGB控制器，支持遥控+主板ARGB同步',
            'tolerance': '—',
            'process': '导光板激光切割→入光面磨砂网点→灯带粘贴→控制器接线',
            'surface': '导光板出光面均匀网点',
            'version': '概念展示版专属',
        },
    ]

    for p in parts:
        story.append(Paragraph(f"{p['code']}｜{p['name']}", h2_style))
        story.append(Paragraph(f"适用版本：{p['version']}", note_style))
        rows = [
            ['材料', p['material']],
            ['厚度', p['thickness']],
            ['外形尺寸', p['dimensions']],
        ]
        if 'holes' in p:
            rows.append(['安装孔位', p['holes']])
        if 'colors' in p:
            rows.append(['颜色规格', p['colors']])
        if 'spec' in p:
            rows.append(['灯效规格', p['spec']])
        if 'controller' in p:
            rows.append(['控制器', p['controller']])
        rows.extend([
            ['公差要求', p['tolerance']],
            ['加工工艺', p['process']],
            ['表面处理', p['surface']],
        ])
        story.append(make_table(['项目', '参数详情'], rows, [30*mm, 140*mm]))
        story.append(Spacer(1, 3*mm))

    create_pdf(r'02_加工图纸\概念版亚克力件图纸\概念版亚克力件加工图汇总.pdf',
        '概念版亚克力件加工图汇总',
        '三层卧式模块化机箱 · 全透明概念展示版 · V1.0',
        story)

# ============================================================
# 7. 成本对比与报价参考
# ============================================================
def gen_07_cost():
    story = []
    story.append(Paragraph('一、报价说明', h1_style))
    story.append(Paragraph('本报价基于100台批量计算，人民币元，不含主板、硬盘、电源、显卡等核心硬件。实际价格根据采购量、材料行情、定制要求浮动。报价有效期30天。', body_style))

    story.append(Paragraph('二、四版本整机成本对比', h1_style))
    story.append(make_table(
        ['成本项', '全金属标准版', '方案A基础透明款', '方案B透明定制款', '概念展示版'],
        [
            ['通用金属结构件', '640', '640', '640', '640'],
            ['功能模块结构件', '1,234.4', '1,234.4', '1,234.4', '1,234.4'],
            ['亚克力件', '0', '180~220', '265~310', '540~620'],
            ['接口与电气件', '546', '546', '546', '546'],
            ['表面处理与装配', '280~480', '210~370', '210~370', '430~730'],
            ['整机合计', '2,700~2,900', '2,810~3,010', '2,895~3,100', '3,390~3,770'],
            ['成本相对指数', '100%', '104%~106%', '107%~110%', '130%~140%'],
        ],
        [30*mm, 35*mm, 35*mm, 35*mm, 35*mm]
    ))

    story.append(Paragraph('三、通用基础件明细（全版本通用）', h1_style))
    story.append(make_table(
        ['物料编码', '零件名称', '规格参数', '数量', '单价(元)', '小计(元)'],
        [
            ['G-001', '通用主机架总成', '450×360×400mm SPCC 1.5mm喷塑', '1', '320', '320'],
            ['G-002', '三层导轨安装座', '标准12英寸导轨孔距 SPCC 1.2mm', '6', '12', '72'],
            ['G-003', '背部通用背板框架', '440×390mm SPCC 1.5mm喷塑', '1', '85', '85'],
            ['G-004', '层间隔板通用框', '440×350mm 带导风圈位 SPCC 1.2mm', '2', '55', '110'],
            ['G-005', '机箱脚垫', 'Φ20×8mm 防滑丁腈橡胶', '4', '2.5', '10'],
            ['G-006', '通用基础紧固件包', 'M3/M4螺丝、平垫、弹垫', '1', '25', '25'],
            ['G-007', '接地铜带组件', '5×0.5mm 紫铜', '1', '18', '18'],
            ['—', '通用基础件小计', '—', '—', '—', '640'],
        ],
        [20*mm, 30*mm, 50*mm, 12*mm, 18*mm, 18*mm]
    ))

    story.append(Paragraph('四、批量阶梯报价', h1_style))
    story.append(make_table(
        ['采购量', '全金属标准版', '方案B透明定制款', '备注'],
        [
            ['1~10台（样机）', '3,500~3,800', '3,800~4,200', '含样机调试费'],
            ['11~50台（小批量）', '3,000~3,200', '3,200~3,500', '—'],
            ['51~200台（中批量）', '2,800~3,000', '2,950~3,200', '推荐批量'],
            ['201~500台（大批量）', '2,600~2,800', '2,750~2,950', '价格可再议'],
            ['500台以上', '面议', '面议', '年度框架协议'],
        ],
        [35*mm, 40*mm, 40*mm, 55*mm]
    ))

    story.append(Paragraph('五、报价包含与不包含项', h1_style))
    story.append(Paragraph('报价包含：', h3_style))
    story.append(Paragraph('• 机箱结构件（钣金+亚克力）的材料、加工、表面处理费用', body_style))
    story.append(Paragraph('• 标准件（螺丝、导轨、风扇、连接器等）采购费用', body_style))
    story.append(Paragraph('• 整机组装、调试、出厂检验费用', body_style))
    story.append(Paragraph('• 标准包装（EPE珍珠棉+五层瓦楞纸箱）', body_style))
    story.append(Paragraph('• 12个月质保（非人为损坏）', body_style))

    story.append(Paragraph('报价不包含：', h3_style))
    story.append(Paragraph('• 主板、CPU、内存、硬盘、电源、显卡等核心硬件', body_style))
    story.append(Paragraph('• 定制化LOGO丝印/激光雕刻（100台以上免费）', body_style))
    story.append(Paragraph('• 特殊颜色定制（非哑光黑）', body_style))
    story.append(Paragraph('• 运输费用（按实际距离另计）', body_style))
    story.append(Paragraph('• 安装调试服务（如需上门，另计差旅人工费）', body_style))

    create_pdf(r'04_BOM与成本\成本对比与报价参考.pdf',
        '成本对比与报价参考',
        '三层卧式模块化机箱 · 四版本成本分析与批量报价 · V1.0',
        story)

# ============================================================
# 8. 打样执行清单与验收标准
# ============================================================
def gen_08_prototype():
    story = []
    story.append(Paragraph('一、打样排期与优先级', h1_style))
    story.append(make_table(
        ['批次', '优先级', '打样内容', '周期', '核心验证目的', '输出物'],
        [
            ['第1批', '★★★最高', '顶盖+侧板观察窗+CPU导风罩 3件', '3天', '验证与主机架的配合尺寸、孔位精度、密封效果', '手板样件+尺寸检验报告'],
            ['第2批', '★★高', 'SSD托架+理线架+导光条', '4天', '验证内部功能件安装与效果', '小批量试装件'],
            ['第3批', '★中', '全透明概念版外壳件', '5~7天', '完成展示样机制作', '完整展示样机+视觉验收报告'],
        ],
        [15*mm, 20*mm, 45*mm, 15*mm, 45*mm, 30*mm]
    ))

    story.append(Paragraph('二、首批打样件清单', h1_style))
    story.append(make_table(
        ['序号', '零件代号', '零件名称', '数量', '材料', '关键尺寸'],
        [
            ['1', 'ACY-001', '磨砂半透亚克力顶盖', '1件', '磨砂半透亚克力 V0阻燃 3mm', '448×358mm，4角M4孔'],
            ['2', 'ACY-003', '侧板透明观察窗', '1件', '高透亚克力 V0阻燃 4mm', '208×158mm，嵌装式'],
            ['3', 'ACY-002', 'CPU透明导风罩', '2件', '耐高温高透亚克力 2mm', '120×100×30mm'],
        ],
        [12*mm, 20*mm, 35*mm, 12*mm, 40*mm, 50*mm]
    ))

    story.append(Paragraph('三、首批打样验收标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准', '检验方法', '不合格处理'],
        [
            ['尺寸配合', '顶盖扣合间隙均匀≤0.2mm；观察窗嵌装平整无翘曲；导风罩安装孔位无偏差', '游标卡尺+塞尺+试装', '返修或重做'],
            ['外观质量', '亚克力无划痕、气泡、缩水印；边缘抛光均匀；防刮涂层完整', '目视+10倍放大镜', '抛光返修或降级'],
            ['功能验证', '导风罩不干涉显卡、内存安装；观察窗视野对准显卡区域；顶盖密封泡棉压缩均匀', '整机试装+功能测试', '修改设计后重打'],
            ['耐温测试', '导风罩60℃环境放置2小时，无变形、无开裂、无异味', '恒温箱+目视', '更换材料后重打'],
            ['阻燃测试', '离火3秒内自熄，无滴落（V0级抽检）', '酒精灯燃烧测试', '更换材料后重打'],
        ],
        [20*mm, 60*mm, 35*mm, 35*mm]
    ))

    story.append(Paragraph('四、打样流程', h1_style))
    steps = [
        '设计冻结：确认打样件图纸版本，签字冻结',
        '供应商选择：选择有亚克力加工经验的供应商，提供图纸和技术要求',
        '材料确认：供应商提供材料材质证明和阻燃等级报告',
        '首件加工：供应商加工首件，进行自检',
        '来料检验：我方按验收标准进行全项检验',
        '整机试装：将打样件装入主机架，验证配合与功能',
        '验收报告：出具《打样验收报告》，明确合格/不合格项',
        '问题闭环：不合格项分析原因，修改设计或工艺后重新打样',
        '批量放行：验收合格后，签批《批量生产放行单》',
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f'{i}. {s}', body_style))

    story.append(Paragraph('五、打样注意事项', h1_style))
    notes = [
        '打样件必须使用与量产相同的材料，不得用普通亚克力替代阻燃亚克力',
        '孔位精度是打样验证的重点，必须100%检验，不得抽检',
        '导风罩耐温测试必须在整机实际运行环境下验证，不能仅做恒温箱测试',
        '观察窗嵌装后必须验证EMI屏蔽性能，确保不超标',
        '打样过程中发现的设计问题，须及时更新图纸，并同步更新BOM',
        '所有打样件须保留样品，作为量产验收的对标基准',
    ]
    for n in notes:
        story.append(Paragraph(f'• {n}', body_style))

    create_pdf(r'05_生产执行\打样执行清单与验收标准.pdf',
        '打样执行清单与验收标准',
        '三层卧式模块化机箱 · 亚克力件打样流程与品质标准 · V1.0',
        story)

# ============================================================
# 9. 整机组装工艺卡
# ============================================================
def gen_09_assembly():
    story = []
    story.append(Paragraph('一、组装前准备', h1_style))
    story.append(Paragraph('工具清单：', h3_style))
    story.append(Paragraph('• 电动螺丝刀（扭矩可调，设定M3=0.6N·m，M4=1.2N·m）', body_style))
    story.append(Paragraph('• 内六角扳手组（M2/M3/M4）', body_style))
    story.append(Paragraph('• 镊子、尖嘴钳、斜口钳', body_style))
    story.append(Paragraph('• 防静电手环、防静电垫', body_style))
    story.append(Paragraph('• 扎带枪、剪刀、美工刀', body_style))
    story.append(Paragraph('• 扭矩扳手（用于电源固定螺丝）', body_style))

    story.append(Paragraph('物料清单：', h3_style))
    story.append(Paragraph('按BOM清单核对所有物料，确认型号、数量、外观无误后上线。', body_style))

    story.append(Paragraph('二、组装工艺流程', h1_style))

    processes = [
        ('工序1：主机架预装（约15分钟）',
         ['将三层导轨安装座用M4螺丝固定到主机架对应位置，扭矩1.2N·m',
          '安装背部背板框架，M4螺丝固定，扭矩1.2N·m',
          '安装两层层间隔板，M3螺丝固定，扭矩0.6N·m',
          '安装4个机箱脚垫，M4螺丝固定',
          '贴接地铜带组件，确保与主机架良好接触',
          '自检：导轨孔位对齐，隔板平整无翘曲']),
        ('工序2：存储抽屉组装（约20分钟）',
         ['硬盘笼本体与抽屉侧框用M3螺丝连接，扭矩0.6N·m',
          '安装12个3.5寸硬盘托架，确认卡扣到位',
          '安装内置SATA背板，M3螺丝固定，连接背板线束',
          '安装抽拉导轨（二节钢珠导轨），M4螺丝固定',
          '安装前部锁止拉手，确认锁止/解锁功能正常',
          '安装12个硬盘状态指示灯，测试点亮',
          '贴层板导风密封圈，确保四周贴合',
          '自检：12个托架插拔顺畅，背板接口对位准确']),
        ('工序3：计算抽屉组装（约25分钟）',
         ['主板安装托盘与抽屉侧框用M3螺丝连接',
          '安装M3铜柱组（双主板版20颗），确认高度一致',
          '安装全高显卡固定支架（双主板版2套）',
          '安装内部理线架，M3螺丝固定',
          '安装CPU区域导风罩（亚克力或ABS），确认不干涉内存插槽',
          '安装供电转接板（24Pin+8Pin盲插），M3螺丝固定',
          '连接内部线束，用扎带固定，预留足够长度',
          '自检：铜柱高度一致，导风罩对位准确，线束无干涉']),
        ('工序4：电源抽屉组装（约15分钟）',
         ['电源舱框架与抽屉侧框用M3螺丝连接',
          '安装ATX电源固定支架（双电源版2套）',
          '粘贴电源减震胶垫（8个），确保位置准确',
          '安装抽拉导轨，M4螺丝固定',
          '安装内置配电背板（双电源版），M3螺丝固定',
          '安装前部拉手，确认到位',
          '连接配电背板线束，标识清晰',
          '自检：电源舱尺寸适配标准ATX电源，减震垫粘贴牢固']),
        ('工序5：前面板组装（约15分钟）',
         ['前面板本体安装6个12025 PWM进风风扇，M4螺丝固定',
          '安装6组防尘网框+滤网，确认快拆功能正常',
          '安装前置IO组件（USB-A×2+Type-C+音频），M3螺丝固定',
          '安装开关指示灯组（双电源开关+电源灯）',
          '安装4个快拆卡扣，确认弹性正常',
          '连接风扇线束、IO线束、开关线束，用扎带固定',
          '自检：风扇转动顺畅无杂音，IO接口对位准确']),
        ('工序6：后面板组装（约10分钟）',
         ['后面板本体安装3个12025 PWM排风风扇，M4螺丝固定',
          '安装主板I/O挡板（随主板提供）',
          '安装PCI挡板（双槽位空白挡片）',
          '安装2个AC品字输入插座（10A带保险丝）',
          '安装4个固定手拧螺丝（M4）',
          '连接风扇线束，用扎带固定',
          '自检：风扇转动顺畅，AC插座牢固无松动']),
        ('工序7：总装与调试（约30分钟）',
         ['将存储抽屉、计算抽屉、电源抽屉沿导轨推入主机架，确认盲插接口对接到位',
          '确认各层抽屉锁止拉手锁定，无松动',
          '安装前面板，快拆卡扣锁定，确认与机架间隙均匀',
          '安装后面板，手拧螺丝固定，确认IO孔位对齐',
          '安装顶盖（亚克力或金属），M4螺丝固定',
          '连接内部线束：风扇控制器、温度传感器、指示灯等',
          '通电测试：风扇全速运转10分钟，检查异响、振动、温度',
          '测试各层抽屉插拔：反复插拔5次，确认盲插对接顺畅',
          '自检：整机无松动，无异响，各功能正常']),
        ('工序8：终检与包装（约15分钟）',
         ['外观检查：无划痕、无变形、无污渍，标识清晰',
          '尺寸检查：关键尺寸抽检，符合公差要求',
          '功能检查：风扇、指示灯、开关、IO全部测试',
          '清洁：用无尘布擦拭整机，去除指纹和污渍',
          '贴铭牌：产品型号、序列号、生产日期、额定参数',
          '包装：EPE珍珠棉包裹→五层瓦楞纸箱→封箱→贴运输标签',
          '放入附件包：安装说明书、质保卡、备用螺丝包',
          '终检合格后，加盖合格章，入库']),
    ]

    for name, steps in processes:
        story.append(Paragraph(name, h2_style))
        for i, s in enumerate(steps, 1):
            story.append(Paragraph(f'{i}. {s}', body_style))
        story.append(Spacer(1, 2*mm))

    story.append(Paragraph('三、关键工序质量控制点', h1_style))
    story.append(make_table(
        ['控制点', '控制要求', '检验方法', '频次'],
        [
            ['导轨安装', '孔位对齐，推拉顺畅无卡滞', '手感+推拉测试', '全检'],
            ['盲插对接', '推入自动对接，无偏针、无卡滞', '插拔测试5次', '全检'],
            ['风扇安装', '转动顺畅无杂音，螺丝扭矩达标', '通电测试+扭矩扳手', '全检'],
            ['线束固定', '扎带间距均匀，无干涉运动部件', '目视+手感', '全检'],
            ['亚克力件', '无划痕、无气泡、边缘抛光均匀', '目视+10倍放大镜', '全检'],
            ['整机外观', '无划痕、无变形、间隙均匀', '目视+塞尺', '全检'],
        ],
        [25*mm, 55*mm, 45*mm, 20*mm]
    ))

    create_pdf(r'05_生产执行\整机组装工艺卡.pdf',
        '整机组装工艺卡',
        '三层卧式模块化机箱 · 标准组装流程与质量控制 · V1.0',
        story)

# ============================================================
# 10. 出厂验收标准
# ============================================================
def gen_10_qc():
    story = []
    story.append(Paragraph('一、验收总则', h1_style))
    story.append(Paragraph('本标准适用于三层卧式模块化机箱所有版本的出厂检验。每台产品须经全项检验合格后方可出厂。检验分为：外观检验、尺寸检验、功能检验、安全检验、包装检验五大类。', body_style))

    story.append(Paragraph('二、外观检验标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准', '检验方法'],
        [
            ['钣金表面', '喷塑均匀，无流挂、无露底、无色差；划痕长度≤5mm且每面≤2条', '目视（距离50cm，光照≥800lux）'],
            ['亚克力表面', '无划痕、无气泡、无缩水印、无裂纹；边缘抛光均匀无毛刺', '目视+10倍放大镜'],
            ['丝印/铭牌', '内容清晰完整，位置准确，无偏移、无模糊', '目视+卡尺测量位置'],
            ['装配间隙', '面板与机架间隙≤0.3mm，四周均匀；抽屉与机架间隙≤0.5mm', '塞尺测量'],
            ['紧固件', '所有螺丝到位，无滑牙、无漏装、无松动；螺丝头无划伤', '目视+手感'],
            ['内部清洁', '内部无金属屑、无塑料屑、无多余螺丝、无扎带尾', '目视+手摸'],
        ],
        [25*mm, 85*mm, 60*mm]
    ))

    story.append(Paragraph('三、尺寸检验标准', h1_style))
    story.append(make_table(
        ['检验项', '标称值', '公差', '检验方法'],
        [
            ['整机外轮廓（宽×深×高）', '450×360×400mm', '±0.5mm', '游标卡尺测量三面'],
            ['整机对角线偏差', '—', '≤0.5mm', '卷尺测量两对角线差值'],
            ['层间净空（硬盘/主板/电源）', '50/200/100mm', '±0.3mm', '深度尺测量'],
            ['导轨孔位', '标准12英寸孔距', '±0.2mm', '标准导轨试装'],
            ['面板安装孔位', '420×370mm', '±0.3mm', '游标卡尺测量孔距'],
            ['亚克力件孔位', '按图纸', '±0.1mm', '游标卡尺测量'],
        ],
        [40*mm, 35*mm, 25*mm, 70*mm]
    ))

    story.append(Paragraph('四、功能检验标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准', '检验方法'],
        [
            ['抽屉插拔', '各层抽屉推拉顺畅，无卡滞、无异常声响；锁止拉手功能正常', '反复插拔5次'],
            ['盲插对接', '抽屉推入后自动对接，无偏针、无卡滞；拔出时自动分离', '插拔测试+目视检查针脚'],
            ['风扇运转', '所有风扇通电后正常运转，无杂音、无振动、无停转；PWM调速功能正常', '通电测试10分钟+调速测试'],
            ['指示灯', '电源灯、硬盘指示灯全部正常点亮，颜色正确，无闪烁异常', '通电测试'],
            ['前置IO', 'USB-A×2、Type-C×1、音频接口全部功能正常', 'U盘+耳机测试'],
            ['电源开关', '双电源开关独立控制，功能正常，无卡滞', '反复开关10次'],
            ['散热风道', '三层风道独立，无串风；纸巾测试各层进出风方向正确', '纸巾法+风速仪抽检'],
        ],
        [25*mm, 85*mm, 60*mm]
    ))

    story.append(Paragraph('五、安全检验标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准', '检验方法'],
        [
            ['接地连续性', '接地铜带与主机架、各模块间接地电阻≤0.1Ω', '接地电阻测试仪'],
            ['绝缘电阻', '电源输入端与机箱间绝缘电阻≥100MΩ（DC500V）', '绝缘电阻测试仪'],
            ['耐压测试', '电源输入端与机箱间承受AC1500V/1min无击穿、无飞弧', '耐压测试仪'],
            ['锐角处理', '所有钣金边缘无锋利锐角、无毛刺，不划伤手', '手感+目视'],
            ['线束防护', '所有线束过孔处有橡胶保护套或磨边处理，无割线风险', '目视+手感'],
            ['阻燃性能', '亚克力件V0级，离火3秒内自熄无滴落（抽检）', '燃烧测试（每批次抽检1件）'],
        ],
        [25*mm, 85*mm, 60*mm]
    ))

    story.append(Paragraph('六、包装检验标准', h1_style))
    story.append(make_table(
        ['检验项', '合格标准'],
        [
            ['包装材料', 'EPE珍珠棉包裹整机，五层瓦楞纸箱，无破损、无受潮'],
            ['附件包', '安装说明书×1、质保卡×1、备用螺丝包×1，齐全无遗漏'],
            ['标识标签', '产品型号、序列号、生产日期、额定参数、运输标签齐全清晰'],
            ['封箱', '胶带封箱牢固，无松动、无开胶；打包带（如需）松紧适度'],
            ['跌落测试', '抽检：1m高度自由跌落（一角三棱六面），开箱后整机无损伤、无松动', '每批次抽检1台'],
        ],
        [30*mm, 140*mm]
    ))

    story.append(Paragraph('七、不合格品处理', h1_style))
    story.append(Paragraph('1. 轻微不合格（外观小瑕疵、不影响功能）：经品质主管确认后可降级处理或返修。', body_style))
    story.append(Paragraph('2. 严重不合格（功能失效、安全隐患、尺寸超差）：必须返修，返修后重新全检。', body_style))
    story.append(Paragraph('3. 致命不合格（接地失效、耐压击穿、材料阻燃不达标）：整批隔离，分析原因，全部返工。', body_style))
    story.append(Paragraph('4. 所有不合格品须记录《不合格品处理单》，分析原因，制定纠正预防措施。', body_style))

    story.append(Paragraph('八、验收记录', h1_style))
    story.append(Paragraph('每台产品出厂须附带《出厂检验报告》，记录所有检验项结果，由检验员签字、品质主管审核。报告保存期限不少于3年。', body_style))

    create_pdf(r'05_生产执行\出厂验收标准.pdf',
        '出厂验收标准',
        '三层卧式模块化机箱 · 成品出厂检验规范 · V1.0',
        story)

# ============================================================
# 主函数
# ============================================================
if __name__ == '__main__':
    print("开始生成PDF文档...")
    gen_01_benchmark()
    gen_02_architecture()
    gen_03_acrylic()
    gen_04_sku()
    gen_05_drawing_production()
    gen_06_drawing_concept()
    gen_07_cost()
    gen_08_prototype()
    gen_09_assembly()
    gen_10_qc()
    print("\n全部PDF文档生成完成！")
