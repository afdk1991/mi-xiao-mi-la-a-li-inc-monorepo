#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三层卧式模块化机箱 - 4版本BOM分版清单生成脚本"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pylibs'))

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# 样式定义
header_font = Font(name='微软雅黑', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='2F5496', end_color='2F5496', fill_type='solid')
sub_header_font = Font(name='微软雅黑', size=10, bold=True, color='000000')
sub_header_fill = PatternFill(start_color='D6E4F0', end_color='D6E4F0', fill_type='solid')
total_font = Font(name='微软雅黑', size=11, bold=True, color='C00000')
total_fill = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
normal_font = Font(name='微软雅黑', size=10)
center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
left_align = Alignment(horizontal='left', vertical='center', wrap_text=True)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

def apply_style(ws, row, col, value, font=normal_font, fill=None, align=center_align):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = font
    if fill:
        cell.fill = fill
    cell.alignment = align
    cell.border = thin_border
    return cell

def write_bom_sheet(ws, version_name, version_desc, items, acy_items=None, surface_cost=(280, 480), total_range=None):
    """写入一个版本的BOM表"""
    # 标题行
    ws.merge_cells('A1:F1')
    title_cell = ws.cell(row=1, column=1, value=f'三层卧式模块化机箱 - {version_name} BOM清单')
    title_cell.font = Font(name='微软雅黑', size=14, bold=True, color='2F5496')
    title_cell.alignment = center_align
    ws.row_dimensions[1].height = 35

    ws.merge_cells('A2:F2')
    desc_cell = ws.cell(row=2, column=1, value=version_desc)
    desc_cell.font = Font(name='微软雅黑', size=9, italic=True, color='666666')
    desc_cell.alignment = center_align
    ws.row_dimensions[2].height = 22

    # 表头
    headers = ['物料编码', '零件名称', '规格参数', '数量', '参考单价(元)', '小计(元)']
    for col, h in enumerate(headers, 1):
        apply_style(ws, 3, col, h, header_font, header_fill)
    ws.row_dimensions[3].height = 28

    row = 4
    grand_total = 0

    for category, cat_items in items:
        # 分类标题
        ws.merge_cells(f'A{row}:F{row}')
        apply_style(ws, row, 1, category, sub_header_font, sub_header_fill, left_align)
        row += 1
        cat_total = 0
        for code, name, spec, qty, price in cat_items:
            subtotal = round(qty * price, 2)
            cat_total += subtotal
            apply_style(ws, row, 1, code, normal_font, None, center_align)
            apply_style(ws, row, 2, name, normal_font, None, left_align)
            apply_style(ws, row, 3, spec, normal_font, None, left_align)
            apply_style(ws, row, 4, qty, normal_font, None, center_align)
            apply_style(ws, row, 5, price, normal_font, None, center_align)
            apply_style(ws, row, 6, subtotal, normal_font, None, center_align)
            row += 1
        # 分类小计
        apply_style(ws, row, 1, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 2, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 3, f'{category} 小计', sub_header_font, sub_header_fill, left_align)
        apply_style(ws, row, 4, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 5, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 6, round(cat_total, 2), sub_header_font, sub_header_fill)
        grand_total += cat_total
        row += 1

    # 亚克力件（如有）
    if acy_items:
        ws.merge_cells(f'A{row}:F{row}')
        apply_style(ws, row, 1, '亚克力件（本版本专属）', sub_header_font, sub_header_fill, left_align)
        row += 1
        acy_total = 0
        for code, name, spec, qty, price in acy_items:
            subtotal = round(qty * price, 2)
            acy_total += subtotal
            apply_style(ws, row, 1, code, normal_font, None, center_align)
            apply_style(ws, row, 2, name, normal_font, None, left_align)
            apply_style(ws, row, 3, spec, normal_font, None, left_align)
            apply_style(ws, row, 4, qty, normal_font, None, center_align)
            apply_style(ws, row, 5, price, normal_font, None, center_align)
            apply_style(ws, row, 6, subtotal, normal_font, None, center_align)
            row += 1
        apply_style(ws, row, 1, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 2, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 3, '亚克力件 小计', sub_header_font, sub_header_fill, left_align)
        apply_style(ws, row, 4, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 5, '', sub_header_font, sub_header_fill)
        apply_style(ws, row, 6, round(acy_total, 2), sub_header_font, sub_header_fill)
        grand_total += acy_total
        row += 1

    # 表面处理与装配
    ws.merge_cells(f'A{row}:F{row}')
    apply_style(ws, row, 1, '表面处理与装配', sub_header_font, sub_header_fill, left_align)
    row += 1
    surf_low, surf_high = surface_cost
    apply_style(ws, row, 1, 'ASS-001', normal_font, None, center_align)
    apply_style(ws, row, 2, '表面处理与整机组装', normal_font, None, left_align)
    apply_style(ws, row, 3, '喷塑/抛光/装配/质检/包装', normal_font, None, left_align)
    apply_style(ws, row, 4, 1, normal_font, None, center_align)
    apply_style(ws, row, 5, f'{surf_low}~{surf_high}', normal_font, None, center_align)
    apply_style(ws, row, 6, f'{surf_low}~{surf_high}', normal_font, None, center_align)
    row += 1
    grand_total += surf_low  # 取低值计入合计

    # 总计
    ws.merge_cells(f'A{row}:E{row}')
    apply_style(ws, row, 1, '整机成本合计（不含主板/硬盘/电源/显卡等核心硬件）', total_font, total_fill, left_align)
    apply_style(ws, row, 6, f'约 {grand_total:.0f}~{grand_total + (surf_high - surf_low):.0f} 元', total_font, total_fill)
    ws.row_dimensions[row].height = 30

    # 列宽
    col_widths = [14, 22, 40, 8, 14, 14]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

# ========== 通用基础件数据 ==========
common_base = [
    ('G-001', '通用主机架总成', '450(W)×360(D)×400(H)mm SPCC 1.5mm喷塑', 1, 320),
    ('G-002', '三层导轨安装座', '标准12英寸导轨孔距 SPCC 1.2mm喷塑', 6, 12),
    ('G-003', '背部通用背板框架', '440×390mm SPCC 1.5mm喷塑', 1, 85),
    ('G-004', '层间隔板通用框', '440×350mm，带导风圈位 SPCC 1.2mm喷塑', 2, 55),
    ('G-005', '机箱脚垫', 'Φ20×8mm 防滑丁腈橡胶', 4, 2.5),
    ('G-006', '通用基础紧固件包', 'M3/M4螺丝、平垫、弹垫', 1, 25),
    ('G-007', '接地铜带组件', '5×0.5mm 紫铜', 1, 18),
]

storage_module = [
    ('M1-001', '硬盘笼本体', '6列2排，适配12块3.5寸硬盘 SPCC 1.0mm喷塑', 1, 180),
    ('M1-002', '3.5寸硬盘托架', '标准硬盘位，带减震位 SPCC 0.8mm喷塑', 12, 6.5),
    ('M1-003', '抽拉导轨', '12英寸二节钢珠导轨 镀锌钢', 2, 35),
    ('M1-004', '前部锁止拉手', '带到位锁定+解锁按键', 1, 22),
    ('M1-005', '硬盘状态指示灯组', 'Φ5mm 红色LED', 12, 1.2),
    ('M1-006', '内置SATA背板', '12口SATA+供电一体化 PCB', 1, 95),
    ('M1-007', '层板导风密封圈', '适配风道接口 阻燃海绵', 1, 8),
]

compute_module_dual = [
    ('M2-001', '双主板安装托盘', '420×320mm，双区M3铜柱孔阵 SPCC 1.0mm喷塑', 1, 88),
    ('M2-002', '主板铜柱组', 'M3×6+6 黄铜', 20, 0.8),
    ('M2-003', '全高显卡固定支架', '双槽位尾部支撑 SPCC 1.2mm喷塑', 2, 25),
    ('M2-004', '内部理线架', '适配背部走线 SPCC 0.8mm喷塑', 1, 18),
    ('M2-005', 'CPU区域导风罩', '引导气流覆盖核心区 ABS阻燃', 2, 12),
    ('M2-006', '供电转接板', '24Pin+8Pin 盲插转接 PCB', 2, 45),
]

psu_module_dual = [
    ('M3-001', '电源舱框架', '双ATX独立隔舱 SPCC 1.2mm喷塑', 1, 75),
    ('M3-002', 'ATX电源固定支架', '标准ATX孔位 SPCC 1.2mm喷塑', 2, 12),
    ('M3-003', '电源减震胶垫组', '10×10×3mm 丁腈橡胶', 8, 1.5),
    ('M3-004', '抽拉导轨', '12英寸二节钢珠导轨 镀锌钢', 2, 35),
    ('M3-005', '内置配电背板', '双电源输入+统一输出 PCB', 1, 68),
    ('M3-006', '前部拉手', '带定位凸点 SPCC喷塑', 1, 18),
]

front_panel_6fan = [
    ('M4-001', '前面板本体', '450×400mm，6组风扇孔 SPCC 1.5mm喷塑', 1, 115),
    ('M4-002', '12025 PWM进风风扇', 'DC12V，≥60CFM', 6, 32),
    ('M4-003', '防尘网框+滤网', '120×120mm，300目', 6, 5),
    ('M4-004', '前置IO组件', 'USB-A×2+Type-C×1+音频', 1, 28),
    ('M4-005', '开关指示灯组', '双电源开关+电源灯', 1, 15),
    ('M4-006', '快拆卡扣', '弹簧卡扣式 镀锌钢', 4, 3.5),
]

rear_panel = [
    ('M5-001', '后面板本体', '450×400mm，带IO/PCI/电源孔 SPCC 1.5mm喷塑', 1, 90),
    ('M5-002', '12025 PWM排风风扇', 'DC12V，≥60CFM', 3, 32),
    ('M5-003', '主板I/O挡板', '标准ATX IO尺寸 SPCC', 1, 5),
    ('M5-004', 'PCI挡板', '双槽位空白挡片 SPCC', 2, 2),
    ('M5-005', 'AC品字输入插座', '10A带保险丝', 2, 8),
    ('M5-006', '固定手拧螺丝', 'M4 镀锌钢', 4, 1.5),
]

interface_components = [
    ('IF-001', '电源盲插连接器组', '24Pin+8Pin 防呆设计 ≥1000次插拔', 2, 45),
    ('IF-002', '数据盲插连接器', 'Mini SAS HD 36Pin ≥500次插拔', 1, 85),
    ('IF-003', '信号盲插连接器', '10Pin主板信号 键位防呆', 2, 25),
    ('IF-004', '锥形定位销组', 'Φ6mm 不锈钢 带倒角', 6, 8),
    ('IF-005', '风道密封泡棉组', '阻燃海绵 1mm厚 各层接口', 1, 32),
]

generic_parts = [
    ('GP-001', '散热风扇控制器', 'PWM 6路 温度调速', 1, 45),
    ('GP-002', '温度传感器组', 'NTC 10K 三线制', 4, 3.5),
    ('GP-003', '内部连接线束', '定制长度 镀锡铜 含标签', 1, 55),
    ('GP-004', '铭牌与标识贴', '激光雕刻铝铭牌+丝印标识', 1, 18),
    ('GP-005', '包装材料', 'EPE珍珠棉+五层瓦楞纸箱', 1, 35),
    ('GP-006', '出厂质检报告', '含尺寸/电气/外观检验记录', 1, 20),
    ('GP-007', '安装说明书', '彩色印刷 含装配步骤图', 1, 15),
]

# 亚克力件
acy_version_a = [
    ('ACY-001', '磨砂半透亚克力顶盖', '448×358×3mm 雾度70% V0阻燃 含铜套', 1, 65),
    ('ACY-002', 'CPU透明导风罩', '120×100×30mm 耐温≥85℃ V0阻燃', 2, 18),
    ('ACY-004', '2.5寸SSD亚克力托架', '100×70×3mm 黑色半透 含铜套', 4, 8),
    ('ACY-005', '亚克力理线架+导光条', '2mm黑色磨砂理线架+φ5透明导光条', 1, 15),
]

acy_version_b = [
    ('ACY-001', '磨砂半透亚克力顶盖', '448×358×3mm 雾度70% V0阻燃 含铜套', 1, 65),
    ('ACY-002', 'CPU透明导风罩', '120×100×30mm 耐温≥85℃ V0阻燃', 2, 18),
    ('ACY-003', '侧板透明观察窗', '208×158×4mm 高透 V0阻燃 含密封', 1, 85),
    ('ACY-004', '2.5寸SSD亚克力托架', '100×70×3mm 黑色半透 含铜套', 4, 8),
    ('ACY-005', '亚克力理线架+导光条', '2mm黑色磨砂理线架+φ5透明导光条', 1, 15),
]

acy_concept = [
    ('ACY-G-01', '全透明亚克力顶盖', '448×358×4mm 高透 V0阻燃 边缘高光', 1, 95),
    ('ACY-G-02', '全透明亚克力侧板', '358×390×4mm 高透 左右各一 含铜套', 2, 120),
    ('ACY-G-03', '前面板进风区透明件', '448×100×3mm 高透 带风扇孔位', 1, 55),
    ('ACY-002', 'CPU透明导风罩（蓝透）', '120×100×30mm 蓝色透明 耐温≥85℃', 2, 22),
    ('ACY-004', '2.5寸SSD亚克力托架', '100×70×3mm 透明 含铜套', 4, 10),
    ('ACY-G-04', '模块识别色装饰条', 'ABS+亚克力 三色分区标识', 1, 35),
    ('ACY-G-05', '灯效导光系统', 'RGB灯带+导光板+控制器', 1, 85),
]

# ========== Sheet 1: 全金属标准版 ==========
ws1 = wb.active
ws1.title = '全金属标准版'
items_v1 = [
    ('一、通用基础件（全配置通用）', common_base),
    ('二、存储抽屉模块（12盘位热插拔）', storage_module),
    ('三、计算抽屉模块（双30×30主板）', compute_module_dual),
    ('四、电源抽屉模块（双ATX冗余）', psu_module_dual),
    ('五、前面板模块（6风扇）', front_panel_6fan),
    ('六、后面板模块（标准IO）', rear_panel),
    ('七、标准化接口组件', interface_components),
    ('八、通用外购件与生产辅料', generic_parts),
]
write_bom_sheet(ws1, '全金属标准版',
    '全钣金结构，无亚克力件；12盘热插拔+双主板+双电源冗余 | 计价基准：100台批量，人民币元，不含核心硬件',
    items_v1, acy_items=None, surface_cost=(280, 480))

# ========== Sheet 2: 方案A基础透明款 ==========
ws2 = wb.create_sheet('方案A-基础透明款')
write_bom_sheet(ws2, '方案A：基础透明款',
    '磨砂顶盖+金属侧板+透明导风罩+SSD托架+理线架 | 计价基准：100台批量，人民币元，不含核心硬件',
    items_v1, acy_items=acy_version_a, surface_cost=(210, 370))

# ========== Sheet 3: 方案B透明定制款 ==========
ws3 = wb.create_sheet('方案B-透明定制款')
write_bom_sheet(ws3, '方案B：透明定制款（主推）',
    '磨砂顶盖+侧板观察窗+透明导风罩+SSD托架+理线架 | 计价基准：100台批量，人民币元，不含核心硬件',
    items_v1, acy_items=acy_version_b, surface_cost=(210, 370))

# ========== Sheet 4: 概念展示版 ==========
ws4 = wb.create_sheet('概念展示版')
write_bom_sheet(ws4, '概念展示版',
    '全透明亚克力外壳+灯效优化+模块识别色 | 样机级配置，计价基准：10台小批量，人民币元，不含核心硬件',
    items_v1, acy_items=acy_concept, surface_cost=(430, 730))

# ========== Sheet 5: 四版本成本对比汇总 ==========
ws5 = wb.create_sheet('成本对比汇总')
ws5.merge_cells('A1:G1')
t = ws5.cell(row=1, column=1, value='四版本成本构成对比汇总')
t.font = Font(name='微软雅黑', size=14, bold=True, color='2F5496')
t.alignment = center_align
ws5.row_dimensions[1].height = 35

comp_headers = ['成本项', '全金属标准版', '方案A基础透明款', '方案B透明定制款', '概念展示版', '备注']
for col, h in enumerate(comp_headers, 1):
    apply_style(ws5, 2, col, h, header_font, header_fill)
ws5.row_dimensions[2].height = 28

comp_data = [
    ('通用金属结构件', '640', '640', '640', '640', '全版本通用'),
    ('功能模块结构件', '1234.4', '1234.4', '1234.4', '1234.4', '存储+计算+电源+面板'),
    ('亚克力件', '0', '180~220', '265~310', '540~620', '各版本差异项'),
    ('接口与电气件', '546', '546', '546', '546', '盲插+连接器+线束'),
    ('表面处理与装配', '280~480', '210~370', '210~370', '430~730', '含喷塑/抛光/组装/包装'),
    ('整机合计', '2700~2900', '2810~3010', '2895~3100', '3390~3770', '不含核心硬件'),
    ('成本相对指数', '100%', '104%~106%', '107%~110%', '130%~140%', '以全金属版为基准'),
]
for r, row_data in enumerate(comp_data, 3):
    for c, val in enumerate(row_data, 1):
        if r == 8:  # 合计行
            apply_style(ws5, r, c, val, total_font, total_fill)
        else:
            apply_style(ws5, r, c, val, normal_font, None, left_align if c in [1,6] else center_align)

# 产品定位对比
ws5.merge_cells('A11:G11')
apply_style(ws5, 11, 1, '四版本产品定位与适用场景', sub_header_font, sub_header_fill, left_align)

pos_headers = ['版本名称', '核心配置', '产品定位', '适用场景', '单台成本估算']
for col, h in enumerate(pos_headers, 1):
    apply_style(ws5, 12, col, h, header_font, header_fill)

pos_data = [
    ('全金属标准版', '全钣金结构，无亚克力件；12盘热插拔+双主板+双电源冗余', '基础量产款', '工业存储、边缘服务器、机房部署', '2700~2900元'),
    ('方案A：基础透明款', '磨砂顶盖+金属侧板+透明导风罩+SSD托架+理线架', '入门透明定制款', '批量标配定制、桌面存储主机', '2815~3000元'),
    ('方案B：透明定制款', '磨砂顶盖+侧板观察窗+透明导风罩+SSD托架+理线架', '主力透明定制款', '桌面工作站、展示型项目、中小企业定制', '2840~3080元'),
    ('概念展示版', '全透明亚克力外壳+灯效优化+模块识别色', '营销展示样机', '展会、产品发布、方案演示、品牌宣传', '3230~3670元'),
]
for r, row_data in enumerate(pos_data, 13):
    for c, val in enumerate(row_data, 1):
        apply_style(ws5, r, c, val, normal_font, None, left_align if c in [2,3,4] else center_align)

col_widths5 = [22, 20, 20, 20, 18, 25]
for i, w in enumerate(col_widths5, 1):
    ws5.column_dimensions[get_column_letter(i)].width = w

# 保存
output_path = r'D:\网站全栈项目\项目005机箱\三层卧式模块化机箱_项目完整交付包\04_BOM与成本\BOM分版清单（4个版本）.xlsx'
wb.save(output_path)
print(f'BOM Excel已生成: {output_path}')
print(f'工作表数量: {len(wb.sheetnames)}')
print(f'工作表列表: {wb.sheetnames}')
