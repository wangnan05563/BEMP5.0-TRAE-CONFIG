"""
BEMP适配器MessageConverter代码探索脚本
自动搜索同银行参考实现、其他银行同类实现、产品接口定义
支持多银行报文风格识别（XML/JSON+基类/JSON直通）

用法:
    python explore_codebase.py --bank hnnxbank --pice PICE070701 --root D:/code/QJ/BEMP5.0DEV
"""
import argparse
import os
import subprocess
import json
import sys


BANK_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "bank-config.json")


def load_bank_config():
    config_path = os.path.normpath(BANK_CONFIG_PATH)
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def run_cmd(cmd, cwd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd, encoding="utf-8", errors="replace")
    return result.stdout.strip()


def detect_message_style(bank, root):
    base_converter = run_cmd(
        f'dir /s /b "{root}\\banks\\ext-{bank}\\*BaseMessageApplyResponseConverter.java" 2>nul | findstr /i "src\\main\\java"',
        root
    )
    abstract_converter = run_cmd(
        f'dir /s /b "{root}\\banks\\ext-{bank}\\*Abstract*MessageApplyResponseConverter.java" 2>nul | findstr /i "src\\main\\java"',
        root
    )
    if "YbinChannelBase" in base_converter:
        return "JSON_BASE", base_converter
    xml_converters = run_cmd(
        f'dir /s /b "{root}\\banks\\ext-{bank}\\*MessageConverter.java" 2>nul | findstr /i "src\\main\\java"',
        root
    )
    sample_files = [f for f in xml_converters.split("\n") if f.strip() and "target" not in f][:3]
    has_xml_import = False
    has_json_import = False
    for f in sample_files:
        try:
            with open(f, "r", encoding="utf-8", errors="replace") as fh:
                content = fh.read()
                if "XmlDocument" in content:
                    has_xml_import = True
                if "JSONObject" in content and "XmlDocument" not in content:
                    has_json_import = True
        except Exception:
            pass
    if has_xml_import:
        return "XML", ""
    if has_json_import:
        return "JSON_DIRECT", ""
    return "UNKNOWN", ""


def find_same_bank_converters(bank, root):
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*MessageConverter.java" 2>nul | findstr /i "src\\main\\java"'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip() and "target" not in f]
    return files


def find_other_bank_converters(pice_code, root):
    cmd = f'findstr /s /m /c:"{pice_code}MessageConverter" "{root}\\banks\\ext-*\\*MessageConverter.java" 2>nul'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip() and "target" not in f]
    return files


def find_service_interface(pice_code, root):
    cmd = f'findstr /s /m /c:"{pice_code}" "{root}\\served\\api\\cs\\channel-api\\src\\main\\java\\**\\*.java" 2>nul'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip() and "Service.java" in f]
    return files


def find_dto_files(service_name, root):
    service_lower = service_name.lower()
    cmd = f'dir /s /b "{root}\\served\\api\\cs\\channel-api\\src\\main\\java\\**\\{service_lower}\\*Dto.java" 2>nul'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip()]
    return files


def find_util_classes(bank, root, message_style):
    utils = {}
    if message_style == "XML":
        util_names = ["HeadUtils", "XmlUtil", "MessageConstants", "MqMessageInterceptor"]
    elif message_style == "JSON_BASE":
        util_names = ["XmlUtil", "TransUtil", "RespUtil", "ProdConst", "YbinTcpMessageInterceptor"]
    elif message_style == "JSON_DIRECT":
        util_names = ["HeadUtils", "XmlUtil", "CommonUtils", "MessageConstants", "TcpMessageInterceptor"]
    else:
        util_names = ["HeadUtils", "XmlUtil", "MessageConstants"]
    for name in util_names:
        cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*{name}.java" 2>nul | findstr /i "src\\main\\java"'
        output = run_cmd(cmd, root)
        files = [f for f in output.split("\n") if f.strip() and "target" not in f]
        if files:
            utils[name] = files[0]
    return utils


def find_base_classes(bank, root):
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*Base*MessageApplyResponseConverter.java" 2>nul | findstr /i "src\\main\\java"'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip() and "target" not in f]
    return files


def find_test_files(bank, root):
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*Test.java" 2>nul | findstr /i "src\\test\\java"'
    output = run_cmd(cmd, root)
    files = [f for f in output.split("\n") if f.strip()]
    return files


def main():
    parser = argparse.ArgumentParser(description="BEMP适配器MessageConverter代码探索")
    parser.add_argument("--bank", required=True, help="银行标识，如hnnxbank")
    parser.add_argument("--pice", required=True, help="PICE代码，如PICE070701")
    parser.add_argument("--root", required=True, help="项目根目录")
    args = parser.parse_args()

    print(f"=== BEMP适配器代码探索: {args.bank} / {args.pice} ===\n")

    config = load_bank_config()
    bank_config = None
    if config and args.bank in config.get("banks", {}):
        bank_config = config["banks"][args.bank]
        print(f"[0] 银行配置（来自bank-config.json）:")
        print(f"  - 银行名称: {bank_config.get('bank_name')}")
        print(f"  - 报文风格: {bank_config.get('message_style')} - {bank_config.get('style_detail')}")
        print(f"  - 基类: {bank_config.get('base_class')}")
        print(f"  - 适配器模块: {bank_config.get('adapter_module')}")
        print()
    else:
        message_style, base_file = detect_message_style(args.bank, args.root)
        print(f"[0] 自动检测报文风格: {message_style}")
        if base_file:
            print(f"  - 基类文件: {base_file}")
        print()

    message_style = bank_config.get("message_style", "UNKNOWN") if bank_config else "UNKNOWN"

    print("[1] 同银行参考MessageConverter:")
    same_bank = find_same_bank_converters(args.bank, args.root)
    for f in same_bank[:10]:
        print(f"  - {f}")
    if not same_bank:
        print("  (未找到)")

    print(f"\n[2] 银行基类:")
    base_classes = find_base_classes(args.bank, args.root)
    for f in base_classes:
        print(f"  - {f}")
    if not base_classes:
        print("  (无银行基类，使用AbstractMessageApplyResponseConverter)")

    print(f"\n[3] 其他银行{args.pice}实现:")
    other_bank = find_other_bank_converters(args.pice, args.root)
    for f in other_bank:
        bank_name = f.split("ext-")[1].split("\\")[0] if "ext-" in f else "unknown"
        print(f"  - [{bank_name}] {f}")
    if not other_bank:
        print("  (未找到)")

    print(f"\n[4] 产品接口定义:")
    service_files = find_service_interface(args.pice, args.root)
    for f in service_files:
        print(f"  - {f}")
    if not service_files:
        print("  (未找到)")

    print(f"\n[5] 工具类 (按{message_style}风格):")
    utils = find_util_classes(args.bank, args.root, message_style)
    for name, path in utils.items():
        print(f"  - {name}: {path}")
    if not utils:
        print("  (未找到)")

    print(f"\n[6] 单元测试参考:")
    test_files = find_test_files(args.bank, args.root)
    for f in test_files[:5]:
        print(f"  - {f}")
    if not test_files:
        print("  (未找到，将使用默认JUnit4+Mockito模式)")

    print("\n=== 探索完成 ===")


if __name__ == "__main__":
    main()
