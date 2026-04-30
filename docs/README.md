我想做一个这样的需求：
我本质上愿意在某个价位接盘ETH，由于最近也是横盘震荡行情，想设计一个收益监控程序，用于：
1.记录每15min的每个价位的收益率曲线（入库存储）
2.监测突变的收益率变化
4.达到某个阈值可以进行tg提醒


核心表可以这样存：

timestamp
exchange = OKX
asset = ETH
quote = USDT
direction = buy_low
term_days
strike_price
spot_price
apr
apy / estimated_return
distance_to_spot_pct
min_amount
max_amount
raw_payload

要监控的本质是：同一到期日、同一 strike 的 APR 曲线是否突然变贵。OKX 也把双币赢定义为按目标价和期限买/卖币的结构化产品，且不保本；若触发目标价，会按目标价买入或卖出并获得收益。 ￼

额外补充的功能

1. 不只记录 APR，还记录“价外距离”

比如 ETH 现价 3000：

strike = 2800
distance = (3000 - 2800) / 3000 = 6.67%

因为 2800 的 80% APR 和 2950 的 80% APR 完全不是一个风险。

你真正要排序的不是 APR，而是：

APR / 距离风险

或者更简单：

相同到期日下，筛选你愿意接盘的价格区间，再看 APR 排名

⸻

2. 加一个“同档位突变检测”

建议三层报警：

单点突变：
当前 APR - 上一期 APR >= X%
相对突变：
当前 APR / 过去24小时均值 >= 1.5
排名突变：
某个 strike 从普通档位突然进入 top 3

最实用的是：

APR_zscore = (当前APR - 过去N期均值) / 标准差

比如：

zscore >= 2.5 触发提醒

⸻

3. 加“可成交容量”监控（如果API支持）

这个非常关键。

有些高收益档位可能：

* 最小金额很高
* 剩余额度很小
* 刷出来很快消失
* 实际下单时 quote 已变

所以建议记录：

min_amount
max_amount
available_quota
quote_expire_time

如果 OKX 返回报价有效期，也要存下来。

⸻

4. 加“目标接盘价策略”
程序应该支持配置：

{
  asset: "ETH",
  quote: "USDT",
  direction: "buy_low",
  acceptableStrikes: [2600, 2700, 2800],
  maxDistanceFromSpotPct: 12,
  minApr: 35,
  minTermDays: 1,
  maxTermDays: 14,
  alertZScore: 2.5
}

不要监控所有价格都提醒，否则噪音会很大。

⸻

推荐报警文案

TG 推送可以这样设计：

🟢 OKX 双币赢机会
ETH/USDT Buy Low
到期：2026-05-07
目标价：2800 USDT
现价：3012 USDT
价外距离：7.04%
APR：86.5%
15min变化：+18.2%
24h均值：52.1%
Z-score：3.1
建议：
这是你可接受接盘区间内的异常高收益档位，可手动检查是否还有额度。

⸻

数据库建议

SQLite

核心两张表：

dual_investment_quotes
dual_investment_alerts

quotes 存每 15min 快照，alerts 存触发记录，避免重复提醒。

⸻

额外进阶建议

可以加一个 “等价卖 Put 收益对比”（如果支持）：

拿 OKX 双币赢 APR 和 Deribit/OKX 期权同 strike、同到期日的 Put premium 做对比。

如果：

双币赢隐含收益 < 直接卖 Put 收益 - 手续费 - 滑点

那双币赢就不划算。

⸻

最终行动方案

先做 MVP：

1. 每 15 分钟拉 OKX 双币赢 ETH/USDT Buy Low 产品列表
2. 入库：时间、期限、目标价、APR、现价、价外距离、额度
3. 对每个 term + strike 维护 24h 均值和 z-score
4. 满足 APR > 阈值 && zscore > 2.5 && strike 在你愿意接盘区间 才 TG 提醒
5. 后续再接入期权市场，比较双币赢和卖 Put 哪个更划算