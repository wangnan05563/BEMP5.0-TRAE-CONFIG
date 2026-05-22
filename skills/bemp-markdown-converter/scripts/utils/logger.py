#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一日志工具
替代 print，支持级别控制和结构化输出
"""

import logging
import sys

_LOGGERS = {}


def get_logger(name: str = "bemp-md", level: str = "INFO") -> logging.Logger:
    if name in _LOGGERS:
        logger = _LOGGERS[name]
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        return logger

    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%H:%M:%S',
        ))
        logger.addHandler(handler)

    _LOGGERS[name] = logger
    return logger
