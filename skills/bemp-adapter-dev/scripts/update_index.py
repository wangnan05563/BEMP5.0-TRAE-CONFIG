"""
BEMP 适配器 bank-index.json 增量更新脚本
基于扫描数据增量更新银行索引，标记 LEGACY，生成缺失模板

用法:
    python update_index.py [--root PROJECT_ROOT] [--scan SCAN_PATH] [--branch BRANCH]

环境变量:
    BEMP_ROOT  - 项目根目录（优先级低于 --root 参数）
"""
import argparse
import json
import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SKILL_DIR = os.path.dirname(_SCRIPT_DIR)
_DEFAULT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SKILL_DIR)))

# 银行中文名映射
BANK_NAMES = {
    'ahnxbank': '安徽农商银行', 'amgjbank': '澳门国际银行', 'bohbank': '渤海银行',
    'cangzbank': '沧州银行', 'chaoybank': '朝阳银行', 'cqbank': '重庆银行',
    'dgbank': '达州银行', 'dlnsbank': '大连农商银行', 'dybank': '东营银行',
    'fabbank': '发银行', 'fxbank': '阜新银行', 'hbbank': '河北银行',
    'hebbank': '河北银行(新)', 'hkbank': '汉口银行', 'hlsecurity': '合立安全',
    'hnnxbank': '河南农商银行', 'huisbank': '汇商银行', 'huzbank': '湖州银行',
    'hxbank': '华夏银行', 'hybank': '衡水银行', 'jiaxbank': '嘉兴银行',
    'jincbank': '晋城银行', 'jinzbank': '锦州银行', 'jnbank': '济宁银行',
    'jsbank': '江苏银行', 'ksbank': '昆山银行', 'nbtsbank': '宁波通商银行',
    'nmgbank': '内蒙古银行', 'nybank': '南阳银行', 'pabank': '平安银行',
    'pdsbank': '平顶山银行', 'qhdbank': '秦皇岛银行', 'qinnbank': '钦州银行',
    'qlbank': '齐鲁银行', 'qsbank': '齐商银行', 'sample': '示例银行',
    'sanlbank': '三立银行', 'sdnxbank': '山东农商银行', 'shangrbank': '上饶银行',
    'shaoxbank': '绍兴银行', 'snbank': '思南银行', 'sxnxbank': '陕西农商银行',
    'szbank': '苏州银行', 'tianjbank': '天津银行', 'wfbank': '潍坊银行',
    'wsbank': '网商银行', 'xintbank': '邢台银行', 'xmgjbank': '厦门国际银行',
    'xwbank': '新网银行', 'xzhbank': '新郑银行', 'yibbank': '宜宾银行',
    'zdcfinance': '中电财', 'zgcbank': '中国光大银行', 'zghbank': '中国工商银行',
    'zjgbank': '珠江西岸银行', 'zjnxbank': '浙江农商银行',
    'baodbank': '保定银行', 'chengdbank': '成都银行', 'dandbank': '丹东银行',
    'dzbank': '德州银行', 'erdsbank': '鄂尔多斯银行', 'hengshbank': '衡水银行(新)',
    'hongtbank': '洪洞银行', 'jjbank': '九江银行', 'jzzlbank': '焦作中旅银行',
    'klbank': '开封银行', 'langfbank': '廊坊银行', 'lanzbank': '兰州银行',
    'liuzbank': '柳州银行', 'ningxbank': '宁夏银行', 'qdbank': '青岛银行',
    'qhbank': '青海银行', 'sanxbank': '三峡银行', 'shnsbank': '石家庄农商银行',
    'tabank': '塔城银行', 'whnsbank': '武汉农商银行', 'xinhbank': '新华银行',
    'xxbank': '新乡银行', 'zjtfinance': '浙江台交金融',
}

# style -> test_template 映射
STYLE_TEST_MAP = {
    'SERVER_XML+CLIENT_TCP': 'AbstractTcpMessageConverterTest.java.tpl',
    'SERVER_XML+CLIENT_HTTP': 'AbstractHttpMessageConverterTest.java.tpl',
    'SERVER_XML+CLIENT_WS': 'AbstractWsMessageConverterTest.java.tpl',
    'SERVER_XML+CLIENT_JMS': 'AbstractAdapterConverterTest.java.tpl',
    'SERVER_XML+CLIENT_MIXED': 'AbstractAdapterConverterTest.java.tpl',
    'SERVER_XML+CLIENT_TCP_ESB': 'AbstractTcpMessageConverterTest.java.tpl',
    'SERVER_XML+CLIENT_GENERIC': 'AbstractAdapterConverterTest.java.tpl',
    'SERVER_XML+CLIENT_HTTP_SIGN': 'AbstractSignatureMessageConverterTest.java.tpl',
    'SERVER_XML_ONLY': 'AbstractCustomServerMessageConverterTest.java.tpl',
    'SERVER_GENERIC+CLIENT_TCP': 'AbstractTcpMessageConverterTest.java.tpl',
    'SERVER_GENERIC+CLIENT_GENERIC': 'AbstractAdapterConverterTest.java.tpl',
    'SERVER_WS+CLIENT_WS': 'AbstractWsMessageConverterTest.java.tpl',
    'SERVER_JSON+CLIENT_HTTP': 'AbstractHttpMessageConverterTest.java.tpl',
    'SERVER_XML+CLIENT_TCP_CPES': 'AbstractTcpMessageConverterTest.java.tpl',
    'CLIENT_GENERIC_ONLY': 'AbstractAdapterConverterTest.java.tpl',
    'CLIENT_ONLY': 'AbstractAdapterConverterTest.java.tpl',
    'UNDETERMINED': 'AbstractAdapterConverterTest.java.tpl',
}


def resolve_project_root(cli_root=None):
    """解析项目根目录"""
    root = cli_root or os.environ.get('BEMP_ROOT') or _DEFAULT_ROOT
    root = os.path.normpath(root)
    if not os.path.isdir(root):
        raise FileNotFoundError(f"项目根目录不存在: {root}")
    return root


def get_style(svr, cli, custom_abs, bk=''):
    """根据基类信息推断银行报文风格"""
    if bk == 'hlsecurity':
        return 'CLIENT_GENERIC_ONLY'
    if bk in ('hbbank', 'hxbank', 'sanlbank') and cli == '':
        return 'SERVER_XML_ONLY'
    if bk == 'wsbank' and svr == '' and cli == '':
        return 'UNDETERMINED'
    if bk in ('xintbank', 'snbank', 'pdsbank', 'nmgbank', 'fabbank') and svr == '':
        return 'CLIENT_ONLY'

    s_style = 'GENERIC' if 'Generic' in svr else 'XML'

    if 'Tcp' in cli:
        c_style = 'TCP'
    elif 'Http' in cli:
        c_style = 'HTTP'
    elif 'Ws' in cli or 'Ws' in svr:
        c_style = 'WS'
    elif 'Jms' in cli:
        c_style = 'JMS'
    elif 'Amqp' in cli:
        c_style = 'AMQP'
    elif 'Generic' in cli:
        c_style = 'GENERIC'
    elif cli == '':
        c_style = 'NONE'
    else:
        c_style = 'GENERIC'

    # ESB 检测
    for ca in custom_abs:
        if 'Esb' in ca:
            c_style = 'TCP_ESB'
            break

    # MIXED 检测
    mixed_banks = ('bohbank', 'hybank', 'sxnxbank', 'wfbank', 'huisbank', 'huzbank', 'cangzbank')
    if bk in mixed_banks and c_style == 'GENERIC':
        c_style = 'MIXED'

    return f'SERVER_{s_style}+CLIENT_{c_style}'


def generate_bank_template(info, branch_tag=''):
    """为 IMPLEMENTED 银行生成参考模板内容"""
    bk = info.get('name', info.get('dir', '').replace('ext-', ''))
    name = BANK_NAMES.get(bk, bk)
    style = info.get('style', '')
    conv_count = info.get('converter_count', 0)
    test_count = info.get('test_count', 0)
    custom_abs = info.get('custom_abstracts', [])
    base_svr = info.get('base_server', '')
    base_cli = info.get('base_client', '')
    pkg = info.get('pkg', '')

    branch_note = f'\n> 新增分支: {branch_tag}' if branch_tag else ''

    content = f"""# {name}({bk}) 适配器开发参考模板

> bank-key: `{bk}` | 目录: `ext-{bk}` | 包: `{pkg}`
> 状态: **IMPLEMENTED** | Converter: **{conv_count}** | Test: **{test_count}**
> 风格: **{style}**{branch_note}

---

## 一、基类选择

| 端 | 基类 | 适用场景 |
| --- | --- | --- |
| Server | `{base_svr}` | 所有 Server 端 Converter |
"""
    if base_cli and base_cli != 'NONE':
        content += f"| Client | `{base_cli}` | 所有 Client 端 Converter |\n"
    if custom_abs:
        content += "\n### 自定义抽象基类\n\n"
        for ca in custom_abs:
            content += f"- `{ca}`\n"
    content += f"""
## 二、报文格式

按 style `{style}` 查 bank-index.json style_enum 获取详细报文格式。

## 三、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%
"""
    return content


def main():
    parser = argparse.ArgumentParser(description='BEMP bank-index.json 增量更新')
    parser.add_argument('--root', default=None, help='项目根目录')
    parser.add_argument('--scan', default=None, help='扫描结果路径（默认: banks/_scan.json）')
    parser.add_argument('--branch', default=None, help='目标分支名（如 BEMP5.0V202301.04）')
    args = parser.parse_args()

    root = resolve_project_root(args.root)
    skill_dir = _SKILL_DIR
    idx_path = os.path.join(skill_dir, 'config', 'bank-index.json')
    ref_dir = os.path.join(skill_dir, 'references', 'banks')

    # 加载现有索引
    if not os.path.exists(idx_path):
        logger.error(f"bank-index.json 不存在: {idx_path}")
        sys.exit(1)
    idx = json.load(open(idx_path, 'r', encoding='utf-8'))

    # 加载扫描数据
    scan_path = args.scan or os.path.join(root, 'banks', '_scan.json')
    if not os.path.exists(scan_path):
        logger.error(f"扫描结果不存在: {scan_path}，请先运行 scan_banks.py")
        sys.exit(1)
    scan = json.load(open(scan_path, 'r', encoding='utf-8'))
    scan_bks = {r['bk']: r for r in scan}

    # Step 1: 标记不在磁盘上的银行为 LEGACY
    removed_count = 0
    for bk, info in list(idx['banks'].items()):
        if bk not in scan_bks and info.get('status') in ('IMPLEMENTED', 'EMPTY'):
            info['status'] = 'LEGACY'
            info['note'] = 'removed from current branch; template kept for cross-branch ref'
            removed_count += 1

    # Step 2: 更新/新增银行数据
    updated_count = 0
    new_banks = []
    for bk, s in scan_bks.items():
        style = get_style(s['base_svr'], s['base_cli'], s['custom_abs'], bk)
        status = 'IMPLEMENTED' if s['status'] == 'IMPLEMENTED' else 'EMPTY'
        pkg = s['pkg'].replace('/', '.')
        if not pkg.startswith('com.hundsun.bemp'):
            pkg = f'com.hundsun.bemp.{bk}.adapter.msg'

        if bk in idx['banks']:
            old = idx['banks'][bk]
            if status != old.get('status'):
                old['status'] = status
                old.pop('note', None)
                updated_count += 1
            # 刷新扫描数据（扫描字段名 -> 索引字段名映射）
            field_map = {
                'converter_count': 'conv_count',
                'test_count': 'test_count',
                'style': None,  # 由 get_style 重新计算
                'base_server': 'base_svr',
                'base_client': 'base_cli',
                'custom_abstracts': 'custom_abs',
                'channels': 'channels',
            }
            for idx_key, scan_key in field_map.items():
                if idx_key == 'style':
                    old[idx_key] = style
                elif idx_key == 'base_server':
                    old[idx_key] = s.get('base_svr') or 'AbstractMessageApplyResponseConverter'
                elif idx_key == 'base_client':
                    old[idx_key] = s.get('base_cli') or 'NONE'
                elif idx_key == 'custom_abstracts':
                    old[idx_key] = s.get('custom_abs', [])
                elif scan_key and scan_key in s:
                    old[idx_key] = s[scan_key]
            # 修复 ref：IMPLEMENTED 银行应指向自己的模板
            if old.get('status') == 'IMPLEMENTED':
                old['ref'] = f'references/banks/{bk}.md'
            elif old.get('status') == 'EMPTY':
                old['ref'] = 'references/banks/_empty-bank-skeleton.md'
        else:
            idx['banks'][bk] = {
                'name': BANK_NAMES.get(bk, bk),
                'status': status,
                'dir': f'ext-{bk}',
                'module': f'{bk}-adapter-as',
                'pkg': pkg,
                'style': style,
                'base_server': s.get('base_svr') or 'AbstractMessageApplyResponseConverter',
                'base_client': s.get('base_cli') or 'NONE',
                'custom_abstracts': s.get('custom_abs', []),
                'converter_count': s.get('conv_count', 0),
                'test_count': s.get('test_count', 0),
                'channels': s.get('channels', []),
                'ref': f'references/banks/{bk}.md' if status == 'IMPLEMENTED' else 'references/banks/_empty-bank-skeleton.md'
            }
            updated_count += 1
            new_banks.append(bk)

    # Step 3: 更新 style_enum
    styles = {}
    for bk, info in idx['banks'].items():
        if info.get('status') != 'IMPLEMENTED':
            continue
        st = info['style']
        if st not in styles:
            styles[st] = {
                'server_base': info.get('base_server', ''),
                'client_base': info.get('base_client', ''),
                'representative': bk,
                'test_template': STYLE_TEST_MAP.get(st, 'AbstractAdapterConverterTest.java.tpl')
            }
        else:
            reps = styles[st]['representative']
            if len(reps) < 120:
                styles[st]['representative'] = f'{reps},{bk}'
    idx['style_enum'] = styles

    # Step 4: 更新 meta
    if args.branch:
        idx['_meta']['branch'] = args.branch
    idx['_meta']['updated'] = '2026-06-05'

    # Step 5: 生成缺失模板
    generated = 0
    for bk, info in idx['banks'].items():
        if info.get('status') != 'IMPLEMENTED':
            continue
        fp = os.path.join(ref_dir, f'{bk}.md')
        if os.path.exists(fp):
            continue
        content = generate_bank_template(info, args.branch)
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
        generated += 1

    # 写回索引
    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)

    # 统计报告
    st = {}
    for v in idx['banks'].values():
        s = v.get('status', '?')
        st[s] = st.get(s, 0) + 1

    templates = [f for f in os.listdir(ref_dir) if f.endswith('.md')]
    impl = [k for k, v in idx['banks'].items() if v.get('status') == 'IMPLEMENTED']
    missing = [bk for bk in impl if not os.path.exists(os.path.join(ref_dir, f'{bk}.md'))]

    logger.info(f"=== 更新完成 ===")
    logger.info(f"总计: {len(idx['banks'])} | 状态: {st}")
    logger.info(f"标记 LEGACY: {removed_count} | 更新/新增: {updated_count} | 新银行: {new_banks}")
    logger.info(f"生成模板: {generated} | 磁盘模板: {len(templates)}")
    if missing:
        logger.warning(f"IMPLEMENTED 缺模板: {missing}")
    else:
        logger.info("所有 IMPLEMENTED 银行均有模板")


if __name__ == '__main__':
    main()
