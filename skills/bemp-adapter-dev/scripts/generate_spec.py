"""
BEMP 适配器 MessageConverter Spec 文档生成脚本
根据字段映射关系自动生成 spec.md、tasks.md、checklist.md
支持多银行报文风格（XML/JSON+基类/JSON直通）

用法:
    python generate_spec.py --pice PICE070701 --bank hnnxbank --module ecif --ext-code EBBS.0402006.01 --output specs/<change-id>

环境变量:
    BEMP_ROOT  - 项目根目录（优先级低于 --root 参数）
"""
import argparse
import json
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SKILL_DIR = os.path.dirname(_SCRIPT_DIR)
_DEFAULT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SKILL_DIR)))

STYLE_LABELS = {
    'XML': 'XML报文模式（XmlDocument/XmlNode解析）',
    'JSON_BASE': 'JSON+银行基类模式（YbinChannelBaseMessageApplyResponseConverter）',
    'JSON_DIRECT': 'JSON直通模式（JSONObject直接处理）',
}


def load_bank_info(bank):
    """从 bank-index.json 加载指定银行信息"""
    config_path = os.path.normpath(os.path.join(_SKILL_DIR, 'config', 'bank-index.json'))
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get('banks', {}).get(bank)
    return None


def get_style_label(style_str):
    """将 style 枚举转为可读标签"""
    # 优先精确匹配 bank-index.json 中的 style
    for key in STYLE_LABELS:
        if key in style_str:
            return STYLE_LABELS[key]
    return f'{style_str} 模式'


def generate_spec(args, mappings, bank_info):
    """生成 spec.md"""
    style = bank_info.get('style', 'XML') if bank_info else 'XML'
    style_label = get_style_label(style)
    base_class = bank_info.get('base_server', 'AbstractMessageApplyResponseConverter') if bank_info else 'AbstractMessageApplyResponseConverter'
    bank_name = bank_info.get('name', args.bank) if bank_info else args.bank
    adapter_module = bank_info.get('module', f'{args.bank}-adapter-as') if bank_info else f'{args.bank}-adapter-as'

    content = f"""# {args.pice} MessageConverter 开发 Spec

## Why
需要在{bank_name}适配器模块中新增{args.pice}MessageConverter，实现外围系统MQ报文与内部服务DTO的双向转换。

## 报文风格
- 银行: {bank_name}
- 风格: {style_label}
- 基类: {base_class}

## What Changes
- 在{bank_name}适配器模块中新增{args.pice}MessageConverter.java
- 将外围报文字段映射到产品{args.pice}服务的请求DTO
- 实现响应报文的组装
- 配套单元测试{args.pice}MessageConverterTest.java

## Impact
- Affected specs: {args.pice}消息接收与处理
- Affected code:
  - 新增: `banks/ext-{args.bank}/{adapter_module}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/{args.pice}MessageConverter.java`
  - 新增: `banks/ext-{args.bank}/{adapter_module}/src/test/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/{args.pice}MessageConverterTest.java`

## ADDED Requirements

### Requirement: {args.pice}消息转换器 - 外围报文接收与解析
系统SHALL提供{args.pice}MessageConverter，继承{base_class}，接收外围系统广播的报文并转换为内部JSON格式。

#### Scenario: 正常接收广播消息
- **WHEN** 外围系统通过MQ广播发送交易码对应的消息
- **THEN** {args.pice}MessageConverter的fromMessage方法正确解析报文，字段映射关系如下：

| 外围字段 | 外围路径 | 内部DTO字段 | 映射类型 | 说明 |
|---------|---------|-----------|---------|------|
"""
    for m in mappings:
        content += f"    | {m['ext_field']} | {m['ext_path']} | {m['int_field']} | {m.get('mapping_type', '直接映射')} | {m['desc']} |\n"

    content += f"""
### Requirement: {args.pice}消息转换器 - 响应报文组装
系统SHALL将服务处理后的响应结果转换为外围系统期望的报文格式返回。

### Requirement: {args.pice}消息转换器 - 服务码映射
系统SHALL配置正确的外部服务码与内部功能号映射关系。
- 外部服务码: {args.ext_code}
- 内部功能号: {args.pice}

### Requirement: 代码规范遵循
系统SHALL严格遵循{bank_name}适配器模块的代码规范，风格与同银行参考MessageConverter保持一致。

### Requirement: 注释规范
系统SHALL在代码中以注释方式体现接口文档字段名和必要信息：
- 类级Javadoc包含接口文档信息（外围系统、服务码、功能号、报文方向、报文格式）
- 每个字段映射行标注外围字段名（接口文档原文）和映射类型
- 子节点映射标注节点路径和含义
- Header覆盖标注覆盖原因和映射关系

### Requirement: 单元测试
系统SHALL为{args.pice}MessageConverter配套单元测试类{args.pice}MessageConverterTest：
- 使用JUnit5 + @SpringBootTest + @ActiveProfiles("test")，真实Spring上下文
- 继承AbstractAdapterConverterTest，按报文类型选子模板（XML/JSON/HTTP/TCP/Async）
- mock报文存放于src/test/resources/mock-msg/<converter-name>/，命名遵循MUST-6
- 测试覆盖4场景：入参解析/字段映射/应答拼装/异常分支（MUST-5）
- 字段映射断言验证≥3个核心业务字段（MUST-9）

## MODIFIED Requirements
无修改需求。

## REMOVED Requirements
无移除需求。
"""
    return content


def generate_tasks(args, bank_info):
    """生成 tasks.md"""
    base_class = bank_info.get('base_server', 'AbstractMessageApplyResponseConverter') if bank_info else 'AbstractMessageApplyResponseConverter'
    adapter_module = bank_info.get('module', f'{args.bank}-adapter-as') if bank_info else f'{args.bank}-adapter-as'

    return f"""# Tasks

- [ ] Task 1: 创建{args.pice}MessageConverter.java文件
  - [ ] SubTask 1.1: 在 `banks/ext-{args.bank}/{adapter_module}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/` 目录下创建{args.pice}MessageConverter.java
  - [ ] SubTask 1.2: 实现类继承{base_class}，添加@Component注解
  - [ ] SubTask 1.3: 实现getFunctionIdMapping方法，配置外部服务码"{args.ext_code}"与内部功能号"{args.pice}"的映射
  - [ ] SubTask 1.4: 实现fromMessage方法，解析报文并映射外围字段到内部DTO的JSON结构，每个映射行添加接口文档字段名注释
  - [ ] SubTask 1.5: 实现toMessage方法，将内部DTO的JSON响应转换为外围系统期望的报文格式，每个映射行添加注释
  - [ ] SubTask 1.6: 添加类级Javadoc，包含接口文档信息（外围系统、服务码、功能号、报文方向、报文格式、字段映射概览）

- [ ] Task 2: 创建{args.pice}MessageConverterTest.java单元测试
  - [ ] SubTask 2.1: 在 `banks/ext-{args.bank}/{adapter_module}/src/test/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/` 目录下创建测试类
  - [ ] SubTask 2.2: 使用JUnit5 + @SpringBootTest + @ActiveProfiles("test")，继承AbstractAdapterConverterTest
  - [ ] SubTask 2.3: 在src/test/resources/mock-msg/<converter>/下放置请求+应答mock报文
  - [ ] SubTask 2.4: 编写testFromMessage入参解析+字段映射测试方法
  - [ ] SubTask 2.5: 编写testToMessage应答拼装测试方法
  - [ ] SubTask 2.6: 编写异常分支测试方法（子节点缺失/字段缺失）
  - [ ] SubTask 2.7: 编写testGetFunctionIdMapping映射配置测试方法

# Task Dependencies
- Task 1 和 Task 2 可并行开发
- Task 1 完成后需IDE诊断验证无语法错误
"""


def generate_checklist(args, mappings, bank_info):
    """生成 checklist.md"""
    base_class = bank_info.get('base_server', 'AbstractMessageApplyResponseConverter') if bank_info else 'AbstractMessageApplyResponseConverter'
    adapter_module = bank_info.get('module', f'{args.bank}-adapter-as') if bank_info else f'{args.bank}-adapter-as'

    content = f"""- [ ] {args.pice}MessageConverter.java文件已创建在正确路径（banks/ext-{args.bank}/{adapter_module}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/）
- [ ] 类继承{base_class}，@Component注解value为"{args.pice}MessageConverter"
- [ ] 类级Javadoc包含接口文档信息（外围系统、服务码、功能号、报文方向、报文格式）
- [ ] getFunctionIdMapping返回正确的映射数组：外部服务码"{args.ext_code}"映射到内部功能号"{args.pice}"
- [ ] getFunctionIdMapping方法有Javadoc注释说明映射规则和路由公式
- [ ] fromMessage方法正确解析报文，外围字段到内部DTO的映射关系完整：
"""
    for m in mappings:
        content += f"  - {m['ext_field']} → {m['int_field']} ({m.get('mapping_type', '直接映射')})\n"

    content += f"""- [ ] fromMessage方法每个字段映射行有注释标注外围字段名（接口文档原文）
- [ ] fromMessage方法子节点映射有注释标注节点路径和含义
- [ ] toMessage方法正确将响应JSON转换为外围报文格式
- [ ] toMessage方法每个响应字段映射行有注释
- [ ] 代码风格与同银行参考MessageConverter保持一致
- [ ] IDE诊断无语法错误
- [ ] {args.pice}MessageConverterTest.java已创建在正确路径（src/test/java对应目录）
- [ ] 单元测试使用JUnit5 + @SpringBootTest + @ActiveProfiles("test")
- [ ] 测试类继承AbstractAdapterConverterTest，按报文类型选子模板
- [ ] mock报文存放于src/test/resources/mock-msg/<converter>/，命名遵循MUST-6
- [ ] 测试覆盖4场景：入参解析/字段映射/应答拼装/异常分支
- [ ] 字段映射断言验证≥3个核心业务字段（MUST-9）
- [ ] 单元测试可独立执行（mvn test -Dtest={args.pice}MessageConverterTest）
"""
    return content


def main():
    parser = argparse.ArgumentParser(description='BEMP 适配器 MessageConverter Spec 文档生成')
    parser.add_argument('--pice', required=True, help='PICE代码，如 PICE070701')
    parser.add_argument('--bank', required=True, help='银行标识，取 _shared/env-config.json 的 BANK_CODE（如 hnnxbank），勿硬编码在脚本中')
    parser.add_argument('--module', required=True, help='业务模块，如 ecif/credit/ebank')
    parser.add_argument('--ext-code', required=True, help='外部服务码，如 EBBS.0402006.01')
    parser.add_argument('--output', required=True, help='输出目录')
    parser.add_argument('--mappings', default='[]', help='字段映射JSON数组')
    args = parser.parse_args()

    mappings = json.loads(args.mappings)
    bank_info = load_bank_info(args.bank)

    os.makedirs(args.output, exist_ok=True)

    with open(os.path.join(args.output, 'spec.md'), 'w', encoding='utf-8') as f:
        f.write(generate_spec(args, mappings, bank_info))

    with open(os.path.join(args.output, 'tasks.md'), 'w', encoding='utf-8') as f:
        f.write(generate_tasks(args, bank_info))

    with open(os.path.join(args.output, 'checklist.md'), 'w', encoding='utf-8') as f:
        f.write(generate_checklist(args, mappings, bank_info))

    style = bank_info.get('style', '未配置') if bank_info else '未配置'
    logger.info(f'Spec 文档已生成到: {args.output}')
    logger.info(f'  - spec.md / tasks.md / checklist.md')
    logger.info(f'  - 银行风格: {style}')


if __name__ == '__main__':
    main()
