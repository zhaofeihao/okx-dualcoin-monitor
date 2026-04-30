# OKX 双币赢 API 文档摘录

来源：https://www.okx.com/docs-v5/zh/#financial-product-dual-investment
抓取时间：2026-04-30 10:15:46 UTC

说明：本文件仅摘录 OKX API v5 中文文档中的“金融产品 / 双币赢”模块，便于后续本地开发查阅。字段和示例保持原文含义，格式转为 Markdown。

## 接口索引
- GET / 获取币对
- GET / 获取产品信息
- POST / 获取报价
- POST / 下单
- POST / 获取赎回报价
- POST / 赎回
- GET / 获取订单状态
- GET / 获取历史订单

---


# 双币赢

## GET / 获取币对

获取双币赢币对

### 限速：1次/s

### 限速规则：User ID

### 权限：读取

### HTTP请求

`GET /api/v5/finance/sfp/dcd/currency-pair`

> 请求示例

```bash
GET /api/v5/finance/sfp/dcd/currency-pair
```

### 请求参数

无

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "baseCcy": "BTC",
            "quoteCcy": "USDT",
            "optType": "C",
            "uly": "BTC-USD"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| baseCcy | String | 基础币种 |
| quoteCcy | String | 报价币种 |
| optType | String | 期权类型`C`：看涨`P`：看跌 |
| uly | String | 标的 |

## GET / 获取产品信息

获取双币赢产品列表

### 限速：1次/s

### 限速规则：User ID

### 权限：读取

### HTTP请求

`GET /api/v5/finance/sfp/dcd/products`

> 请求示例

```bash
GET /api/v5/finance/sfp/dcd/products?baseCcy=BTC&quoteCcy=USDT&optType=C
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| baseCcy | String | 是 | 基础币种 |
| quoteCcy | String | 是 | 报价币种 |
| optType | String | 是 | 期权类型`C`：看涨`P`：看跌 |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "absYield": "0.00232413",
            "annualizedYield": "0.0541",
            "baseCcy": "BTC",
            "quoteCcy": "USDT",
            "expTime": "1774598400000",
            "interestAccrualTime": "1773244800000",
            "listTime": "1743150759000",
            "maxSize": "6000000",
            "minSize": "10",
            "notionalCcy": "USDT",
            "optType": "P",
            "productId": "BTC-USDT-260327-54500-P",
            "quoteTime": "1773243808703",
            "redeemEndTime": "1774594800000",
            "redeemStartTime": "1773244800000",
            "stepSz": "1",
            "tradeEndTime": "1774584000000",
            "strike": "54500",
            "uly": "BTC-USD"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| absYield | String | 绝对收益率 |
| annualizedYield | String | 年化收益率 |
| baseCcy | String | 基础币种 |
| quoteCcy | String | 报价币种 |
| notionalCcy | String | 投资币种。若 `C`，则为 baseCcy；若 `P`，则为 quoteCcy。 |
| expTime | String | 到期时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| interestAccrualTime | String | 利息开始计算时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| listTime | String | 产品上架时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| minSize | String | 最小交易规模（以投资币种计） |
| maxSize | String | 最大交易规模（以投资币种计） |
| optType | String | 期权类型`C`：看涨`P`：看跌 |
| productId | String | 产品ID |
| quoteTime | String | 产品报价时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| redeemStartTime | String | 最早可申请提前赎回的时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| redeemEndTime | String | 最晚可申请提前赎回的时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| stepSz | String | 交易步长（以投资币种计） |
| tradeEndTime | String | 交易截止时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| uly | String | 标的 |
| strike | String | 行权价 |

## POST / 获取报价

为双币赢产品请求实时报价。报价有有效期，须在到期前使用。

### 限速：10次/60s

### 限速规则：User ID

### 权限：交易

### HTTP请求

`POST /api/v5/finance/sfp/dcd/quote`

> 请求示例

```bash
POST /api/v5/finance/sfp/dcd/quote
body
{
    "productId": "BTC-USDT-260327-77000-C",
    "notionalSz": "1.5",
    "notionalCcy": "BTC"
}
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| productId | String | 是 | 产品ID |
| notionalSz | String | 是 | 投资数量 |
| notionalCcy | String | 是 | 投资币种 |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "absYield": "0.00135182",
            "annualizedYield": "69.65",
            "interestAccrualTime": "1773241200000",
            "notionalSz": "0.001",
            "notionalCcy": "BTC",
            "productId": "BTC-USDT-260312-72000-C",
            "quoteId": "qtbcDCD-QUOTE17732395560537636",
            "validUntil": "1774584000000",
            "idxPx": "69000"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| absYield | String | 绝对收益率 |
| annualizedYield | String | 年化收益率 |
| interestAccrualTime | String | 利息开始计算时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| notionalSz | String | 投资数量 |
| notionalCcy | String | 投资币种 |
| productId | String | 产品ID |
| quoteId | String | 报价ID |
| validUntil | String | 报价有效期，Unix时间戳的毫秒数格式，如 `1597026383085` |
| idxPx | String | 指数价格 |

## POST / 下单

使用有效报价下单双币赢。

### 限速：2次/60s

### 限速规则：User ID

### 权限：交易

### HTTP请求

`POST /api/v5/finance/sfp/dcd/trade`

> 请求示例

```bash
POST /api/v5/finance/sfp/dcd/trade
body
{
    "quoteId": "quoterbpDCD-QUOTE17732116652401234"
}
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| quoteId | String | 是 | 报价ID |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "quoteId": "quoterbpDCD-QUOTE17732116652401234",
            "ordId": "987654321",
            "state": "live"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| quoteId | String | 报价ID |
| ordId | String | 订单ID |
| state | String | 订单状态`initial`：系统已接收请求，待处理`pending_book`：流动性提供商已接收请求，待处理`live`：交易已生效`rejected`：交易已拒绝 |

## POST / 获取赎回报价

为生效中的双币赢订单申请提前赎回报价。这是两步赎回流程的第一步，之后需调用 POST / 赎回 确认。

### 限速：10次/60s

### 限速规则：User ID

### 权限：交易

### HTTP请求

`POST /api/v5/finance/sfp/dcd/redeem-quote`

> 请求示例

```bash
POST /api/v5/finance/sfp/dcd/redeem-quote
body
{
    "ordId": "987654321"
}
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| ordId | String | 是 | 订单ID |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "ordId": "987654321",
            "quoteId": "quoterbcDCD-REDEEM17732116652401234",
            "redeemCcy": "BTC",
            "redeemSz": "1.4856",
            "termRate": "-0.50",
            "validUntil": "1774598400000"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| ordId | String | 订单ID |
| quoteId | String | 报价ID |
| redeemSz | String | 赎回数量 |
| redeemCcy | String | 赎回币种 |
| termRate | String | 期限利率 |
| validUntil | String | 赎回报价有效期，Unix时间戳的毫秒数格式，如 `1597026383085` |

## POST / 赎回

使用有效的赎回报价确认提前赎回。这是两步赎回流程的第二步。

### 限速：2次/60s

### 限速规则：User ID

### 权限：交易

### HTTP请求

`POST /api/v5/finance/sfp/dcd/redeem`

> 请求示例

```bash
POST /api/v5/finance/sfp/dcd/redeem
body
{
    "ordId": "987654321",
    "quoteId": "quoterbcDCD-REDEEM17732116652401234"
}
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| ordId | String | 是 | 订单ID |
| quoteId | String | 是 | 报价ID |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "ordId": "987654321",
            "state": "pending_redeem_booking"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| ordId | String | 订单ID |
| state | String | 订单状态`pending_redeem_booking`：赎回请求已接收，等待流动性提供商确认`pending_redeem`：流动性提供商已确认，等待资金划转`redeeming`：赎回处理中`redeemed`：赎回完成 |

## GET / 获取订单状态

返回双币赢订单的当前状态。

### 限速：3次/s

### 限速规则：User ID

### 权限：读取

### HTTP请求

`GET /api/v5/finance/sfp/dcd/order-status`

> 请求示例

```bash
GET /api/v5/finance/sfp/dcd/order-status?ordId=987654321
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| ordId | String | 是 | 订单ID |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "ordId": "987654321",
            "state": "live"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| ordId | String | 订单ID |
| state | String | 订单状态`initial``live``pending_settle``settled``pending_redeem``redeemed``rejected` |

## GET / 获取历史订单

返回双币赢历史订单列表

### 限速：1次/s

### 限速规则：User ID

### 权限：读取

### HTTP请求

`GET /api/v5/finance/sfp/dcd/order-history`

> 请求示例

```bash
GET /api/v5/finance/sfp/dcd/order-history
```

### 请求参数

| 参数名 | 类型 | 是否必须 | 描述 |
| --- | --- | --- | --- |
| ordId | String | 否 | 订单ID。传入时直接返回该订单（忽略其他筛选条件） |
| productId | String | 否 | 产品ID，如 `BTC-USDT-260327-77000-C` |
| uly | String | 否 | 标的指数，如 `BTC-USD` |
| state | String | 否 | 订单状态筛选`initial``live``pending_settle``settled``pending_redeem``redeemed``rejected` |
| beginId | String | 否 | 返回比该订单ID更新的记录 |
| endId | String | 否 | 返回比该订单ID更早的记录 |
| begin | String | 否 | 开始时间戳筛选，Unix时间戳的毫秒数格式，如 `1597026383085` |
| end | String | 否 | 结束时间戳筛选，Unix时间戳的毫秒数格式，如 `1597026383085` |
| limit | String | 否 | 每次请求返回的结果数量，最大100 |

> 返回结果

```json
{
    "code": "0",
    "msg": "",
    "data": [
        {
            "ordId": "987654321",
            "quoteId": "quoterbpDCD-QUOTE17732116652401234",
            "state": "settled",
            "productId": "BTC-USDT-260327-77000-C",
            "baseCcy": "BTC",
            "quoteCcy": "USDT",
            "uly": "BTC-USD",
            "strike": "77000",
            "notionalSz": "1.5",
            "notionalCcy": "BTC",
            "absYield": "0.00806038",
            "annualizedYield": "0.1834",
            "yieldSz": "0.01209057",
            "yieldCcy": "BTC",
            "settleSz": "1.51209057",
            "settleCcy": "BTC",
            "settlePx": "76500",
            "settleTime": "1774598400000",
            "expTime": "1774598400000",
            "redeemStartTime" : "1774598400000",
            "redeemEndime": "1774598400000",
            "cTime": "1773212400000",
            "uTime": "1773212400000"
        }
    ]
}
```

### 返回参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| ordId | String | 订单ID |
| quoteId | String | 报价ID |
| state | String | 订单状态`initial``live``pending_settle``settled``pending_redeem``redeemed``rejected` |
| productId | String | 产品ID，如 `BTC-USDT-260327-77000-C` |
| baseCcy | String | 基础币种，如 `BTC` |
| quoteCcy | String | 计价币种，如 `USDT` |
| uly | String | 标的指数，如 `BTC-USD` |
| strike | String | 行权价 |
| notionalSz | String | 投资数量 |
| notionalCcy | String | 投资币种 |
| absYield | String | 绝对收益率 |
| annualizedYield | String | 年化收益率 |
| yieldSz | String | 收益金额 |
| yieldCcy | String | 收益币种 |
| settleSz | String | 结算金额（未结算时为""） |
| settleCcy | String | 结算币种（未结算时为""） |
| settlePx | String | 结算价格（未结算时为""） |
| expTime | String | 产品到期时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| settleTime | String | 实际结算时间，Unix时间戳的毫秒数格式，如 `1597026383085`（未结算时为""） |
| redeemStartTime | String | 最早可申请提前赎回的时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| redeemEndTime | String | 最晚可申请提前赎回的时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| cTime | String | 订单创建时间，Unix时间戳的毫秒数格式，如 `1597026383085` |
| uTime | String | 最后更新时间，Unix时间戳的毫秒数格式，如 `1597026383085` |

节点 

节点API为节点用户提供灵活的直客查询功能，输入您直客的UID即可获得其相关信息，赋能您的节点业务增长和直客日常管理。
如需更多节点相关功能，或数据支持，请联系您的商务，我们会通过您的商务与您取得联系，提供更加完善的API支持。
