# 武汉农商银行（whnsbank）

> status: EMPTY | dir: ext-whnsbank | module: whnsbank-adapter-as | pkg: com.hundsun.bemp.whnsbank.adapter.msg
> Converter: 0 | Test: 0 | 报文风格: 待定（建议参考已实现银行的 JSON 透传 + ESC 协议模式）
> 重要更正: 历史文档误标为「已实现 ~130 个 Converter」，实际无 adapter-as 源码

开发指引见 [_empty-bank-skeleton.md](./_empty-bank-skeleton.md)

## 与河南农商（hnnxbank）的关系
hnnxbank 在 workspace 中不存在目录，bank-config.json 中仅有占位配置。如需支持真正的河南农商，按 [legacy-banks.md](legacy-banks.md) 第三节创建新银行目录。
