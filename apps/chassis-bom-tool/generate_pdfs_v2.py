#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""紧凑型三层卧式模块化机箱(200x350x350) - 全套PDF文档生成脚本"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pylibs'))
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_PATHS = [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf', r'C:\Windows\Fonts\simsun.ttc']
FONT_NAME = 'ChineseFont'; FONT_BOLD = 'ChineseFontBold'
for fp in FONT_PATHS:
    if os.path.exists(fp):
        try:
            pdfmetrics.registerFont(TTFont(FONT_NAME, fp)); pdfmetrics.registerFont(TTFont(FONT_BOLD, fp)); break
        except: continue

PRIMARY = HexColor('#2F5496'); SECONDARY = HexColor('#D6E4F0'); ACCENT = HexColor('#C00000')
LIGHT_GRAY = HexColor('#F2F2F2'); DARK_GRAY = HexColor('#404040')
styles = getSampleStyleSheet()
title_style = ParagraphStyle('T', parent=styles['Title'], fontName=FONT_BOLD, fontSize=20, leading=28, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=5*mm)
subtitle_style = ParagraphStyle('ST', parent=styles['Normal'], fontName=FONT_NAME, fontSize=10, leading=14, textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=8*mm)
h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontName=FONT_BOLD, fontSize=14, leading=20, textColor=PRIMARY, spaceBefore=6*mm, spaceAfter=3*mm)
h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontName=FONT_BOLD, fontSize=12, leading=16, textColor=PRIMARY, spaceBefore=4*mm, spaceAfter=2*mm)
h3_style = ParagraphStyle('H3', parent=styles['Heading3'], fontName=FONT_BOLD, fontSize=10, leading=14, textColor=DARK_GRAY, spaceBefore=2*mm, spaceAfter=1*mm)
body_style = ParagraphStyle('B', parent=styles['Normal'], fontName=FONT_NAME, fontSize=9.5, leading=15, textColor=black, alignment=TA_JUSTIFY, spaceAfter=1.5*mm)
cell_style = ParagraphStyle('C', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8.5, leading=11, textColor=black, alignment=TA_LEFT)
cell_center_style = ParagraphStyle('CC', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8.5, leading=11, textColor=black, alignment=TA_CENTER)
cell_header_style = ParagraphStyle('CH', parent=styles['Normal'], fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=white, alignment=TA_CENTER)

BASE_DIR = r'D:\网站全栈项目\项目005机箱\三层卧式模块化机箱_项目完整交付包'

def make_table(headers, data, col_widths=None):
    table_data = [[Paragraph(h, cell_header_style) for h in headers]]
    for row in data: table_data.append([Paragraph(str(c), cell_style) for c in row])
    if col_widths is None: col_widths = [170/len(headers)*mm] * len(headers)
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY), ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), FONT_BOLD), ('FONTSIZE', (0,0), (-1,0), 8.5),
        ('ALIGN', (0,0), (-1,0), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,1), (-1,-1), FONT_NAME), ('FONTSIZE', (0,1), (-1,-1), 8.5),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#BFBFBF')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_GRAY]),
        ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4), ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    return t

def add_page_number(canvas, doc):
    canvas.saveState(); canvas.setFont(FONT_NAME, 7.5); canvas.setFillColor(HexColor('#999999'))
    canvas.drawCentredString(A4[0]/2, 12*mm, f'第 {canvas.getPageNumber()} 页')
    canvas.drawString(15*mm, 12*mm, '紧凑型三层卧式模块化机箱(200x350x350)')
    canvas.drawRightString(A4[0]-15*mm, 12*mm, '机密文件 · 仅供内部使用'); canvas.restoreState()

def create_pdf(filename, title, subtitle, story_items):
    filepath = os.path.join(BASE_DIR, filename); os.makedirs(os.path.dirname(filepath), exist_ok=True)
    doc = SimpleDocTemplate(filepath, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=22*mm)
    story = [Paragraph(title, title_style), Paragraph(subtitle, subtitle_style), Spacer(1, 1*mm)] + story_items
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'已生成: {filename}')

# 1. 通用基准
def gen_01():
    s = []
    s.append(Paragraph('一、文档说明', h1_style))
    s.append(Paragraph('本文档定义紧凑型三层卧式模块化机箱（200×350×350mm）全版本通用设计基准，所有设计、加工、检验均以本文档为唯一依据。', body_style))
    s.append(Paragraph('二、整机外框基准', h1_style))
    s.append(make_table(['基准项','标称尺寸','公差','检验方法'], [
        ['主机架外轮廓（宽×深×高）','200 × 350 × 350 mm','±0.3 mm','游标卡尺测量三面'],
        ['主机架材质','SPCC冷轧钢板 1.2mm','—','材质证明书+千分尺'],
        ['表面处理','哑光黑/银喷塑，膜厚50~70μm','—','膜厚仪+色差仪'],
        ['整机重量（空箱）','约 5.8 kg','±0.3 kg','电子秤称重'],
    ], [42*mm, 40*mm, 22*mm, 66*mm]))
    s.append(Paragraph('三、层间高度基准', h1_style))
    s.append(make_table(['层级','内净空','公差','功能说明'], [
        ['硬盘仓（上层）','90 mm','±0.2 mm','2块3.5寸+2块2.5寸SSD'],
        ['主板仓（中层）','170 mm','±0.2 mm','ITX主板+全高双槽显卡(≤120mm)'],
        ['电源仓（下层）','90 mm','±0.2 mm','标准ATX电源(86mm高)'],
        ['层间隔板厚度','1.0 mm','±0.1 mm','SPCC喷塑，带导风圈位'],
    ], [32*mm, 28*mm, 22*mm, 88*mm]))
    s.append(Paragraph('四、导轨与接口基准', h1_style))
    s.append(make_table(['基准项','参数','公差','说明'], [
        ['导轨规格','8英寸二节钢珠导轨','±0.2 mm','标准件采购'],
        ['背板安装面距后端面','12 mm','±0.2 mm','深度尺测量'],
        ['电源盲插对接','24Pin+8Pin','±0.3 mm','≥1000次插拔'],
        ['数据盲插对接','SATA 7+15Pin','±0.2 mm','≥500次插拔'],
        ['每层进出风等效口径','φ80 mm','±0.3 mm','层板导风圈对齐'],
        ['面板安装孔位','170 × 320 mm','±0.2 mm','4点固定'],
    ], [35*mm, 38*mm, 22*mm, 75*mm]))
    s.append(Paragraph('五、散热系统基准', h1_style))
    s.append(make_table(['风道层级','风扇配置','标称风量','设计目标'], [
        ['硬盘仓风道','前1进+后1排','单扇50CFM','硬盘满载≤48℃'],
        ['主板仓风道','前1进+后1排','单扇50CFM','CPU满载≤78℃'],
        ['电源仓风道','前1进（电源自带风扇）','电源风扇独立','电源满载≤65℃'],
        ['总计','3进2出，共5个120mm风扇','—','三层独立无串风'],
    ], [30*mm, 35*mm, 35*mm, 70*mm]))
    create_pdf(r'01_设计文档\01_通用基准尺寸与公差规范.pdf', '通用基准尺寸与公差规范', '紧凑型三层卧式模块化机箱(200×350×350) · 全版本冻结基准 · V2.0', s)

# 2. 架构说明
def gen_02():
    s = []
    s.append(Paragraph('一、产品概述', h1_style))
    s.append(Paragraph('紧凑型三层卧式模块化机箱（200×350×350mm）是一款面向桌面级高密度计算与存储场景的模块化机箱。采用三层抽屉式架构：上层2块3.5寸+2块2.5寸存储单元，中层ITX主板+全高显卡计算单元，下层单ATX电源单元。', body_style))
    s.append(Paragraph('二、核心设计理念', h1_style))
    s.append(make_table(['设计理念','具体体现','用户价值'], [
        ['紧凑型尺寸','200×350×350mm，桌面友好','节省桌面空间，便携性好'],
        ['模块化架构','六大模块独立设计，通用接口','分钟级运维，故障快速更换'],
        ['全高显卡支持','中层170mm净空，支持全高双槽卡','兼容主流游戏/专业显卡'],
        ['三层独立风道','每层独立进出风，无串风','散热效率最大化'],
        ['按需配置','单主板/单电源，存储可扩展','降低入门成本'],
    ], [28*mm, 62*mm, 80*mm]))
    s.append(Paragraph('三、六大模块拆分', h1_style))
    modules = [
        ('M1 通用主机架','整机承载主体，200×350×350mm SPCC 1.2mm喷塑，集成三层导轨安装座、背部背板框架、层间隔板。'),
        ('M2 存储抽屉模块','2块3.5寸+2块2.5寸SSD热插拔单元，内置SATA背板、硬盘状态指示灯、抽拉导轨、锁止拉手。'),
        ('M3 计算抽屉模块','1块ITX主板（170×170mm），兼容全高双槽显卡。含主板安装托盘、铜柱组、显卡支架、理线架、CPU导风罩、供电盲插转接板、显卡支撑柱。'),
        ('M4 电源抽屉模块','1个标准ATX电源（150×86×140mm）。含电源舱框架、固定支架、减震胶垫、抽拉导轨、配电背板、前部拉手。'),
        ('M5 前面板模块','3组120mm进风风扇、防尘网、前置IO（USB-A×2+Type-C+音频）、电源开关与指示灯、快拆卡扣。'),
        ('M6 后面板模块','2组120mm排风风扇、主板IO挡板、PCI挡板、AC品字输入插座、固定手拧螺丝。'),
    ]
    for name, desc in modules:
        s.append(Paragraph(name, h3_style)); s.append(Paragraph(desc, body_style))
    s.append(Paragraph('四、三大标准接口', h1_style))
    s.append(make_table(['接口类型','技术规格','对接公差','防呆设计','插拔寿命'], [
        ['机械导轨接口','8英寸二节钢珠导轨+锥形定位销+锁止拉手','±0.2mm','定位销不对称','≥1000次'],
        ['电气盲插接口','电源24Pin+8Pin / SATA 7+15Pin','±0.2~0.3mm','上下/左右不对称','≥500~1000次'],
        ['风道密封接口','模块四周阻燃密封海绵+层板导风圈','±0.3mm','导风圈定位','永久'],
    ], [28*mm, 52*mm, 22*mm, 28*mm, 25*mm]))
    create_pdf(r'01_设计文档\02_模块化架构设计说明书.pdf', '模块化架构设计说明书', '紧凑型三层卧式模块化机箱(200×350×350) · 架构定义与接口规范 · V2.0', s)

# 3. 亚克力评估
def gen_03():
    s = []
    s.append(Paragraph('一、评估背景', h1_style))
    s.append(Paragraph('为提升紧凑型机箱视觉表现、降低部分非承重件成本，对可使用亚克力替代的部件进行系统性评估。原则：非承重、非高温、无强制电磁屏蔽要求的部件可替换。', body_style))
    s.append(Paragraph('二、替代边界划分', h1_style))
    s.append(Paragraph('✅ 推荐替代', h3_style))
    s.append(make_table(['类别','具体部件','替代理由'], [
        ['外观面板类','机箱顶盖、侧板观察窗、前面板进风区、指示灯灯罩','非承重，视觉展示需求高'],
        ['内部功能件','CPU导风罩、2.5寸SSD托架、理线架、导风圈','非承重，绝缘性优于金属'],
        ['辅助标识件','拉手装饰片、硬盘指示灯导光条','透光需求，亚克力天然适配'],
    ], [25*mm, 75*mm, 70*mm]))
    s.append(Paragraph('❌ 不建议替代', h3_style))
    s.append(make_table(['类别','具体部件','保留理由'], [
        ['核心承重','主机架、层间隔板、导轨安装座、抽屉主体框架','承重要求高，亚克力刚性不足'],
        ['高温强电','电源舱框架、电源固定支架、主板安装托盘','高温环境，亚克力耐温有限'],
        ['精密对接','后面板、背板框架、抽拉导轨、盲插连接器位','精度要求高，需电磁屏蔽'],
    ], [25*mm, 75*mm, 70*mm]))
    s.append(Paragraph('三、三档替代方案', h1_style))
    s.append(make_table(['方案','替换范围','适用场景','特点'], [
        ['展示样机版','左右透明侧板+透明顶盖+亚克力导风罩+SSD托架','展会展示、产品演示、桌面创意主机','全透呈现模块化结构'],
        ['轻量定制版','单面透明侧板+磨砂顶盖+亚克力理线架+导光件','小型办公、民用桌面主机','兼顾屏蔽性与美观度'],
        ['内部优化版','亚克力导风罩+SSD托架+内部理线架','批量定制、成本敏感型订单','外部无感知，内部轻量化'],
    ], [25*mm, 58*mm, 42*mm, 45*mm]))
    s.append(Paragraph('四、材料选型规范', h1_style))
    s.append(make_table(['应用部位','材料等级','厚度','关键性能'], [
        ['外观面板（顶盖/侧板）','V0级阻燃亚克力','3~4mm','耐温≥80℃，防刮硬化涂层'],
        ['CPU导风罩','耐高温高透亚克力','2mm','长期耐温≥85℃，V0阻燃'],
        ['SSD托架','黑色半透亚克力','3mm','V0阻燃，孔位镶铜套'],
        ['观察窗','高透亚克力','4mm','V0阻燃，内表面防刮涂层'],
    ], [35*mm, 35*mm, 18*mm, 82*mm]))
    create_pdf(r'01_设计文档\03_亚克力替代方案评估报告.pdf', '亚克力替代方案评估报告', '紧凑型三层卧式模块化机箱(200×350×350) · 材料替代可行性分析 · V2.0', s)

# 4. SKU矩阵
def gen_04():
    s = []
    s.append(Paragraph('一、产品矩阵总览', h1_style))
    s.append(Paragraph('本项目共规划4个配置版本，所有版本共用同一通用主机架与接口基准。', body_style))
    s.append(make_table(['版本名称','核心配置','产品定位','适用场景','单台成本','成本指数'], [
        ['全金属标准版','全钣金无亚克力；2块3.5寸+2块2.5寸+ITX+单ATX+全高显卡','基础量产款','紧凑型桌面主机、小办公存储','1400~1540元','100%'],
        ['方案A基础透明款','磨砂顶盖+金属侧板+透明导风罩+SSD托架+理线架','入门透明款','批量标配定制、桌面创意主机','1442~1570元','103%~105%'],
        ['方案B透明定制款','磨砂顶盖+侧板观察窗+透明导风罩+SSD托架+理线架','主力透明款','桌面工作站、展示型项目','1487~1615元','106%~108%'],
        ['概念展示版','全透明亚克力外壳+灯效优化+模块识别色','营销展示样机','展会、产品发布、方案演示','1793~2020元','128%~135%'],
    ], [24*mm, 42*mm, 20*mm, 35*mm, 22*mm, 17*mm]))
    s.append(Paragraph('二、全版本成本构成对比', h1_style))
    s.append(make_table(['成本项','全金属标准版','方案A','方案B','概念展示版'], [
        ['通用金属结构件','320','320','320','320'],
        ['功能模块结构件','620','620','620','620'],
        ['亚克力件','0','72~90','117~135','293~340'],
        ['接口与电气件','280','280','280','280'],
        ['表面处理与装配','180~320','150~260','150~260','280~480'],
        ['整机合计','1,400~1,540','1,442~1,570','1,487~1,615','1,793~2,020'],
    ], [30*mm, 35*mm, 30*mm, 30*mm, 35*mm]))
    s.append(Paragraph('三、选型建议', h1_style))
    s.append(make_table(['客户类型','推荐版本','推荐理由'], [
        ['性价比用户','全金属标准版','成本最低，结构紧凑，性能足够'],
        ['桌面创意用户','方案B透明定制款','兼顾性能与外观，观察窗展示硬件'],
        ['展会/营销','概念展示版','视觉冲击力强，吸引眼球'],
        ['批量定制订单','方案A基础透明款','成本可控，满足基本透明需求'],
    ], [35*mm, 35*mm, 100*mm]))
    create_pdf(r'01_设计文档\04_SKU产品矩阵说明.pdf', 'SKU产品矩阵说明', '紧凑型三层卧式模块化机箱(200×350×350) · 四版本配置与选型指南 · V2.0', s)

# 5. 量产版加工图
def gen_05():
    s = []
    s.append(Paragraph('一、图纸说明', h1_style))
    s.append(Paragraph('本汇总包含紧凑型机箱量产版全部亚克力件加工图纸，覆盖方案A/B共用件及方案B专属件。尺寸单位mm，未标注公差按GB/T 1804-m级。', body_style))
    parts = [
        ('ACY-001','磨砂半透亚克力顶盖','磨砂半透亚克力，雾度70%，V0级阻燃','3 mm','198×348 mm，四角圆角R3 mm',
         '4角M4通孔φ4.2mm，孔距170×320mm，内嵌M4铜套','后侧2个φ3.2定位销孔','外形±0.2，孔位±0.1',
         '激光切割→CNC倒角→铰孔→压装铜套','双面防刮硬化涂层，边缘抛光','下表面贴1mm阻燃泡棉'),
        ('ACY-002','CPU透明导风罩','耐高温高透亚克力，耐温≥85℃，V0阻燃','2 mm','80×70×25 mm，进风口R2 mm',
         '底部2个M3通孔φ3.2mm，孔距60mm','出风口收窄至50mm，对准显卡风扇','外形±0.2，孔位±0.1',
         '激光切割展开料→热弯一体成型','内外透明光洁，进风口抛光','—'),
        ('ACY-003','侧板透明观察窗（方案B专属）','高透亚克力，V0阻燃','4 mm','亚克力嵌板128×158 mm，四角R8 mm',
         '金属开窗120×150mm，从内部嵌入，3点M2固定+打胶','窗口居中偏上，对准显卡区域','开窗±0.2，嵌板±0.2',
         '金属冲压沉台→亚克力切割→抛光→嵌装','边缘抛光C1，内表面防刮涂层','四周1mm阻燃泡棉+密封胶'),
        ('ACY-004','2.5寸SSD亚克力托架','黑色半透亚克力，V0阻燃','3 mm','100×70 mm，四角R3 mm',
         '4个M3通孔φ3.2mm，孔距75×45mm，内嵌M3铜套','—','孔位±0.1',
         '激光切割→倒角→压装铜套','底面磨砂，正面哑光','卡入3.5寸托架转接槽'),
        ('ACY-005','亚克力理线架+导光条','理线架黑色磨砂，导光条透明','理线架2mm，导光条φ5mm','理线架长150mm，导光条长12mm',
         '理线架3个φ4扎带孔，3M背胶','导光条入光面磨砂网点','—',
         '激光切割→背胶；导光条热弯','理线架哑光，导光条出光面抛光','导光条对应硬盘指示灯位'),
    ]
    for code, name, mat, thick, dim, holes, pos, tol, proc, surf, seal in parts:
        s.append(Paragraph(f'{code}｜{name}', h2_style))
        s.append(make_table(['项目','参数详情'], [
            ['材料', mat], ['厚度', thick], ['外形尺寸', dim], ['安装孔位', holes],
            ['定位/风道特征', pos], ['公差要求', tol], ['加工工艺', proc], ['表面处理', surf], ['密封装配', seal],
        ], [28*mm, 142*mm]))
        s.append(Spacer(1, 2*mm))
    create_pdf(r'02_加工图纸\量产版亚克力件图纸\量产版亚克力件加工图汇总.pdf', '量产版亚克力件加工图汇总', '紧凑型三层卧式模块化机箱(200×350×350) · 方案A/B共用件+方案B专属件 · V2.0', s)

# 6. 概念版加工图
def gen_06():
    s = []
    s.append(Paragraph('一、图纸说明', h1_style))
    s.append(Paragraph('本汇总包含全透明概念展示版全部亚克力件加工图纸。概念版主打展示营销，不建议批量生产。', body_style))
    parts = [
        ('ACY-G-01','全透明亚克力顶盖','高透亚克力，V0阻燃，透光率≥92%','4 mm','198×348 mm，四角R3 mm，边缘高光C2',
         '4角M4通孔φ4.2mm，内嵌铜套','—','外形±0.2，孔位±0.1','激光切割→CNC高光倒角→抛光→防刮涂层','双面防刮，边缘高光抛光','—'),
        ('ACY-G-02','全透明亚克力侧板（左右各一）','高透亚克力，V0阻燃','4 mm','348×340 mm，四角R3 mm',
         '每侧4个M4安装孔，内嵌铜套','—','外形±0.2，孔位±0.1','激光切割→高光倒角→抛光→防刮涂层','双面防刮，边缘高光','—'),
        ('ACY-G-03','前面板进风区透明件','高透亚克力，V0阻燃','3 mm','198×80 mm，带3组φ120.5风扇孔',
         '4角M3固定孔','风扇孔位与前面板对齐','风扇孔位±0.2','激光切割（含风扇孔）→去毛刺','表面哑光减少反光','—'),
        ('ACY-G-04','模块识别色装饰条','ABS+亚克力双色共挤','2 mm','每层1条，长180mm，宽8mm',
         '—','存储层蓝色/计算层绿色/电源层橙色','—','挤出成型→切割→3M背胶','哑光表面','—'),
        ('ACY-G-05','灯效导光系统','导光板高透亚克力，RGB灯带','导光板3mm','底部导光板190×340mm，侧边灯带4条',
         '—','WS2812B 60灯/米，支持多模式','—','导光板切割→入光面磨砂网点→灯带粘贴','导光板出光面均匀网点','—'),
    ]
    for code, name, mat, thick, dim, holes, pos, tol, proc, surf, seal in parts:
        s.append(Paragraph(f'{code}｜{name}', h2_style))
        s.append(make_table(['项目','参数详情'], [
            ['材料', mat], ['厚度', thick], ['外形尺寸', dim], ['安装孔位', holes],
            ['定位/特征', pos], ['公差要求', tol], ['加工工艺', proc], ['表面处理', surf], ['密封装配', seal],
        ], [28*mm, 142*mm]))
        s.append(Spacer(1, 2*mm))
    create_pdf(r'02_加工图纸\概念版亚克力件图纸\概念版亚克力件加工图汇总.pdf', '概念版亚克力件加工图汇总', '紧凑型三层卧式模块化机箱(200×350×350) · 全透明概念展示版 · V2.0', s)

# 7. 成本报价
def gen_07():
    s = []
    s.append(Paragraph('一、报价说明', h1_style))
    s.append(Paragraph('本报价基于100台批量，人民币元，不含主板、硬盘、电源、显卡等核心硬件。报价有效期30天。', body_style))
    s.append(Paragraph('二、四版本整机成本对比', h1_style))
    s.append(make_table(['成本项','全金属标准版','方案A','方案B','概念展示版'], [
        ['通用金属结构件','320','320','320','320'],
        ['功能模块结构件','620','620','620','620'],
        ['亚克力件','0','72~90','117~135','293~340'],
        ['接口与电气件','280','280','280','280'],
        ['表面处理与装配','180~320','150~260','150~260','280~480'],
        ['整机合计','1,400~1,540','1,442~1,570','1,487~1,615','1,793~2,020'],
        ['成本相对指数','100%','103%~105%','106%~108%','128%~135%'],
    ], [30*mm, 32*mm, 30*mm, 30*mm, 32*mm]))
    s.append(Paragraph('三、批量阶梯报价', h1_style))
    s.append(make_table(['采购量','全金属标准版','方案B透明定制款','备注'], [
        ['1~10台（样机）','1,800~2,000','1,950~2,150','含样机调试费'],
        ['11~50台（小批量）','1,550~1,700','1,650~1,800','—'],
        ['51~200台（中批量）','1,400~1,540','1,487~1,615','推荐批量'],
        ['201~500台（大批量）','1,300~1,450','1,380~1,520','价格可再议'],
        ['500台以上','面议','面议','年度框架协议'],
    ], [35*mm, 38*mm, 38*mm, 59*mm]))
    s.append(Paragraph('四、报价包含与不包含', h1_style))
    s.append(Paragraph('包含：机箱结构件材料加工表面处理、标准件采购、整机组装调试检验、标准包装、12个月质保。', body_style))
    s.append(Paragraph('不包含：主板/CPU/内存/硬盘/电源/显卡等核心硬件、定制LOGO丝印（100台以上免费）、特殊颜色定制、运输费、上门安装调试。', body_style))
    create_pdf(r'04_BOM与成本\成本对比与报价参考.pdf', '成本对比与报价参考', '紧凑型三层卧式模块化机箱(200×350×350) · 四版本成本分析与批量报价 · V2.0', s)

# 8. 打样验收
def gen_08():
    s = []
    s.append(Paragraph('一、打样排期', h1_style))
    s.append(make_table(['批次','优先级','打样内容','周期','验证目的'], [
        ['第1批','★★★最高','顶盖+侧板观察窗+CPU导风罩 3件','3天','验证配合尺寸、孔位精度、密封效果'],
        ['第2批','★★高','SSD托架+理线架+导光条','4天','验证内部功能件安装与效果'],
        ['第3批','★中','全透明概念版外壳件','5~7天','完成展示样机制作'],
    ], [15*mm, 20*mm, 50*mm, 15*mm, 70*mm]))
    s.append(Paragraph('二、首批打样验收标准', h1_style))
    s.append(make_table(['检验项','合格标准','检验方法'], [
        ['尺寸配合','顶盖扣合间隙≤0.2mm；观察窗嵌装平整；导风罩孔位无偏差','游标卡尺+塞尺+试装'],
        ['外观质量','亚克力无划痕气泡缩水印；边缘抛光均匀；防刮涂层完整','目视+10倍放大镜'],
        ['功能验证','导风罩不干涉显卡内存；观察窗视野对准显卡；顶盖密封泡棉压缩均匀','整机试装+功能测试'],
        ['耐温测试','导风罩60℃环境2小时，无变形开裂异味','恒温箱+目视'],
        ['阻燃测试','离火3秒内自熄，无滴落（V0级抽检）','酒精灯燃烧测试'],
    ], [25*mm, 80*mm, 65*mm]))
    s.append(Paragraph('三、打样流程', h1_style))
    steps = ['设计冻结确认图纸版本','选择有亚克力加工经验的供应商','材料确认（材质证明+阻燃报告）',
             '首件加工供应商自检','来料检验按标准全项检验','整机试装验证配合与功能',
             '出具打样验收报告','不合格项分析原因修改后重打','验收合格签批批量生产放行单']
    for i, st in enumerate(steps, 1): s.append(Paragraph(f'{i}. {st}', body_style))
    create_pdf(r'05_生产执行\打样执行清单与验收标准.pdf', '打样执行清单与验收标准', '紧凑型三层卧式模块化机箱(200×350×350) · 亚克力件打样流程与品质标准 · V2.0', s)

# 9. 组装工艺
def gen_09():
    s = []
    s.append(Paragraph('一、组装前准备', h1_style))
    s.append(Paragraph('工具：电动螺丝刀（M3=0.5N·m，M4=1.0N·m）、内六角扳手组、镊子、尖嘴钳、防静电手环、扎带枪、扭矩扳手。', body_style))
    s.append(Paragraph('二、组装工艺流程', h1_style))
    processes = [
        ('工序1：主机架预装（10分钟）', ['安装三层导轨安装座M4螺丝','安装背部背板框架','安装两层层间隔板M3螺丝','安装4个机箱脚垫','贴接地铜带','自检：导轨孔位对齐，隔板平整']),
        ('工序2：存储抽屉组装（12分钟）', ['硬盘笼本体与侧框连接M3','安装2个3.5寸硬盘托架+2个2.5寸SSD托架','安装SATA背板4口，连接线束','安装8英寸抽拉导轨','安装锁止拉手，测试锁定/解锁','安装4个硬盘状态指示灯','贴导风密封圈','自检：托架插拔顺畅，背板对位准确']),
        ('工序3：计算抽屉组装（15分钟）', ['ITX主板托盘与侧框连接','安装6颗M3铜柱，确认高度一致','安装全高显卡固定支架','安装理线架','安装CPU透明导风罩，确认不干涉内存','安装供电转接板24Pin+8Pin盲插','安装PCI-E显卡支撑柱','连接线束，扎带固定','自检：铜柱高度一致，导风罩对位准确']),
        ('工序4：电源抽屉组装（8分钟）', ['电源舱框架与侧框连接','安装ATX电源固定支架','粘贴4个电源减震胶垫','安装8英寸抽拉导轨','安装配电背板','安装前部拉手','自检：电源舱适配标准ATX电源']),
        ('工序5：前面板组装（8分钟）', ['安装3个12025 PWM进风风扇','安装3组防尘网框+滤网','安装前置IO（USB-A×2+Type-C+音频）','安装电源开关+指示灯','安装2个快拆卡扣','连接风扇/IO/开关线束','自检：风扇转动顺畅，IO接口对位']),
        ('工序6：后面板组装（6分钟）', ['安装2个12025 PWM排风风扇','安装ITX主板IO挡板','安装PCI挡板','安装AC品字输入插座','安装2个固定手拧螺丝','连接风扇线束','自检：风扇顺畅，AC插座牢固']),
        ('工序7：总装与调试（20分钟）', ['三层抽屉沿导轨推入，确认盲插对接到位','确认各层拉手锁定无松动','安装前面板，快拆卡扣锁定','安装后面板，手拧螺丝固定','安装顶盖M4螺丝','连接风扇控制器、温度传感器、指示灯','通电测试：风扇全速10分钟，检查异响振动温度','反复插拔各层抽屉5次，确认盲插顺畅','自检：整机无松动无异响，各功能正常']),
        ('工序8：终检与包装（10分钟）', ['外观检查无划痕变形污渍','关键尺寸抽检','功能检查风扇/指示灯/开关/IO','清洁整机去除指纹污渍','贴铭牌（型号/序列号/生产日期/额定参数）','EPE珍珠棉包裹→瓦楞纸箱→封箱→贴标签','放入附件包（说明书/质保卡/备用螺丝）','终检合格加盖合格章入库']),
    ]
    for name, steps in processes:
        s.append(Paragraph(name, h2_style))
        for i, st in enumerate(steps, 1): s.append(Paragraph(f'{i}. {st}', body_style))
        s.append(Spacer(1, 1*mm))
    create_pdf(r'05_生产执行\整机组装工艺卡.pdf', '整机组装工艺卡', '紧凑型三层卧式模块化机箱(200×350×350) · 标准组装流程与质量控制 · V2.0', s)

# 10. 出厂验收
def gen_10():
    s = []
    s.append(Paragraph('一、验收总则', h1_style))
    s.append(Paragraph('本标准适用于紧凑型三层卧式模块化机箱所有版本的出厂检验。每台产品须经全项检验合格后方可出厂。', body_style))
    s.append(Paragraph('二、外观检验标准', h1_style))
    s.append(make_table(['检验项','合格标准','检验方法'], [
        ['钣金表面','喷塑均匀无流挂露底色差，划痕≤3mm每面≤1条','目视（距离50cm，光照≥800lux）'],
        ['亚克力表面','无划痕气泡缩水印裂纹，边缘抛光均匀无毛刺','目视+10倍放大镜'],
        ['丝印铭牌','内容清晰完整，位置准确无偏移模糊','目视+卡尺'],
        ['装配间隙','面板与机架间隙≤0.2mm均匀，抽屉间隙≤0.3mm','塞尺'],
        ['紧固件','所有螺丝到位无滑牙漏装松动，螺丝头无划伤','目视+手感'],
        ['内部清洁','无金属屑塑料屑多余螺丝扎带尾','目视+手摸'],
    ], [25*mm, 85*mm, 60*mm]))
    s.append(Paragraph('三、尺寸检验标准', h1_style))
    s.append(make_table(['检验项','标称值','公差','检验方法'], [
        ['整机外轮廓（宽×深×高）','200×350×350mm','±0.3mm','游标卡尺'],
        ['整机对角线偏差','—','≤0.3mm','卷尺测两对角线差值'],
        ['层间净空（硬盘/主板/电源）','90/170/90mm','±0.2mm','深度尺'],
        ['导轨孔位','标准8英寸孔距','±0.2mm','标准导轨试装'],
        ['面板安装孔位','170×320mm','±0.2mm','游标卡尺'],
    ], [40*mm, 35*mm, 22*mm, 73*mm]))
    s.append(Paragraph('四、功能检验标准', h1_style))
    s.append(make_table(['检验项','合格标准','检验方法'], [
        ['抽屉插拔','各层推拉顺畅无卡滞异响，锁止拉手功能正常','反复插拔5次'],
        ['盲插对接','推入自动对接无偏针卡滞，拔出自动分离','插拔测试+目视针脚'],
        ['风扇运转','5个风扇通电正常运转无杂音振动停转，PWM调速正常','通电10分钟+调速测试'],
        ['指示灯','电源灯硬盘灯全部正常点亮颜色正确无闪烁异常','通电测试'],
        ['前置IO','USB-A×2、Type-C×1、音频全部功能正常','U盘+耳机测试'],
        ['电源开关','开关功能正常无卡滞','反复开关10次'],
        ['散热风道','三层风道独立无串风，纸巾测试进出风方向正确','纸巾法'],
    ], [25*mm, 85*mm, 60*mm]))
    s.append(Paragraph('五、安全检验标准', h1_style))
    s.append(make_table(['检验项','合格标准','检验方法'], [
        ['接地连续性','接地电阻≤0.1Ω','接地电阻测试仪'],
        ['绝缘电阻','≥100MΩ（DC500V）','绝缘电阻测试仪'],
        ['耐压测试','AC1500V/1min无击穿飞弧','耐压测试仪'],
        ['锐角处理','所有钣金边缘无锋利锐角毛刺不划伤手','手感+目视'],
        ['线束防护','线束过孔处有橡胶保护或磨边处理无割线风险','目视+手感'],
        ['阻燃性能','亚克力件V0级离火3秒自熄无滴落（抽检）','燃烧测试每批抽检1件'],
    ], [25*mm, 85*mm, 60*mm]))
    create_pdf(r'05_生产执行\出厂验收标准.pdf', '出厂验收标准', '紧凑型三层卧式模块化机箱(200×350×350) · 成品出厂检验规范 · V2.0', s)

if __name__ == '__main__':
    print('开始生成PDF文档...')
    gen_01(); gen_02(); gen_03(); gen_04(); gen_05(); gen_06(); gen_07(); gen_08(); gen_09(); gen_10()
    print('\n全部PDF文档生成完成！')
