# 3.4 剪报气泡素材

两套独立透明贴图由内置 image_gen 生成，未使用 CLI/API 回退。原始 PNG 保留真实 alpha，复制到 assets/ 后供插件使用。

- assets/char-collage.png 用于角色消息，紫粉落日与棕榈旧照片。
- assets/user-collage.png 用于用户消息，冰蓝磁带、棋盘格与网格球。
- 原有 assets/ragged-frame.png 按九宫格边框缩放。用户边框通过 CSS 色相调整成冰蓝，正文区域不拉伸贴图。
- 原有 fine-paper.png 提供轻纸纹。贴图及标签均为装饰，不加入 .mes_text，不进入消息复制内容。

## CHAR 生成提示词

Production isolated transparent collage sticker cluster for the lower left corner of a real chat bubble, not a full UI mockup. Refined authentic 1980s-1990s vaporwave analog scrapbook. A small tilted torn polaroid photograph showing a saturated neon magenta striped sunset reflected on violet water, crisp black palm silhouettes, layered with a torn black-purple mesh scrap, aged cloudy lavender washi tape, tiny paper star and hand-drawn pink heart. Matte printed paper, visible torn white fibers, faded xerox grain, believable worn folds, cut-and-paste zine composition, not plastic or cartoon. Compact asymmetrical cluster in landscape 4:3 composition, objects form a coherent single pasted vignette. Delicate neon only inside the sunset photograph. NO text, NO typography, NO letters, NO interface, NO large blank paper, NO enclosing square background. Genuine transparent alpha outside all objects. Entire collage visible with 6 percent transparent breathing room. This is the character/CHAR variant, warm pink and midnight purple.

## USER 生成提示词

Production isolated transparent collage sticker cluster for the lower right corner of a real chat bubble, not a full UI mockup. Refined authentic 1980s-1990s vaporwave analog scrapbook. A small vintage cassette tape in icy cyan and cobalt blue, realistic exposed tape reels and blank lavender paper label, resting over a torn indigo graph-paper scrap and a small black-and-blue checkerboard torn corner. Attach with pale translucent blue washi tape and a tiny chrome four-point star. A very small cyan wireframe sphere fragment peeks behind the cassette. Matte scanned printed paper and worn photographic ephemera, visible fibers, delicate halftone grain, not shiny plastic UI or cartoon. Compact asymmetrical single cluster in landscape 4:3 composition. NO text, NO typography, NO letters, NO interface, NO large blank panel, NO enclosing rectangular background. Genuine transparent alpha outside all objects. Entire cluster visible with 6 percent transparent breathing room. This is the USER variant, unmistakably cool blue and silver, distinct from a pink sunset postcard.
