"""
BEMP 适配器银行代码扫描脚本
扫描 banks/ 目录下所有银行模块，生成结构化扫描数据

用法:
    python scan_banks.py [--root PROJECT_ROOT] [--output OUTPUT_PATH]

环境变量:
    BEMP_ROOT  - 项目根目录（优先级低于 --root 参数）
"""
import argparse
import json
import os
import re
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# 项目根目录解析优先级: --root > BEMP_ROOT > 脚本相对推算
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


def scan_bank(bank_dir, bk):
    """扫描单个银行模块，返回结构化数据"""
    as_dir = os.path.join(bank_dir, bk + '-adapter-as')
    result = {
        'bk': bk,
        'status': 'EMPTY',
        'conv_count': 0,
        'test_count': 0,
        'channels': [],
        'custom_abs': [],
        'base_svr': '',
        'base_cli': '',
        'pkg': ''
    }

    if not os.path.isdir(as_dir):
        return result

    src_main = os.path.join(as_dir, 'src', 'main', 'java', 'com', 'hundsun', 'bemp')
    if not os.path.isdir(src_main):
        return result

    # 公共基类列表，用于区分自定义抽象类
    common_bases = {
        'AbstractMessageApplyResponseConverter',
        'AbstractGenericMessageRequestReplyConverter',
        'AbstractHttpMessageRequestReplyConverter',
        'AbstractTcpMessageRequestReplyConverter',
        'AbstractWsMessageRequestReplyConverter',
        'AbstractJmsMessageRequestReplyConverter',
        'AbstractAmqpMessageRequestReplyConverter',
        'AbstractGenericMessageApplyResponseConverter',
        'AbstractMessageRequestReplyConverter',
        'AbstractMessageConverter',
    }

    for root, _subdirs, files in os.walk(src_main):
        for fn in files:
            if not fn.endswith('MessageConverter.java'):
                continue
            result['conv_count'] += 1
            fp = os.path.join(root, fn)
            content = _read_file_safe(fp)
            if not content:
                continue

            m = re.search(r'extends\s+(\w+)', content)
            if not m:
                continue
            bc = m.group(1)

            if bc not in common_bases and bc not in result['custom_abs']:
                result['custom_abs'].append(bc)
            elif 'ApplyResponse' in bc and not result['base_svr']:
                result['base_svr'] = bc
            elif 'Request' in bc and not result['base_cli']:
                result['base_cli'] = bc
            elif not result['base_svr']:
                result['base_svr'] = bc
            elif not result['base_cli']:
                result['base_cli'] = bc

        # 收集 channel 目录名
        rel = os.path.relpath(root, src_main)
        parts = rel.replace(os.sep, '/').split('/')
        channel_names = {'server', 'client', 'common', 'dto', 'tcp', 'ws', 'http', 'utils', 'branch', 'credit'}
        if len(parts) >= 2 and parts[-1] in channel_names:
            if parts[-1] not in result['channels']:
                result['channels'].append(parts[-1])

    # 推断包路径
    for item in os.listdir(src_main):
        sub = os.path.join(src_main, item)
        if os.path.isdir(sub):
            for item2 in os.listdir(sub):
                if item2 == 'adapter':
                    result['pkg'] = f'com/hundsun/bemp/{item}/adapter'
                    break

    # 统计测试文件
    test_dir = os.path.join(as_dir, 'src', 'test', 'java')
    if os.path.isdir(test_dir):
        for root, _subdirs, files in os.walk(test_dir):
            result['test_count'] += sum(1 for fn in files if fn.endswith('Test.java'))

    if result['conv_count'] > 0:
        result['status'] = 'IMPLEMENTED'

    return result


def _read_file_safe(filepath):
    """安全读取文件，依次尝试 UTF-8 和 GBK 编码"""
    for encoding in ('utf-8', 'gbk'):
        try:
            with open(filepath, 'r', encoding=encoding) as fh:
                return fh.read()
        except (UnicodeDecodeError, FileNotFoundError):
            continue
    return ''


def main():
    parser = argparse.ArgumentParser(description='BEMP 适配器银行代码扫描')
    parser.add_argument('--root', default=None, help='项目根目录')
    parser.add_argument('--output', default=None, help='扫描结果输出路径（默认: banks/_scan.json）')
    args = parser.parse_args()

    root = resolve_project_root(args.root)
    banks_dir = os.path.join(root, 'banks')

    if not os.path.isdir(banks_dir):
        logger.error(f"banks 目录不存在: {banks_dir}")
        sys.exit(1)

    # 扫描所有 ext-* 银行目录
    dirs = sorted([
        d for d in os.listdir(banks_dir)
        if os.path.isdir(os.path.join(banks_dir, d)) and d.startswith('ext-')
    ])

    results = []
    for d in dirs:
        bk = d.replace('ext-', '')
        logger.info(f"扫描: {bk}")
        results.append(scan_bank(os.path.join(banks_dir, d), bk))

    # 输出扫描结果
    output_path = args.output or os.path.join(banks_dir, '_scan.json')
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    impl = [r for r in results if r['status'] == 'IMPLEMENTED']
    empty = [r for r in results if r['status'] == 'EMPTY']
    logger.info(f"扫描完成: 总计 {len(results)} | IMPLEMENTED={len(impl)} | EMPTY={len(empty)}")
    logger.info(f"结果已写入: {output_path}")


if __name__ == '__main__':
    main()
