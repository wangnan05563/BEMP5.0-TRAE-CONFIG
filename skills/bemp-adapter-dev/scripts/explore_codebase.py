"""
BEMP 适配器 MessageConverter 代码探索脚本
自动搜索同银行参考实现、其他银行同类实现、产品接口定义
支持多银行报文风格识别（XML/JSON+基类/JSON直通）

用法:
    python explore_codebase.py --bank hnnxbank --pice PICE070701 --root D:/code/QJ/BEMP5.0DEV

环境变量:
    BEMP_ROOT  - 项目根目录（优先级低于 --root 参数）
"""
import argparse
import json
import logging
import os
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SKILL_DIR = os.path.dirname(_SCRIPT_DIR)
_DEFAULT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SKILL_DIR)))


def resolve_project_root(cli_root=None):
    """解析项目根目录，优先级: CLI参数 > 环境变量 > 默认推算"""
    root = cli_root or os.environ.get('BEMP_ROOT') or _DEFAULT_ROOT
    root = os.path.normpath(root)
    if not os.path.isdir(root):
        raise FileNotFoundError(f"项目根目录不存在: {root}")
    return root


def load_bank_index():
    """从 config/bank-index.json 加载银行索引（替代旧的 bank-config.json）"""
    config_path = os.path.normpath(os.path.join(_SKILL_DIR, 'config', 'bank-index.json'))
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def run_cmd(cmd, cwd):
    """执行 shell 命令并返回标准输出"""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            cwd=cwd, encoding='utf-8', errors='replace'
        )
        return result.stdout.strip()
    except Exception as e:
        logger.warning(f"命令执行失败: {e}")
        return ''


def detect_message_style(bank, root):
    """自动检测银行的报文风格"""
    base_converter = run_cmd(
        f'dir /s /b "{root}\\banks\\ext-{bank}\\*BaseMessageApplyResponseConverter.java" 2>nul | findstr /i "src\\main\\java"',
        root
    )
    if 'YbinChannelBase' in base_converter:
        return 'JSON_BASE', base_converter

    xml_converters = run_cmd(
        f'dir /s /b "{root}\\banks\\ext-{bank}\\*MessageConverter.java" 2>nul | findstr /i "src\\main\\java"',
        root
    )
    sample_files = [f for f in xml_converters.split('\n') if f.strip() and 'target' not in f][:3]

    has_xml_import = False
    has_json_import = False
    for f in sample_files:
        try:
            with open(f, 'r', encoding='utf-8', errors='replace') as fh:
                content = fh.read()
                if 'XmlDocument' in content:
                    has_xml_import = True
                if 'JSONObject' in content and 'XmlDocument' not in content:
                    has_json_import = True
        except Exception:
            pass

    if has_xml_import:
        return 'XML', ''
    if has_json_import:
        return 'JSON_DIRECT', ''
    return 'UNKNOWN', ''


def find_same_bank_converters(bank, root):
    """查找同银行的所有 MessageConverter"""
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*MessageConverter.java" 2>nul | findstr /i "src\\main\\java"'
    output = run_cmd(cmd, root)
    return [f for f in output.split('\n') if f.strip() and 'target' not in f]


def find_other_bank_converters(pice_code, root):
    """查找其他银行的同类 PICE 实现"""
    cmd = f'findstr /s /m /c:"{pice_code}MessageConverter" "{root}\\banks\\ext-*\\*MessageConverter.java" 2>nul'
    output = run_cmd(cmd, root)
    return [f for f in output.split('\n') if f.strip() and 'target' not in f]


def find_service_interface(pice_code, root):
    """查找产品接口定义"""
    cmd = f'findstr /s /m /c:"{pice_code}" "{root}\\served\\api\\cs\\channel-api\\src\\main\\java\\**\\*.java" 2>nul'
    output = run_cmd(cmd, root)
    return [f for f in output.split('\n') if f.strip() and 'Service.java' in f]


def find_util_classes(bank, root, message_style):
    """查找银行工具类"""
    style_utils = {
        'XML': ['HeadUtils', 'XmlUtil', 'MessageConstants', 'MqMessageInterceptor'],
        'JSON_BASE': ['XmlUtil', 'TransUtil', 'RespUtil', 'ProdConst', 'YbinTcpMessageInterceptor'],
        'JSON_DIRECT': ['HeadUtils', 'XmlUtil', 'CommonUtils', 'MessageConstants', 'TcpMessageInterceptor'],
    }
    util_names = style_utils.get(message_style, ['HeadUtils', 'XmlUtil', 'MessageConstants'])

    utils = {}
    for name in util_names:
        cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*{name}.java" 2>nul | findstr /i "src\\main\\java"'
        output = run_cmd(cmd, root)
        files = [f for f in output.split('\n') if f.strip() and 'target' not in f]
        if files:
            utils[name] = files[0]
    return utils


def find_base_classes(bank, root):
    """查找银行自定义基类"""
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*Base*MessageApplyResponseConverter.java" 2>nul | findstr /i "src\\main\\java"'
    output = run_cmd(cmd, root)
    return [f for f in output.split('\n') if f.strip() and 'target' not in f]


def find_test_files(bank, root):
    """查找银行测试文件"""
    cmd = f'dir /s /b "{root}\\banks\\ext-{bank}\\*Test.java" 2>nul | findstr /i "src\\test\\java"'
    output = run_cmd(cmd, root)
    return [f for f in output.split('\n') if f.strip()]


def main():
    parser = argparse.ArgumentParser(description='BEMP 适配器 MessageConverter 代码探索')
    parser.add_argument('--bank', required=True, help='银行标识，如 hnnxbank')
    parser.add_argument('--pice', required=True, help='PICE 代码，如 PICE070701')
    parser.add_argument('--root', default=None, help='项目根目录')
    args = parser.parse_args()

    root = resolve_project_root(args.root)
    print(f'=== BEMP 适配器代码探索: {args.bank} / {args.pice} ===\n')

    # 从 bank-index.json 获取银行配置
    index = load_bank_index()
    bank_info = None
    if index and args.bank in index.get('banks', {}):
        bank_info = index['banks'][args.bank]
        style = bank_info.get('style', 'UNKNOWN')
        print(f'[0] 银行配置（来自 bank-index.json）:')
        print(f'  - 名称: {bank_info.get("name")}')
        print(f'  - 风格: {style}')
        print(f'  - Server 基类: {bank_info.get("base_server")}')
        print(f'  - Client 基类: {bank_info.get("base_client")}')
        if bank_info.get('custom_abstracts'):
            print(f'  - 自定义基类: {bank_info.get("custom_abstracts")}')
        print()
    else:
        message_style, base_file = detect_message_style(args.bank, root)
        print(f'[0] 自动检测报文风格: {message_style}')
        if base_file:
            print(f'  - 基类文件: {base_file}')
        print()

    message_style = bank_info.get('style', 'UNKNOWN') if bank_info else 'UNKNOWN'

    print('[1] 同银行参考 MessageConverter:')
    same_bank = find_same_bank_converters(args.bank, root)
    for f in same_bank[:10]:
        print(f'  - {f}')
    if not same_bank:
        print('  (未找到)')

    print(f'\n[2] 银行基类:')
    base_classes = find_base_classes(args.bank, root)
    for f in base_classes:
        print(f'  - {f}')
    if not base_classes:
        print('  (无银行基类，使用 AbstractMessageApplyResponseConverter)')

    print(f'\n[3] 其他银行 {args.pice} 实现:')
    other_bank = find_other_bank_converters(args.pice, root)
    for f in other_bank:
        bank_name = f.split('ext-')[1].split('\\')[0] if 'ext-' in f else 'unknown'
        print(f'  - [{bank_name}] {f}')
    if not other_bank:
        print('  (未找到)')

    print(f'\n[4] 产品接口定义:')
    service_files = find_service_interface(args.pice, root)
    for f in service_files:
        print(f'  - {f}')
    if not service_files:
        print('  (未找到)')

    print(f'\n[5] 工具类 (按 {message_style} 风格):')
    utils = find_util_classes(args.bank, root, message_style)
    for name, path in utils.items():
        print(f'  - {name}: {path}')
    if not utils:
        print('  (未找到)')

    print(f'\n[6] 单元测试参考:')
    test_files = find_test_files(args.bank, root)
    for f in test_files[:5]:
        print(f'  - {f}')
    if not test_files:
        print('  (未找到，将使用默认 JUnit5+@SpringBootTest 模式)')

    print('\n=== 探索完成 ===')


if __name__ == '__main__':
    main()
