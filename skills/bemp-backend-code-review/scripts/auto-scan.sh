#!/bin/bash
# ========== BEMP 后端代码阻塞级问题自动扫描 v3.1.0 ==========
# 银行参数从 config/bank-config.json 读取，切换银行时修改 currentBank 即可

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/bank-config.json"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

relpath() {
    local full="$1"
    if [[ "$full" == "$PROJECT_ROOT"* ]]; then
        echo "${full#$PROJECT_ROOT/}"
    else
        echo "$full"
    fi
}

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

echo "[1/16] 检查 @CustomizedBean 注解..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *ServiceImpl.java || "$basename_f" == *AtomImpl.java ]]; then
        if ! grep -q '@CustomizedBean' "$f"; then
            echo "  [BLOCK] 缺 @CustomizedBean: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*\.java$")

echo ""
echo "[2/16] 检查 Controller 的 @CustomizedBean..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if grep -q '@CustomizedBean' "$f"; then
            echo "  [BLOCK] Controller 不应 @CustomizedBean: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[3/16] 检查请求映射路径 ($(echo "$URL_PREFIXES" | tr '\n' ',' | sed 's/,$//'))..."
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
            echo "  [BLOCK] 路径缺URL前缀: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[4/16] 检查 @RestController 注解..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if ! grep -q '@RestController' "$f"; then
            echo "  [BLOCK] 缺 @RestController: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[5/16] 检查 DTO Serializable..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Req.java || "$basename_f" == *Resp.java || "$basename_f" == *Dto.java ]]; then
        if grep -q 'public class' "$f" && ! grep -q 'implements Serializable' "$f"; then
            echo "  [WARN] DTO 未实现 Serializable: $(relpath "$f")"
        fi
    fi
done < <(if [[ -n "$INCREMENTAL_FILES" ]]; then echo "$INCREMENTAL_FILES" | tr ' ' '\n'; else find "$DTO_SRC_DIR" -type f -name "*.java" 2>/dev/null; fi)

echo ""
echo "[6/16] 检查 Controller 返回值..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f")
    if [[ "$basename_f" == *Controller.java ]]; then
        if grep -q '@RequestMapping' "$f" && ! grep -qE 'CommonResp|void' "$f"; then
            echo "  [WARN] 返回值非 CommonResp/void: $(relpath "$f")"
        fi
    fi
done < <(scan_files ".*Controller\.java$")

echo ""
echo "[7/16] 检查 DTO 命名前缀 ($DTO_PREFIX)..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    basename_f=$(basename "$f" .java)
    if [[ "$basename_f" == *Req || "$basename_f" == *Resp ]]; then
        if [[ "$basename_f" != ${DTO_PREFIX}* ]]; then
            echo "  [WARN] DTO 前缀不符 ${DTO_PREFIX}*: $(relpath "$f")"
        fi
    fi
done < <(if [[ -n "$INCREMENTAL_FILES" ]]; then echo "$INCREMENTAL_FILES" | tr ' ' '\n'; else find "$DTO_SRC_DIR" -type f -name "*.java" 2>/dev/null; fi)

echo ""
echo "[8/16] 检查 e.printStackTrace()..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE 'e\.printStackTrace\(\)'; then
            echo "  [BLOCK] e.printStackTrace() L${line_num}: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[9/16] 检查 BigDecimal 比较方式..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE 'BigDecimal.*\.equals\(|Decimal.*==|==.*Decimal'; then
            echo "  [WARN] BigDecimal应用compareTo: L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[10/16] 检查 Integer/Long == 比较..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE '(Integer|Long)[[:space:]]+\w+[[:space:]]*=='; then
            echo "  [WARN] Integer/Long应用equals: L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[11/16] 检查时间格式 hh/HH..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE '"hh' && ! echo "$line" | grep -qE '"HH' && echo "$line" | grep -qE 'SimpleDateFormat|DateTimeFormatter|format'; then
            echo "  [WARN] 时间格式可能误用hh(12h): L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[12/16] 检查 SQL 字符串拼接..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE '"\s*\+\s*\w+\s*\+\s*"' && echo "$line" | grep -qEi 'select|insert|update|delete|from|where' && ! echo "$line" | grep -qE '\$\{'; then
            echo "  [BLOCK] SQL拼接 L${line_num}: $(relpath "$f")"
            ISSUE_COUNT=$((ISSUE_COUNT + 1))
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[13/16] 检查硬编码机构号/产品代码..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE 'setBrchNo\(\s*"[0-9]+"|setLegalNo\(\s*"[0-9]+"|setOrgCode\(\s*"[0-9]+"' && ! echo "$line" | grep -qE '硬编码'; then
            echo "  [WARN] 疑似硬编码机构号 L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[14/16] 检查 @Resource 注入(应使用 @Autowired)..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE '@Resource' && ! echo "$line" | grep -qE '@CloudReference'; then
            echo "  [WARN] should use @Autowired not @Resource L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[15/16] 检查 commons-lang StringUtils(应使用 lang3)..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE 'org\.apache\.commons\.lang\.StringUtils' && ! echo "$line" | grep -qE 'lang3'; then
            echo "  [WARN] StringUtils should use lang3 L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "[16/16] 检查 Collectors.toMap 缺少 merge 函数..."
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        if echo "$line" | grep -qE 'Collectors\.toMap\(' && ! echo "$line" | grep -qE 'value1.*value2|merge|\(v1'; then
            echo "  [WARN] toMap missing merge function L${line_num}: $(relpath "$f")"
        fi
    done < <(tr -d '\r' < "$f")
done < <(scan_files ".*\.java$")

echo ""
echo "========== 扫描完成 ($BANK_NAME) =========="
if [[ $ISSUE_COUNT -eq 0 ]]; then
    echo "未发现阻塞级问题，可以继续人工审查。"
else
    echo "发现 $ISSUE_COUNT 个阻塞级问题，请修复后再提交。"
    exit 1
fi
