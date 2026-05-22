#!/bin/bash
# ========== BEMP 后端代码阻塞级问题自动扫描 ==========
# 银行参数从 config/bank-config.json 读取，切换银行时修改 currentBank 即可

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/bank-config.json"

json_val() {
    local key="$1"
    python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(d.get('$key',''))" "$CONFIG_FILE" 2>/dev/null
}

if command -v jq &>/dev/null; then
    BANK_CODE=$(jq -r '.currentBank' "$CONFIG_FILE")
    BANK_NAME=$(jq -r ".banks.\"$BANK_CODE\".bankName" "$CONFIG_FILE")
    SOURCE_DIR=$(jq -r ".banks.\"$BANK_CODE\".sourceDir" "$CONFIG_FILE")
    DTO_SRC_DIR=$(jq -r ".banks.\"$BANK_CODE\".dtoSourceDir" "$CONFIG_FILE")
    DTO_PREFIX=$(jq -r ".banks.\"$BANK_CODE\".dtoPrefix" "$CONFIG_FILE")
    URL_PREFIXES=$(jq -r ".banks.\"$BANK_CODE\".urlPrefixes[]" "$CONFIG_FILE")
else
    BANK_CODE=$(json_val 'currentBank')
    BANK_NAME=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(d['banks'].get(sys.argv[2],{}).get('bankName',''))" "$CONFIG_FILE" "$BANK_CODE" 2>/dev/null)
    SOURCE_DIR=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(d['banks'].get(sys.argv[2],{}).get('sourceDir',''))" "$CONFIG_FILE" "$BANK_CODE" 2>/dev/null)
    DTO_SRC_DIR=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(d['banks'].get(sys.argv[2],{}).get('dtoSourceDir',''))" "$CONFIG_FILE" "$BANK_CODE" 2>/dev/null)
    DTO_PREFIX=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(d['banks'].get(sys.argv[2],{}).get('dtoPrefix',''))" "$CONFIG_FILE" "$BANK_CODE" 2>/dev/null)
    URL_PREFIXES=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print('\n'.join(d['banks'].get(sys.argv[2],{}).get('urlPrefixes',[])))" "$CONFIG_FILE" "$BANK_CODE" 2>/dev/null)
fi

ISSUE_COUNT=0
INCREMENTAL_FILES=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --incremental)
            shift
            INCREMENTAL_FILES="$1"
            ;;
        *)
            if [[ -f "$1" ]]; then
                INCREMENTAL_FILES="$INCREMENTAL_FILES $1"
            fi
            ;;
    esac
    shift
done

scan_files() {
    local pattern="$1"
    if [[ -n "$INCREMENTAL_FILES" ]]; then
        echo "$INCREMENTAL_FILES" | tr ' ' '\n' | grep -E "$pattern"
    else
        find "$SOURCE_DIR" -type f -name "$pattern"
    fi
}

echo "========== BEMP 后端代码预检 ($BANK_NAME) =========="
echo "源码目录: $SOURCE_DIR"
[[ -n "$INCREMENTAL_FILES" ]] && echo "增量模式: $(echo "$INCREMENTAL_FILES" | wc -w | tr -d ' ') 个文件"
echo ""

echo "[1/7] 检查 @CustomizedBean 注解..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *ServiceImpl.java || "$basename_f" == *AtomImpl.java ]]; then
        if ! grep -q '@CustomizedBean' "$f"; then
            echo "  [BLOCK] 缺少 @CustomizedBean: $f"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*\.java$")

echo ""
echo "[2/7] 检查 Controller 的 @CustomizedBean..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if grep -q '@CustomizedBean' "$f"; then
            echo "  [BLOCK] Controller 不应使用 @CustomizedBean: $f"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[3/7] 检查请求映射路径 ($(echo "$URL_PREFIXES" | tr '\n' ',' | sed 's/,$//'))..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    if grep -q '@RequestMapping' "$f"; then
        has_valid_prefix=false
        while IFS= read -r prefix; do
            [[ -z "$prefix" ]] && continue
            if grep -qF "$prefix" "$f"; then
                has_valid_prefix=true
                break
            fi
        done <<< "$URL_PREFIXES"
        if [[ "$has_valid_prefix" == "false" ]]; then
            echo "  [BLOCK] 路径不以配置的URL前缀开头: $f"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[4/7] 检查 @RestController 注解..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if ! grep -q '@RestController' "$f"; then
            echo "  [BLOCK] 缺少 @RestController: $f"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[5/7] 检查 DTO Serializable..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Req.java || "$basename_f" == *Resp.java || "$basename_f" == *Dto.java ]]; then
        if grep -q 'public class' "$f" && ! grep -q 'implements Serializable' "$f"; then
            echo "  [WARN] DTO 未实现 Serializable: $f"
        fi
    fi
done < <(if [[ -n "$INCREMENTAL_FILES" ]]; then echo "$INCREMENTAL_FILES" | tr ' ' '\n'; else find "$DTO_SRC_DIR" -type f -name "*.java" 2>/dev/null; fi)

echo ""
echo "[6/7] 检查 Controller 返回值..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if grep -q '@RequestMapping' "$f" && ! grep -qE 'CommonResp|void' "$f"; then
            echo "  [WARN] 返回值可能不是 CommonResp/void: $f"
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[7/7] 检查 DTO 命名前缀 ($DTO_PREFIX)..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f" .java)
    if [[ "$basename_f" == *Req || "$basename_f" == *Resp ]]; then
        if [[ "$basename_f" != ${DTO_PREFIX}* ]]; then
            echo "  [WARN] DTO 前缀不符合 ${DTO_PREFIX}*: $f"
        fi
    fi
done < <(if [[ -n "$INCREMENTAL_FILES" ]]; then echo "$INCREMENTAL_FILES" | tr ' ' '\n'; else find "$DTO_SRC_DIR" -type f -name "*.java" 2>/dev/null; fi)

echo ""
echo "========== 扫描完成 ($BANK_NAME) =========="
if [[ $ISSUE_COUNT -eq 0 ]]; then
    echo "未发现阻塞级问题，可以继续人工审查。"
else
    echo "发现 $ISSUE_COUNT 个阻塞级问题，请修复后再提交。"
    exit 1
fi
