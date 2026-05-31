#!/usr/bin/env python3
"""
BEMP testcase-generator common module
Provides ${ENV:VAR_NAME} placeholder resolution for config files
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

_ENV_CONFIG_PATH = os.path.normpath(os.path.join(
    SCRIPT_DIR, '..', '..', '_shared', 'env-config.json'))


def _load_env_defaults():
    if os.path.exists(_ENV_CONFIG_PATH):
        try:
            with open(_ENV_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f).get('environmentDefaults', {})
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def resolve_env_placeholder(value, defaults=None):
    if not isinstance(value, str) or not value:
        return value
    if defaults is None:
        defaults = _load_env_defaults()
    pattern = r'\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)\}'
    def replacer(match):
        var_name = match.group(1)
        env_val = os.environ.get(var_name, '')
        if not env_val:
            env_val = str(defaults.get(var_name, ''))
        return env_val
    return re.sub(pattern, replacer, value)


def resolve_config_placeholders(config, defaults=None):
    if isinstance(config, dict):
        return {k: resolve_config_placeholders(v, defaults) for k, v in config.items()}
    elif isinstance(config, list):
        return [resolve_config_placeholders(item, defaults) for item in config]
    elif isinstance(config, str):
        return resolve_env_placeholder(config, defaults)
    return config
