# 代码搜索模式

## 搜索策略优先级

1. **同银行同功能号** — 最精确的参考
2. **同银行同渠道** — 相同报文格式和基类
3. **同银行同端（server/client）** — 相同方法签名
4. **其他银行同功能号** — 字段映射参考
5. **产品接口定义** — 内部 DTO 字段来源

## 搜索命令

### 按功能号搜索 Converter
```
Grep: {PICE_CODE}MessageConverter
glob: *.java
path: banks/ext-{bank-key}
```

### 按基类搜索同模式 Converter
```
Grep: extends {BaseClassName}
glob: *.java
path: banks/ext-{bank-key}
```

### 按渠道搜索
```
Grep: {channel}  (如 ebank, credit, ecif, core)
glob: *MessageConverter.java
path: banks/ext-{bank-key}/{bank-key}-adapter-as/src/main/java
```

### 搜索产品接口
```
Grep: {PICE_CODE}
glob: *Service.java
path: adapter
```

### 搜索工具类
```
Grep: class {ClassName}
glob: *.java
path: banks/ext-{bank-key}/{bank-key}-adapter-as/src/main/java
```

### 搜索 WSDL 文件
```
Glob: *.wsdl
path: banks/ext-{bank-key}/{bank-key}-adapter-as/src/main/resources
```

### 搜索 ESC 配置
```
Grep: escService
glob: *.properties
path: banks/ext-{bank-key}
```

## 代码探索脚本

使用 `scripts/explore_codebase.py` 自动化搜索：

```bash
python scripts/explore_codebase.py --bank {bank-key} --func {PICE_CODE} --type converter
python scripts/explore_codebase.py --bank {bank-key} --base-class {BaseClassName} --type base
python scripts/explore_codebase.py --bank {bank-key} --channel {channel} --type channel
```
