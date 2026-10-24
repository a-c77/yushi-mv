# 《于是》MV — 渲染说明（GitHub Codespaces）

画面全部由代码逐帧绘制：底板是一次性画好的油画底（`scenes/plates.js`），
**所有会动的东西每帧重画**（`scenes/figure.js` 人物骨架 + `scenes/anim.js` 雨/水滴/星/涟漪/人群/裂缝/转场），
字幕烧在画面上（`#sub`），音轨用你给的原曲，不重配。

```
mv-yushi/
  index.html         页面：canvas + 字幕层
  main.js            暴露 window.render(t)
  film.js            时间线：8 个镜头、灰→彩的刮刀扫、歌词时间轴、knife wipe 转场
  scenes/plates.js   5 张油画底板（雨窗夜/黎明、空房间、广场、双镜）
  scenes/figure.js   人物：骨架 + 每帧重画的刀痕（走、坐、抬手、呼吸）
  scenes/anim.js     雨、顺玻璃下滑的水滴、星、水洼涟漪、人群、裂缝、刮刀转场
  engine/            库里搬来的刮刀渲染器（WebGL2，未修改）
  cues.json / 于是.srt  歌词字幕
  build.sh           一条命令出片
```

## 一、Codespaces 里第一次跑（Ubuntu）

```bash
# 1. 系统依赖（ffmpeg + 中文字体，字幕和编码都要）
sudo apt-get update
sudo apt-get install -y ffmpeg fonts-noto-cjk

# 2. 拿渲染库：克隆在仓库里面，和 mv-yushi 同级（../mv-yushi 才指得到）
cd /workspaces/<你的仓库名>
git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git
cd lemo-opuscar
sh plugin/skills/lemo-opuscar/scripts/setup.sh deps      # node 包 + headless chromium + python venv
```

> Codespaces 没有 GPU，Chromium 会走 SwiftShader（纯 CPU）。能跑，但慢：
> 5590 帧在 2 核上大约 15–25 分钟，4 核更快。`--workers` 别超过核数。

## 二、先看一帧（10 秒，确认环境没问题）

```bash
cd /workspaces/<你的仓库名>/lemo-opuscar
node core/render/still.mjs ../mv-yushi 30 --out ../mv-yushi/stills
# → mv-yushi/stills/t_30.jpg  （第 30 秒：他坐在床边，字幕在下方）
node core/render/still.mjs ../mv-yushi 95 120 --out ../mv-yushi/stills   # 彩色广场 / 双镜
```

如果在 Codespaces 里想直接看画面，起个静态服务并转发端口：

```bash
cd /workspaces/<你的仓库名>/lemo-opuscar
python3 -m http.server 8000           # 端口面板里把 8000 设为 Public，然后打开
# http://localhost:8000/@film/index.html?t=30   ← 拖动 t 看任意时刻
```

（`still.mjs` 自带服务器，不需要上面这一步也能出图。）

## 三、出整片

```bash
cd /workspaces/<你的仓库名>/lemo-opuscar
sh ../mv-yushi/build.sh
```

`build.sh` 依次做：5588 帧 → `out/video.mp4`；原曲转 wav；`mux.sh` 两次 loudnorm 到 −14 LUFS 并加颗粒 → `于是-mv.mp4`；导 `.srt`。

想只渲一段验证（比如副歌的上色）：

```bash
# 只渲 70–112 秒（副歌 + 上色），成片时长会是 42 秒
node core/render/video.mjs ../mv-yushi --fps 24 --workers 2 \
  --q 'from=70&to=112' --out ../mv-yushi/out/clip.mp4
```

`from` / `to` 由页面自己处理（`main.js` 里把 t 偏移过去），所以出来的片段可以直接配原曲同一段来对拍。

## 四、这一版动在哪里（对照看就知道不是静帧）

| 时间 | 动的东西 |
|---|---|
| 0–14.5 | 整幅画被刀一笔笔画出来；雨在下；**水滴顺着玻璃往下爬**，拖出湿痕 |
| 14.5–41.4 | 他站在窗边（会挪重心、抬杯喝一口）→ **走到床边**（完整走路循环，手臂反向摆）→ **坐下**（连续插值，不跳帧）→ 呼吸起伏；光里有浮尘在飘 |
| 41.4–70.6 | 雨变小；**玻璃上的水滴停住、变成星**，星在闪、在缓慢上浮 |
| 70.6–112.5 | 广场上 **5 个人各走各的**（速度、远近、伞色都不同）；**她的红伞在 76.2 s 撑开**（伞面从收拢到张开）；地面 **水洼涟漪**一圈圈散；78.4 s 起 **刮刀把整幅画从她脚下刷成彩色** |
| 112.5–152.5 | **裂缝从上往下蔓延**（逐帧生长）；玻璃上有一道反光缓慢扫过；碎片在轻微浮动 |
| 152.5–204 | 人群继续走；她站着不动、只是轻微晃；镜头持续后退 |
| 204–214 | 裂缝已定，只有反光在走 |
| 214–232.8 | 夜→黎明（整幅重画一遍）；雨停；**杯口冒热气**；最后三滴水落完 |
| 每个镜头交界 | 0.42 秒的 **knife wipe**：用刀痕把上一个画面刮掉 |

## 五、想改什么就改这两处

- **节奏/时长/歌词**：`film.js` 顶部 `SONG`、`T`、`LYR` 三个常量。
- **动作**：`scenes/figure.js` 里 `walkPose()`（走路）、`SIT` / `STAND`（坐/站姿势）；
  `film.js` 的 `shotRoom()` 里 19.6→26.4 s 是走过去、26.4 s 起是坐下、32.6 s 抬杯。
- **雨多大、水滴多快**：`scenes/anim.js` 的 `rain()` / `drips()` 参数（`n`、`speed`、`alpha`）。
