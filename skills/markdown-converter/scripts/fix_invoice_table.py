#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复发票后补表格格式
处理所有"发票后补"和"发票补录"相关的界面设计表格
"""

import re

def fix_invoice_tables(content):
    """
    修复所有发票后补/发票补录相关的界面设计表格格式
    """
    # 处理"发票后补"查询界面表格
    pattern1 = r'\* 界面设计\s*\n\|  +\|.*\n\| --- \|.*\n\| 发票后补 \|.*\n\| 客户名称 \[.*\n\| 票据管理 \|.*\n\| 序号 \|.*\n\| 贴现利率 \|.*\n\| 第三方付息比例%.*\n\|  +\|.*\n\| 分页显示 \|.*\n'
    
    replacement1 = '''* 界面设计

<table>
  <tr>
    <th colspan="10" style="text-align:left; background-color:#FFFF00;">发票后补</th>
  </tr>
  <tr>
    <td colspan="10">客户名称 [    ]    发票补录完成 [    ]    贴现日期 [    ]    <button>查询</button> <button>重置</button></td>
  </tr>
  <tr>
    <td colspan="10">批次号 [    ]</td>
  </tr>
  <tr>
    <th colspan="10" style="text-align:left;">票据管理</th>
  </tr>
  <tr>
    <td>序号</td>
    <td>批次号</td>
    <td>业务所属机构</td>
    <td>客户名称</td>
    <td>客户账号</td>
    <td>票据种类</td>
    <td style="background-color:#FFFF00;">发票后补</td>
    <td>强制关联发票</td>
    <td>发票补录完成</td>
    <td>贴现日期</td>
  </tr>
  <tr>
    <td>贴现利率</td>
    <td>总笔数</td>
    <td>总金额</td>
    <td>业务类型</td>
    <td>付息方式</td>
    <td>卖方付息人名称</td>
    <td>卖方付息人账号</td>
    <td>买方付息比例</td>
    <td>买方付息人名称</td>
    <td>买方付息人账号</td>
  </tr>
  <tr>
    <td>第三方付息比例%</td>
    <td>第三方付息人名称</td>
    <td>第三方付息人账号</td>
    <td>合同编号</td>
    <td>发起机构</td>
    <td>企业规模</td>
    <td>是否绿色企业</td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="10">分页显示</td>
  </tr>
</table>
'''
    
    content = re.sub(pattern1, replacement1, content)
    
    # 处理"发票补录"录入界面表格 - 使用更灵活的模式
    # 匹配任何包含"发票补录"标题的界面设计表格
    pattern2 = r'\* 界面设计\s*\n\|  +\|.*\n\| --- \|.*\n\| 发票补录 \|.*\n\| 业务所属机构.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|\n\| 保存 \|.*\n\| 总笔数.*\n\| 关联发票.*\n\| 序号 \|.*\n\| 承兑人全称 \|.*\n\| 实收利息 \|.*\n\|  +\|.*\n\| 分页显示 \|.*\n'
    
    replacement2 = '''* 界面设计

<table>
  <tr>
    <th colspan="10" style="text-align:left;">发票补录</th>
  </tr>
  <tr>
    <td colspan="10">业务所属机构 [ ] 业务类型 [ ] 客户号 [ ]  客户名称 [ ] 入账账号 [ ] 保贴方式 [ ]  企业规模 [ ] 是否绿色企业 [ ] 票据种类 [ ]  客户账号 [ ] 赎回开放日 [ ] 赎回到期日 [ ]  清算标识 [ ] 贴现日期 [ ] 贴现利率 [ ]  利率类型 [ ] 账务机构名称 [ ] 保证金账号 [ ]  客户经理名称 [ ] 付息方式 [ ] 发票后补 [ ]  强制关联发票 [ ] 买方付息人名称 [ ] 买方付息比例 [ ]  买方付息人账号 [ ] 第三方付息人名称 [ ] 第三方付息人账号 [ ]  合同编号 [ ] 贴现资金用途 [ ] 垫款利率 [ ]  行业投向 [ ] 签约地点 [ ] 仲裁方式 [ ]  仲裁委员会名称 [ ] 仲裁委员会地点 [ ] 甲方送达地址 [ ]  甲方邮编 [ ] 甲方收件人 [ ] 甲方电话 [ ]  乙方送达地址 [ ] 乙方邮编 [ ] 乙方收件人 [ ]  乙方电话 [ ] 共计份数 [ ] 发票补录完成 [ ]</td>
  </tr>
  <tr>
    <td colspan="10"><button>保存</button></td>
  </tr>
  <tr>
    <td colspan="10">总笔数 [ ] 总金额 [ ] 总买方利息 [ ]  总卖方利息 [ ] 总实收利息 [ ] 支付贴现人总金额 [ ]</td>
  </tr>
  <tr>
    <td colspan="10"><button>关联发票</button> <button>发票管理</button></td>
  </tr>
  <tr>
    <td>序号</td>
    <td>票据来源</td>
    <td>票据(包)号码</td>
    <td>子票区间</td>
    <td>票据(包)金额(元)</td>
    <td>跨行贴现</td>
    <td>流程状态</td>
    <td>贴现利率</td>
    <td>票据种类</td>
    <td>出票人全称</td>
  </tr>
  <tr>
    <td>承兑人全称</td>
    <td>出票日期</td>
    <td>汇票到期日</td>
    <td>是否我行承兑</td>
    <td>计息到期日</td>
    <td>利息计算天数</td>
    <td>顺延天数</td>
    <td>买方利息</td>
    <td>卖方利息</td>
    <td>第三方利息</td>
  </tr>
  <tr>
    <td>实收利息</td>
    <td>报文实付金额</td>
    <td>支付贴现人金额</td>
    <td>银行支付金额</td>
    <td>是否一致</td>
    <td>申请方是否已经撤销</td>
    <td>购货方客户名称</td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="10">分页显示</td>
  </tr>
</table>
'''
    
    content = re.sub(pattern2, replacement2, content)
    
    return content

def fix_invoice_tables_in_file(file_path):
    """修复指定文件中的发票相关表格"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = fix_invoice_tables(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    # 统计修复的表格数量
    table_count = len(re.findall(r'colspan="10"', new_content))
    print(f"发票相关表格格式修复完成：{file_path}")
    print(f"共修复 {table_count} 处colspan合并")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("用法: python fix_invoice_table.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    fix_invoice_tables_in_file(input_file)
