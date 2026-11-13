#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
py-oracle-runner.py - Python(oracledb) Oracle 执行通道

用途：bemp-db-operator 的补充通道。Oracle MCP 只读；run-oracle-jdbc.ps1 的中文回显
受 Windows 控制台代码页影响易乱码。本脚本以 UTF-8 直接输出，便于诊断与 DML。

用法：
  python py-oracle-runner.py -f <sql文件> [-c] [--schema BEMP_HNNX]
连接参数取 _shared/env-config.json → environmentDefaults.ORACLE_*，可用环境变量覆盖。
"""
import argparse
import json
import os
import re
import sys

import oracledb

DEFAULTS = {
    "ORACLE_HOST": "10.20.42.211",
    "ORACLE_PORT": "1521",
    "ORACLE_SERVICE": "orcl",
    "ORACLE_USERNAME": "bemp_hnnx",
    "ORACLE_PASSWORD": "123456",
    "ORACLE_SCHEMA": "BEMP_HNNX",
}

ENV_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "..", "..", "_shared", "env-config.json")


def load_env():
    """解析链：环境变量 > _shared/env-config.json environmentDefaults > 内置默认值"""
    conf = dict(DEFAULTS)
    try:
        with open(ENV_CONFIG, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for key, val in (data.get("environmentDefaults") or {}).items():
            if isinstance(val, str) and not val.startswith("${ENV:") and key in conf:
                conf[key] = val
    except Exception:
        pass
    for key in list(conf.keys()):
        if os.environ.get(key):
            conf[key] = os.environ[key]
    return conf


def split_sql(text):
    """按分号切分语句，忽略单引号内的分号与注释行"""
    stmts, buf, in_str = [], [], False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        for ch in line:
            if ch == "'":
                in_str = not in_str
            if ch == ";" and not in_str:
                stmt = "".join(buf).strip()
                if stmt:
                    stmts.append(stmt)
                buf = []
            else:
                buf.append(ch)
        buf.append("\n")
    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return stmts


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("-f", "--file", required=True)
    ap.add_argument("-c", "--commit", action="store_true")
    ap.add_argument("--schema", default="")
    ap.add_argument("-o", "--out", default="", help="结果同时写入该文件（UTF-8）")
    args = ap.parse_args()

    # 结果落盘用 UTF-8，规避 Windows 控制台代码页导致的乱码/失真
    sink = None
    if args.out:
        sink = open(args.out, "w", encoding="utf-8")

    def emit(text=""):
        print(text)
        if sink:
            sink.write(text + "\n")

    conf = load_env()
    schema = args.schema or conf["ORACLE_SCHEMA"]
    dsn = "%s:%s/%s" % (conf["ORACLE_HOST"], conf["ORACLE_PORT"], conf["ORACLE_SERVICE"])

    with open(args.file, "r", encoding="utf-8") as fh:
        sql_text = fh.read()

    conn = oracledb.connect(user=conf["ORACLE_USERNAME"], password=conf["ORACLE_PASSWORD"], dsn=dsn)
    cur = conn.cursor()
    cur.execute("ALTER SESSION SET CURRENT_SCHEMA = %s" % schema)
    cur.execute("SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM DUAL")
    emit("[SCHEMA] %s" % cur.fetchone()[0])

    ok = fail = 0
    for stmt in split_sql(sql_text):
        try:
            cur.execute(stmt)
            head = stmt.lstrip()[:70].replace("\n", " ")
            if cur.description:
                cols = [d[0] for d in cur.description]
                emit("\n[ROWS] %s" % head)
                emit(" | ".join(cols))
                n = 0
                for row in cur:
                    emit(" | ".join("" if v is None else str(v) for v in row))
                    n += 1
                    if n >= 300:
                        break
                emit("  total=%d" % n)
            else:
                emit("[DML ] %s -> rowcount=%s" % (head, cur.rowcount))
            ok += 1
        except Exception as exc:  # noqa: BLE001
            fail += 1
            emit("[FAIL] %s" % exc)
            emit("  SQL: %s" % stmt.strip()[:160].replace("\n", " "))

    if args.commit:
        conn.commit()
        emit("[COMMIT] done")
    conn.close()
    emit("DONE success[%d] fail[%d] commit=%s" % (ok, fail, args.commit))
    if sink:
        sink.close()
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
