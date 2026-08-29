# -*- coding: utf-8 -*-
"""BEMP 技能库权威配置加载器（Python 版）。

为什么存在：技能 config JSON 中的 ${ENV:VAR} 是占位符，直接 json.load 得到的是
字面量——这是"技能调用时找不到配置参数"的根因。所有取值必须经本模块解析，
禁止各技能手写解析逻辑（历史分散实现已收敛至此）。

解析链（与 _shared/Resolve-EnvConfig.ps1 行为对齐）：
    环境变量 > _shared/env-config.json 的 environmentDefaults > ${ENV:VAR:default} 内联默认值
解析失败时 strict 模式报错（默认），lenient 模式保留占位符字面量。

用法：
    CLI 整读:  python load_config.py --file ../bemp-xxx/config/config.json
    CLI 取值:  python load_config.py --file ../bemp-xxx/config/config.json --get services.redis.port
    CLI 单键:  python load_config.py --get BANK_CODE          # 直接从 env-config 解析
    import:    from load_config import load_resolved, resolve_value
"""
import json
import os
import re
import sys

SHARED_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_CONFIG_PATH = os.path.join(SHARED_DIR, 'env-config.json')
# 嵌套引用上限：值 A 引用 B、B 引用 C……超过说明配置写环了，硬失败防止无限递归
MAX_NEST_DEPTH = 6

_PLACEHOLDER_RE = re.compile(r'\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}')

_env_defaults_cache = None


def _env_defaults():
    """_shared/env-config.json 的 environmentDefaults，读不到返回空 dict（不抛异常，
    让调用方在 resolve 阶段得到明确的"缺参数"报错而非加载期栈回溯）。"""
    global _env_defaults_cache
    if _env_defaults_cache is None:
        try:
            with open(ENV_CONFIG_PATH, 'r', encoding='utf-8') as f:
                _env_defaults_cache = (json.load(f).get('environmentDefaults') or {})
        except (OSError, json.JSONDecodeError):
            _env_defaults_cache = {}
    return _env_defaults_cache


def resolve_value(value, strict=True, _depth=0):
    """递归解析字符串中的全部 ${ENV:VAR} / ${ENV:VAR:default} 占位符。

    strict=True 时任何占位符解析失败即抛 KeyError（防止字面量流入后续逻辑
    产生 '${ENV:XXX}' 这种难排查的错误值）；False 时保留占位符原文。
    """
    if _depth > MAX_NEST_DEPTH:
        raise ValueError('占位符嵌套解析超过 %d 层，疑似循环引用: %r' % (MAX_NEST_DEPTH, value))
    if not isinstance(value, str) or '${ENV:' not in value:
        return value

    def _sub(m):
        var, inline_default = m.group(1), m.group(2)
        val = os.environ.get(var)
        if val:
            return val
        val = _env_defaults().get(var)
        if val is not None and val != '':
            return str(val)
        if inline_default is not None:
            return inline_default
        if strict:
            raise KeyError(
                '无法解析 ${ENV:%s}：环境变量未设置、_shared/env-config.json '
                'environmentDefaults 无默认值、且无内联默认值。修复：编辑 _shared/env-config.json '
                '或执行 powershell -File %s 查看全量诊断' % (var, os.path.join(SHARED_DIR, 'doctor-config.ps1')))
        return m.group(0)

    resolved = _PLACEHOLDER_RE.sub(_sub, value)
    # 解析结果可能仍含占位符（如 environmentDefaults 的值本身是嵌套占位符），递归到不动点
    if resolved != value and '${ENV:' in resolved:
        return resolve_value(resolved, strict, _depth + 1)
    return resolved


def _resolve_node(node, strict):
    if isinstance(node, str):
        return resolve_value(node, strict)
    if isinstance(node, dict):
        # key 也可能承载占位符（如 banks 的 key 写作 ${ENV:BANK_CODE}），
        # 只解析 value 会导致 banks[active_bank] 取空——W9 加固实证缺陷。
        # `_` 前缀 key 是文档/元字段（_doc/_comment/_envConfigNote），其中的
        # ${ENV:VAR_NAME} 只是示例文本，key 和 value 均不参与解析
        return {
            (k if k.startswith('_') else _resolve_node(k, strict)):
            (v if k.startswith('_') else _resolve_node(v, strict))
            for k, v in node.items()
        }
    if isinstance(node, list):
        return [_resolve_node(i, strict) for i in node]
    return node


def load_resolved(config_path, strict=True):
    """读取技能配置文件并返回占位符全解析后的 dict。"""
    with open(config_path, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    return _resolve_node(raw, strict)


def get_value(config_path, dotted_key, strict=True):
    """取点路径值：--get services.redis.port。路径不存在返回 None 并在 strict 下报错。"""
    data = load_resolved(config_path, strict=False)
    cur = data
    for part in dotted_key.split('.'):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            if strict:
                raise KeyError('配置路径不存在: %s（文件: %s）' % (dotted_key, config_path))
            return None
    return _resolve_node(cur, strict)


def _main(argv):
    config_path, dotted_key, lenient = None, None, False
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--file':
            i += 1
            config_path = argv[i]
        elif a == '--get':
            i += 1
            dotted_key = argv[i]
        elif a in ('--lenient', '--no-strict'):
            lenient = True
        i += 1

    if not config_path:
        # --get 单键不带 --file 时默认从 _shared/env-config.json 取值（银行/端口等全局参数最高频用法）
        config_path = ENV_CONFIG_PATH
    if config_path and not os.path.exists(config_path):
        print('[ERROR] 配置文件不存在: %s' % config_path, file=sys.stderr)
        return 1
    try:
        if dotted_key:
            val = get_value(config_path, dotted_key, strict=not lenient)
            print(json.dumps(val, ensure_ascii=False) if isinstance(val, (dict, list)) else val)
        else:
            print(json.dumps(load_resolved(config_path, strict=not lenient), ensure_ascii=False, indent=2))
        return 0
    except (KeyError, ValueError) as e:
        print('[ERROR] %s' % e, file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(_main(sys.argv[1:]))
