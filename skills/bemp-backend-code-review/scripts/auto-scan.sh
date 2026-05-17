#!/bin/bash
# ========== BEMP 后端代码阻塞级问题自动扫描 ==========
# 银行参数从 config/bank-config.json 读取

CONFIG_FILE=".trae/skills/bemp-backend-code-review/config/bank-config.json"
BANK_CODE=$(jq -r '.currentBank' "$CONFIG_FILE")
BANK_NAME=$(jq -r ".banks.\"$BANK_CODE\".bankName" "$CONFIG_FILE")
SOURCE_DIR=$(jq -r ".banks.\"$BANK_CODE\".sourceDir" "$CONFIG_FILE")
DTO_SRC_DIR=$(jq -r ".banks.\"$BANK_CODE\".dtoSourceDir" "$CONFIG_FILE")
DTO_PREFIX=$(jq -r ".banks.\"$BANK_CODE\".dtoPrefix" "$CONFIG_FILE")

echo "========== BEMP 后端代码预检 (${BANK_NAME}) =========="

echo -e "\n[1/5] 检查 @CustomizedBean..."
grep -rL '@CustomizedBean' "$SOURCE_DIR" --include="*ServiceImpl.java" --include="*AtomImpl.java" | while read f; do
    echo "  [BLOCK] 缺少 @CustomizedBean: $f"
done

echo -e "\n[2/5] 检查 Controller @CustomizedBean..."
grep -rl '@CustomizedBean' "$SOURCE_DIR" --include="*Controller.java" | while read f; do
    echo "  [BLOCK] Controller 不应使用 @CustomizedBean: $f"
done

echo -e "\n[3/5] 检查 @RestController..."
grep -rL '@RestController' "$SOURCE_DIR" --include="*Controller.java" | while read f; do
    echo "  [BLOCK] 缺少 @RestController: $f"
done

echo -e "\n[4/5] 检查 DTO Serializable..."
grep -rl 'public class' "$DTO_SRC_DIR" --include="*Req.java" --include="*Resp.java" --include="*Dto.java" | xargs grep -L 'implements Serializable' 2>/dev/null | while read f; do
    echo "  [WARN] DTO 未实现 Serializable: $f"
done

echo -e "\n[5/5] 检查 DTO 命名前缀..."
grep -rl 'public class' "$DTO_SRC_DIR" --include="*Req.java" --include="*Resp.java" | grep -v "${DTO_PREFIX}" | while read f; do
    echo "  [WARN] DTO 前缀可能不符合 ${DTO_PREFIX}*: $f"
done

echo -e "\n========== 扫描完成 =========="