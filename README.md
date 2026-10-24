# 《于是》— 音乐视频（油画厚涂 · 全部由代码绘制）

把郑润泽《于是》做成一支 3 分 52 秒的音乐视频：**没有一帧是拍摄或生成的素材**，画面由 WebGL2 的
调色刀笔触逐帧重画，人物是骨架驱动的刀痕，字幕烧在画面里，音轨用原曲。

风格来自 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的 **油画厚涂 Impasto Oil Painting**，
本仓库只使用了它的渲染引擎和风格规则，没有使用任何样片的画面、构图或故事。

| 早期 look test（静帧） | 现在（逐帧动画） |
|---|---|
| [`docs/storyboard.html`](docs/storyboard.html) | 见本文「这一版动在哪里」 |

---

## 目录

```
.
├── mv-yushi/                影片工程（渲染入口）
│   ├── index.html           页面：canvas + 烧录字幕层
│   ├── main.js              window.render(t)；支持 ?from=&to= 渲片段
│   ├── film.js              时间线：8 个镜头、灰→彩的刮刀扫、歌词、knife wipe
│   ├── scenes/
│   │   ├── plates.js        5 张油画底板（雨窗夜/黎明、空房间、广场、双镜）
│   │   ├── figure.js        人物：骨架 + 每帧重画的刀痕（走 / 坐 / 抬手 / 呼吸）
│   │   ├── anim.js          雨、顺玻璃下滑的水滴、星、涟漪、人群、裂缝、转场
│   │   └── common.js        缓动、插值、几何小工具
│   ├── engine/              从库里搬来的调色刀渲染器（WebGL2，未修改）
│   ├── cues.json / 于是.srt 歌词字幕
│   ├── TREATMENT.md         导演方案：结构、镜头表、节拍表、声音设计
│   ├── CREDITS              第三方素材与授权
│   ├── build.sh             一条命令出片
│   └── README-Codespaces.md Codespaces 渲染步骤
├── mv-assets/               原始素材（mp3 + lrc）
├── docs/                    分镜故事板 + 风格方案（HTML）
└── .devcontainer/           Codespaces 环境（ffmpeg、中文字体、克隆渲染库、装依赖）
```

`lemo-opuscar/`（渲染库）由 `.devcontainer` 自动克隆，**不进本仓库**；渲染产物（`out/`、`stills/`、`*.mp4`、`*.wav`）也在 `.gitignore` 里。

---

## 一、渲染（GitHub Codespaces）

```bash
sudo apt-get install -y ffmpeg fonts-noto-cjk

# 注意：渲染库要克隆在仓库里面（和 mv-yushi 同级），下面的 ../mv-yushi 才指得到
cd /workspaces/<你的仓库名>
git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git
cd lemo-opuscar && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps

# 先出一帧验证环境（约 10 秒）
node core/render/still.mjs ../mv-yushi 30 --out ../mv-yushi/stills

# 只渲副歌段（42 秒，先看动画对不对）
node core/render/video.mjs ../mv-yushi --fps 24 --workers 2 \
  --q 'from=70&to=112' --out ../mv-yushi/out/clip.mp4

# 全片：5588 帧 → 画面 → 配原曲 → −14 LUFS → 字幕
sh ../mv-yushi/build.sh
```

Codespaces 没有 GPU，Chromium 走 SwiftShader 纯 CPU：`--workers` 不要超过核数，4 核大约十几分钟。
详细参数、常见问题见 [`mv-yushi/README-Codespaces.md`](mv-yushi/README-Codespaces.md)。

本地（macOS / Linux，装了 Node 20+、ffmpeg、Python 3.11+）同理，把库 clone 到 `mv-yushi` 隔壁即可。

---

## 二、这一版动在哪里

| 时间 | 画面 |
|---|---|
| 0–14.5 s | 整幅画被刀一笔笔画出来；雨在下；**水滴顺着玻璃往下爬**，拖出湿痕 |
| 14.5–41.4 s | 他站在窗边（会挪重心、抬杯喝一口）→ **走到床边**（完整走路循环）→ **坐下**（连续插值）→ 呼吸起伏；光里浮尘在飘 |
| 41.4–70.6 s | 雨变小；**玻璃上的水滴停住、变成星**，星在闪、在缓缓上浮 |
| 70.6–112.5 s | 广场上 **5 个人各走各的**；她 **76.2 s 把红伞撑开**（伞面从收拢到张开）；水洼 **涟漪**一圈圈散；**78.4 s 起刮刀把整幅画从她脚下刷成彩色** |
| 112.5–152.5 s | **裂缝从上往下蔓延**；玻璃上一道反光缓慢扫过；碎片轻微浮动 |
| 152.5–204 s | 人群继续走；她站着不动、只是轻微晃；镜头持续后退 |
| 204–214 s | 裂缝已定，只有反光在走 |
| 214–232.8 s | 夜 → 黎明（整幅重画）；雨停；**杯口冒热气**；最后三滴水落完 |
| 每个镜头交界 | 0.42 s 的 **knife wipe**：用刀痕把上一个画面刮掉 |

技术上：人物每根骨头用**固定 seed** 的刀痕重画，所以动起来像手绘动画而不是贴图平移；
灰→彩不是滤镜，是每根笔触带着"刮刀何时到达"的时间（`rev`），放射状扫过整幅画。

---

## 三、改什么改哪里

| 想改 | 位置 |
|---|---|
| 段落、时长、歌词 | `mv-yushi/film.js` 顶部 `SONG`、`T`、`LYR` |
| 走路 / 坐 / 站 | `mv-yushi/scenes/figure.js` 的 `walkPose()`、`SIT`、`STAND` |
| 走位与动作时间 | `mv-yushi/film.js` 的 `shotRoom()`（19.6→26.4 s 走，26.4 s 坐，32.6 s 抬杯） |
| 雨量、水滴速度 | `mv-yushi/scenes/anim.js` 的 `rain()` / `drips()` |
| 上色时刻 | `film.js` 的 `T.colourOn`（默认 78.4） |

---

## 四、授权与注意

- **代码**：本仓库的影片代码是本项目自己写的，可自由使用；渲染引擎来自 Lemo-Opuscar（MIT）。
- **音乐与歌词**：《于是》的词曲版权归原权利人（郑润泽 / JD_Kwan 等），`mv-assets/` 里的音频与歌词仅作本片音轨使用。
  **如果这个仓库是公开的，建议删掉 `mv-assets/` 里的 mp3 与 lrc，或者把仓库设为 Private**——公开分发商业录音会涉及版权。
  渲染时把自己的音频放到同一路径即可，`build.sh` 会自动取 `../mv-assets/*.mp3`。
- **成片**：视频里没有 LemoLab 署名、没有水印，作品归你。
- 第三方素材与字体清单见 [`mv-yushi/CREDITS`](mv-yushi/CREDITS)。
