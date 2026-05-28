"""
BEMP适配器MessageConverter Spec文档生成脚本
根据字段映射关系自动生成spec.md、tasks.md、checklist.md
支持多银行报文风格（XML/JSON+基类/JSON直通）

用法:
    python generate_spec.py --pice PICE070701 --bank hnnxbank --module ecif --ext-code EBBS.0402006.01 --output .trae/specs/<change-id>
    python generate_spec.py --pice PICE030505 --bank yibbank --module credit --ext-code PICE030505 --output .trae/specs/<change-id>
"""
import argparse
import os
import json


def load_bank_config(bank):
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "bank-config.json")
    config_path = os.path.normpath(config_path)
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config.get("banks", {}).get(bank)
    return None


def get_style_label(message_style):
    labels = {
        "XML": "XML报文模式（XmlDocument/XmlNode解析）",
        "JSON_BASE": "JSON+银行基类模式（YbinChannelBaseMessageApplyResponseConverter）",
        "JSON_DIRECT": "JSON直通模式（JSONObject直接处理）"
    }
    return labels.get(message_style, "未知模式")


def generate_spec(args, mappings, bank_config):
    message_style = bank_config.get("message_style", "XML") if bank_config else "XML"
    style_label = get_style_label(message_style)
    base_class = bank_config.get("base_class", "AbstractMessageApplyResponseConverter") if bank_config else "AbstractMessageApplyResponseConverter"
    bank_name = bank_config.get("bank_name", args.bank) if bank_config else args.bank

    spec_content = f"""# {args.pice} MessageConverter开发 Spec

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
  - 新增文件: `banks/ext-{args.bank}/{bank_config.get('adapter_module', args.bank + '-adapter-as')}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/{args.pice}MessageConverter.java`
  - 新增文件: `banks/ext-{args.bank}/{bank_config.get('adapter_module', args.bank + '-adapter-as')}/src/test/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/{args.pice}MessageConverterTest.java`

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
        spec_content += f"    | {m['ext_field']} | {m['ext_path']} | {m['int_field']} | {m.get('mapping_type', '直接映射')} | {m['desc']} |\n"

    spec_content += f"""
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
- 使用JUnit4 + Mockito，不启动Spring上下文
- 测试fromMessage正常场景和子节点null边界场景
- 测试toMessage正常场景和空数组边界场景
- 测试getFunctionIdMapping映射配置正确性

## MODIFIED Requirements
无修改需求。

## REMOVED Requirements
无移除需求。
"""
    return spec_content


def generate_tasks(args, bank_config):
    message_style = bank_config.get("message_style", "XML") if bank_config else "XML"
    base_class = bank_config.get("base_class", "AbstractMessageApplyResponseConverter") if bank_config else "AbstractMessageApplyResponseConverter"
    adapter_module = bank_config.get("adapter_module", args.bank + "-adapter-as") if bank_config else args.bank + "-adapter-as"

    tasks_content = f"""# Tasks

- [ ] Task 1: 创建{args.pice}MessageConverter.java文件
  - [ ] SubTask 1.1: 在`banks/ext-{args.bank}/{adapter_module}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/`目录下创建{args.pice}MessageConverter.java
  - [ ] SubTask 1.2: 实现类继承{base_class}，添加@Component注解
  - [ ] SubTask 1.3: 实现getFunctionIdMapping方法，配置外部服务码"{args.ext_code}"与内部功能号"{args.pice}"的映射
  - [ ] SubTask 1.4: 实现fromMessage方法，解析报文并映射外围字段到内部DTO的JSON结构，每个映射行添加接口文档字段名注释
  - [ ] SubTask 1.5: 实现toMessage方法，将内部DTO的JSON响应转换为外围系统期望的报文格式，每个映射行添加注释
  - [ ] SubTask 1.6: 添加类级Javadoc，包含接口文档信息（外围系统、服务码、功能号、报文方向、报文格式、字段映射概览）

- [ ] Task 2: 创建{args.pice}MessageConverterTest.java单元测试
  - [ ] SubTask 2.1: 在`banks/ext-{args.bank}/{adapter_module}/src/test/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/`目录下创建测试类
  - [ ] SubTask 2.2: 使用JUnit4 + Mockito，不启动Spring上下文
  - [ ] SubTask 2.3: 编写testFromMessage_normalRequest测试方法
  - [ ] SubTask 2.4: 编写testFromMessage_subNodeNull边界测试方法
  - [ ] SubTask 2.5: 编写testToMessage_normalResponse测试方法
  - [ ] SubTask 2.6: 编写testToMessage_emptyRetData边界测试方法
  - [ ] SubTask 2.7: 编写testGetFunctionIdMapping映射配置测试方法

# Task Dependencies
- Task 1 和 Task 2 可并行开发
- Task 1 完成后需IDE诊断验证无语法错误
"""
    return tasks_content


def generate_checklist(args, mappings, bank_config):
    message_style = bank_config.get("message_style", "XML") if bank_config else "XML"
    base_class = bank_config.get("base_class", "AbstractMessageApplyResponseConverter") if bank_config else "AbstractMessageApplyResponseConverter"
    adapter_module = bank_config.get("adapter_module", args.bank + "-adapter-as") if bank_config else args.bank + "-adapter-as"

    checklist_content = f"""- [ ] {args.pice}MessageConverter.java文件已创建在正确路径（banks/ext-{args.bank}/{adapter_module}/src/main/java/com/hundsun/bemp/{args.bank}/adapter/msg/server/{args.module}/）
- [ ] 类继承{base_class}，@Component注解value为"{args.pice}MessageConverter"
- [ ] 类级Javadoc包含接口文档信息（外围系统、服务码、功能号、报文方向、报文格式）
- [ ] getFunctionIdMapping返回正确的映射数组：外部服务码"{args.ext_code}"映射到内部功能号"{args.pice}"
- [ ] getFunctionIdMapping方法有Javadoc注释说明映射规则和路由公式
- [ ] fromMessage方法正确解析报文，外围字段到内部DTO的映射关系完整：
"""
    for m in mappings:
        checklist_content += f"  - {m['ext_field']} → {m['int_field']} ({m.get('mapping_type', '直接映射')})\n"

    checklist_content += f"""- [ ] fromMessage方法每个字段映射行有注释标注外围字段名（接口文档原文）
- [ ] fromMessage方法子节点映射有注释标注节点路径和含义
- [ ] toMessage方法正确将响应JSON转换为外围报文格式
- [ ] toMessage方法每个响应字段映射行有注释
- [ ] 代码风格与同银行参考MessageConverter保持一致
- [ ] IDE诊断无语法错误
- [ ] {args.pice}MessageConverterTest.java已创建在正确路径（src/test/java对应目录）
- [ ] 单元测试使用JUnit4 + Mockito，不启动Spring上下文
- [ ] 测试覆盖fromMessage正常场景和子节点null边界场景
- [ ] 测试覆盖toMessage正常场景和空数组边界场景
- [ ] 测试覆盖getFunctionIdMapping映射配置正确性
- [ ] 单元测试可独立执行（mvn test -Dtest={args.pice}MessageConverterTest）
"""
    return checklist_content


def main():
    parser = argparse.ArgumentParser(description="BEMP适配器MessageConverter Spec文档生成")
    parser.add_argument("--pice", required=True, help="PICE代码，如PICE070701")
    parser.add_argument("--bank", required=True, help="银行标识，如hnnxbank")
    parser.add_argument("--module", required=True, help="业务模块，如ecif/credit/ebank")
    parser.add_argument("--ext-code", required=True, help="外部服务码，如EBBS.0402006.01")
    parser.add_argument("--output", required=True, help="输出目录")
    parser.add_argument("--mappings", default="[]", help="字段映射JSON数组")
    args = parser.parse_args()

    mappings = json.loads(args.mappings)
    bank_config = load_bank_config(args.bank)

    os.makedirs(args.output, exist_ok=True)

    with open(os.path.join(args.output, "spec.md"), "w", encoding="utf-8") as f:
        f.write(generate_spec(args, mappings, bank_config))

    with open(os.path.join(args.output, "tasks.md"), "w", encoding="utf-8") as f:
        f.write(generate_tasks(args, bank_config))

    with open(os.path.join(args.output, "checklist.md"), "w", encoding="utf-8") as f:
        f.write(generate_checklist(args, mappings, bank_config))

    print(f"Spec文档已生成到: {args.output}")
    print(f"  - spec.md")
    print(f"  - tasks.md")
    print(f"  - checklist.md")
    if bank_config:
        print(f"  - 银行风格: {bank_config.get('message_style')}")
    else:
        print(f"  - 银行风格: 未配置，使用默认XML模式")


if __name__ == "__main__":
    main()
