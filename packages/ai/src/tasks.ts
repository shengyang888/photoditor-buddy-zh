import type { AiRuntime, AspectRatio, ImageSize } from './types';

/** Categories used to group AI tools in the panel. */
export type AiTaskCategory = '修复' | '消除与替换' | '人像' | '风格' | '场景' | '创意';

/** Choice offered by a task (e.g. art styles). */
export interface AiTaskOption {
  id: string;
  label: string;
  /** Text merged into the prompt. */
  prompt: string;
}

/** One AI feature. Everything the UI needs to render its card and build a request. */
export interface AiTask {
  id: string;
  name: string;
  category: AiTaskCategory;
  description: string;
  runtime: AiRuntime;
  /** Lucide icon name used in the UI. */
  icon: string;
  /** The user types something (e.g. what to remove). */
  needsPrompt: boolean;
  promptPlaceholder?: string;
  /** The user paints a mask (used by OpenAI masked edits and the local eraser). */
  usesMask: boolean;
  options?: AiTaskOption[];
  /** Builds the final instruction sent to the model. */
  buildPrompt: (input: { text: string; option?: AiTaskOption }) => string;
  /** Requested output aspect ratio for cloud tasks (Expand uses this). */
  aspectRatio?: AspectRatio;
  size?: ImageSize;
  /** Which local function runs this task. */
  local?: 'remove-background' | 'upscale' | 'erase';
}

const KEEP =
  'Keep everything else exactly the same: same person, same pose, same framing, same lighting and colours. Output only the edited photo, no text.';

function task(t: AiTask): AiTask {
  return t;
}

/** The AI tool catalogue. Tasks marked `cloud` need a Gemini or OpenAI key; `local` ones are free. */
export const AI_TASKS: readonly AiTask[] = [
  // Fix
  task({
    id: 'local-remove-bg',
    name: '抠图去背景',
    category: '消除与替换',
    description: '把主体抠出来，背景变透明。免费，在本机运行。',
    runtime: 'local',
    icon: 'Scissors',
    needsPrompt: false,
    usesMask: false,
    local: 'remove-background',
    buildPrompt: () => '',
  }),
  task({
    id: 'local-upscale',
    name: '高清放大 2×',
    category: '修复',
    description: '分辨率翻倍，细节更清晰。免费，在本机运行。',
    runtime: 'local',
    icon: 'Maximize2',
    needsPrompt: false,
    usesMask: false,
    local: 'upscale',
    buildPrompt: () => '',
  }),
  task({
    id: 'local-erase',
    name: '橡皮擦（离线）',
    category: '消除与替换',
    description: '涂抹要去掉的物体即可消除。免费，在本机运行（需下载较大模型，桌面端效果更佳）。',
    runtime: 'local',
    icon: 'Eraser',
    needsPrompt: false,
    usesMask: true,
    local: 'erase',
    buildPrompt: () => '',
  }),
  task({
    id: 'ai-enhance',
    name: '高清增强',
    category: '修复',
    description: '以更高分辨率重新渲染照片，细节更干净清晰。',
    runtime: 'cloud',
    icon: 'Sparkles',
    needsPrompt: false,
    usesMask: false,
    size: '2K',
    buildPrompt: () =>
      `Enhance this photo to high resolution: sharpen fine details, reduce noise and compression artifacts, fix soft focus, and improve clarity naturally. ${KEEP}`,
  }),
  task({
    id: 'ai-restore',
    name: '老照片修复',
    category: '修复',
    description: '修复老照片的划痕、褪色、折痕与模糊。',
    runtime: 'cloud',
    icon: 'History',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Restore this old photograph: remove scratches, dust, creases, stains and fading; recover faces and details; fix blur. Keep it photorealistic and faithful to the original. ${KEEP}`,
  }),
  task({
    id: 'ai-colorize',
    name: '黑白上色',
    category: '修复',
    description: '为黑白照片加上逼真的色彩。',
    runtime: 'cloud',
    icon: 'Palette',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Colorize this black-and-white photograph with realistic, natural colours appropriate to the era and scene. ${KEEP}`,
  }),
  task({
    id: 'ai-exposure',
    name: '光线修复',
    category: '修复',
    description: '修正曝光不足或过度、浓重阴影与偏色。',
    runtime: 'cloud',
    icon: 'SunMedium',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Fix the lighting of this photo: correct exposure, recover blown highlights and dark shadows, remove colour casts, balance white balance. Natural result. ${KEEP}`,
  }),
  task({
    id: 'ai-unblur',
    name: '去模糊',
    category: '修复',
    description: '锐化运动模糊与失焦照片。',
    runtime: 'cloud',
    icon: 'Focus',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Remove blur from this photo and make it sharp and in focus, recovering detail in faces and textures. ${KEEP}`,
  }),
  // Remove & Replace
  task({
    id: 'ai-remove',
    name: 'AI 消除',
    category: '消除与替换',
    description: '描述（或涂抹）要去掉的内容：人物、物体、文字、水印、电线。',
    runtime: 'cloud',
    icon: 'Eraser',
    needsPrompt: true,
    promptPlaceholder: '例如：左边的人、水印、电线',
    usesMask: true,
    buildPrompt: ({ text }) =>
      `Remove ${text || 'the marked object'} from this photo and fill the area realistically with matching background. ${KEEP}`,
  }),
  task({
    id: 'ai-replace',
    name: 'AI 替换',
    category: '消除与替换',
    description: '把一样东西换成另一样，例如“把杯子换成绿植”。',
    runtime: 'cloud',
    icon: 'Replace',
    needsPrompt: true,
    promptPlaceholder: '例如：把红色汽车换成蓝色自行车',
    usesMask: true,
    buildPrompt: ({ text }) =>
      `${text}. Match the lighting, perspective and shadows so it looks real. ${KEEP}`,
  }),
  task({
    id: 'ai-background',
    name: '换背景',
    category: '消除与替换',
    description: '保留主体，换个新场景。',
    runtime: 'cloud',
    icon: 'Image',
    needsPrompt: true,
    promptPlaceholder: '例如：阳光沙滩、现代办公室、纯白影棚',
    usesMask: false,
    buildPrompt: ({ text }) =>
      `Replace the background with ${text || 'a clean studio background'}. Keep the main subject exactly as it is, with matching lighting and natural edges. Output only the photo.`,
  }),
  task({
    id: 'ai-expand',
    name: 'AI 扩图',
    category: '消除与替换',
    description: '向画面边缘之外延展（外绘）。',
    runtime: 'cloud',
    icon: 'Expand',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: '16:9', label: '宽幅 16:9', prompt: '' },
      { id: '4:3', label: '横向 4:3', prompt: '' },
      { id: '1:1', label: '正方形', prompt: '' },
      { id: '3:4', label: '竖向 3:4', prompt: '' },
      { id: '9:16', label: '竖幅 9:16', prompt: '' },
      { id: '21:9', label: '影院 21:9', prompt: '' },
    ],
    buildPrompt: () =>
      'Extend this photo outwards to fill the new frame: continue the scene naturally beyond the current edges with matching content, perspective, lighting and style. Do not change or crop the original area. Output only the photo.',
  }),
  task({
    id: 'ai-text-remove',
    name: '去文字',
    category: '消除与替换',
    description: '擦除字幕、贴纸与水印。',
    runtime: 'cloud',
    icon: 'Type',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Remove all text, captions, logos, stickers and watermarks from this photo and fill the area realistically. ${KEEP}`,
  }),
  // Portrait
  task({
    id: 'ai-retouch',
    name: 'AI 精修',
    category: '人像',
    description: '自然修肤、去眼袋、整理碎发、消除眼镜反光。',
    runtime: 'cloud',
    icon: 'Smile',
    needsPrompt: false,
    usesMask: false,
    buildPrompt: () =>
      `Retouch the person naturally: even skin tone, reduce blemishes and under-eye bags, tidy stray hairs, remove glare from glasses. Keep real skin texture and identity. ${KEEP}`,
  }),
  task({
    id: 'ai-hairstyle',
    name: '换发型',
    category: '人像',
    description: '试试新发型或发色。',
    runtime: 'cloud',
    icon: 'Scissors',
    needsPrompt: true,
    promptPlaceholder: '例如：短发波波头、长卷发、铂金色',
    usesMask: false,
    buildPrompt: ({ text }) =>
      `Change the person's hairstyle to ${text}. Keep the face, expression and everything else identical. Photorealistic. Output only the photo.`,
  }),
  task({
    id: 'ai-outfit',
    name: '换装',
    category: '人像',
    description: '换衣服：西装、裙装、制服、休闲装。',
    runtime: 'cloud',
    icon: 'Shirt',
    needsPrompt: true,
    promptPlaceholder: '例如：藏青色西装配白衬衫',
    usesMask: false,
    buildPrompt: ({ text }) =>
      `Change the person's clothing to ${text}. Keep the face, pose, body and background identical. Photorealistic fabric and fit. Output only the photo.`,
  }),
  task({
    id: 'ai-id-photo',
    name: '证件照',
    category: '人像',
    description: '证件照风格：纯色背景、正装上衣，保持自然表情。',
    runtime: 'cloud',
    icon: 'IdCard',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'white', label: '白底', prompt: 'a plain pure white background' },
      { id: 'blue', label: '蓝底', prompt: 'a plain light blue background' },
      { id: 'red', label: '红底', prompt: 'a plain red background' },
      { id: 'grey', label: '灰底', prompt: 'a plain light grey background' },
    ],
    aspectRatio: '3:4',
    buildPrompt: ({ option }) =>
      `Turn this into a formal ID / passport photo: ${option?.prompt ?? 'a plain white background'}, even frontal lighting, the person wearing a smart plain top, head and shoulders centred, no shadows. Keep the face and expression exactly the same. Output only the photo.`,
  }),
  task({
    id: 'ai-makeup',
    name: 'AI 美妆',
    category: '人像',
    description: '自然上妆，打造完整妆容。',
    runtime: 'cloud',
    icon: 'Wand2',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'natural', label: '自然', prompt: 'soft natural everyday makeup' },
      {
        id: 'glam',
        label: '华丽',
        prompt: 'glamorous evening makeup with defined eyes and bold lips',
      },
      {
        id: 'korean',
        label: '韩系',
        prompt: 'Korean-style dewy makeup with gradient lips and straight brows',
      },
      { id: 'smoky', label: '烟熏', prompt: 'smoky eye makeup with nude lips' },
      { id: 'none', label: '卸妆', prompt: 'no makeup at all, clean bare skin' },
    ],
    buildPrompt: ({ option }) =>
      `Apply ${option?.prompt ?? 'natural makeup'} to the person's face. Keep identity, skin texture and everything else the same. ${KEEP}`,
  }),
  task({
    id: 'ai-smile',
    name: '换表情',
    category: '人像',
    description: '加上微笑、睁开闭着的眼睛、看向镜头。',
    runtime: 'cloud',
    icon: 'Laugh',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'smile', label: '微笑', prompt: 'a gentle natural smile' },
      { id: 'big-smile', label: '开怀大笑', prompt: 'a happy open smile' },
      { id: 'eyes', label: '睁开眼睛', prompt: 'both eyes open and looking at the camera' },
      { id: 'serious', label: '平静', prompt: 'a calm neutral expression' },
    ],
    buildPrompt: ({ option }) =>
      `Change the person's expression to ${option?.prompt ?? 'a natural smile'}. Keep identity and everything else the same. ${KEEP}`,
  }),
  // Style
  task({
    id: 'ai-style',
    name: '艺术风格',
    category: '风格',
    description: '把照片变成动漫、油画、素描、3D 等风格。',
    runtime: 'cloud',
    icon: 'Brush',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'anime', label: '动漫', prompt: 'Japanese anime illustration style' },
      {
        id: 'ghibli',
        label: '吉卜力',
        prompt: 'hand-painted Studio-Ghibli-inspired animation style',
      },
      {
        id: 'oil',
        label: '油画',
        prompt: 'classical oil painting with visible brush strokes',
      },
      { id: 'watercolor', label: '水彩', prompt: 'soft watercolour painting' },
      { id: 'sketch', label: '素描', prompt: 'detailed pencil sketch on paper' },
      { id: '3d', label: '3D 卡通', prompt: 'Pixar-style 3D animated character render' },
      {
        id: 'comic',
        label: '漫画',
        prompt: 'American comic book style with bold ink lines and halftone',
      },
      { id: 'pixel', label: '像素风', prompt: '16-bit pixel art' },
      { id: 'popart', label: '波普艺术', prompt: 'Warhol-style pop art with flat bold colours' },
      { id: 'cyberpunk', label: '赛博朋克', prompt: 'neon-lit cyberpunk digital art' },
      { id: 'clay', label: '黏土动画', prompt: 'stop-motion clay figure style' },
      { id: 'lego', label: '积木', prompt: 'built from plastic toy bricks' },
    ],
    buildPrompt: ({ option }) =>
      `Redraw this photo in ${option?.prompt ?? 'anime style'}, keeping the same composition, people and their recognisable features. Output only the image.`,
  }),
  task({
    id: 'ai-avatar',
    name: 'AI 头像',
    category: '风格',
    description: '用自拍生成风格化头像。',
    runtime: 'cloud',
    icon: 'UserRound',
    needsPrompt: false,
    usesMask: false,
    aspectRatio: '1:1',
    options: [
      { id: 'cartoon', label: '卡通', prompt: 'a clean vector cartoon avatar' },
      { id: 'fantasy', label: '奇幻', prompt: 'an epic fantasy character portrait' },
      { id: 'astronaut', label: '宇航员', prompt: 'an astronaut portrait in a space suit' },
      { id: 'royal', label: '宫廷', prompt: 'a renaissance royal oil portrait' },
      { id: 'superhero', label: '超级英雄', prompt: 'a superhero movie poster portrait' },
      { id: 'vintage', label: '复古', prompt: 'a 1950s studio portrait' },
    ],
    buildPrompt: ({ option }) =>
      `Create ${option?.prompt ?? 'a cartoon avatar'} of this person, square profile-picture framing, keeping their recognisable features. Output only the image.`,
  }),
  task({
    id: 'ai-filter-clone',
    name: '套用色调',
    category: '风格',
    description: '描述一种色彩风格或氛围并应用。',
    runtime: 'cloud',
    icon: 'SwatchBook',
    needsPrompt: true,
    promptPlaceholder: '例如：忧郁的青橙电影感、明亮的日系清新风',
    usesMask: false,
    buildPrompt: ({ text }) =>
      `Apply this colour grade / mood to the photo: ${text}. Only change colours, tones and lighting mood; do not change any content. Output only the photo.`,
  }),
  // Scene
  task({
    id: 'ai-sky',
    name: '换天空',
    category: '场景',
    description: '把阴沉的天空换成落日、蓝天、星空……',
    runtime: 'cloud',
    icon: 'CloudSun',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'blue', label: '蓝天', prompt: 'a clear bright blue sky with a few soft clouds' },
      { id: 'sunset', label: '落日', prompt: 'a dramatic golden-orange sunset sky' },
      { id: 'night', label: '星空', prompt: 'a starry night sky with the Milky Way' },
      { id: 'storm', label: '暴风雨', prompt: 'a dramatic dark stormy sky' },
      { id: 'pink', label: '粉色暮色', prompt: 'a soft pink and purple dusk sky' },
      { id: 'clouds', label: '白云', prompt: 'a sky full of big fluffy white clouds' },
    ],
    buildPrompt: ({ option }) =>
      `Replace the sky with ${option?.prompt ?? 'a clear blue sky'} and adjust the scene lighting and reflections to match. Keep everything else the same. Output only the photo.`,
  }),
  task({
    id: 'ai-relight',
    name: '换光线',
    category: '场景',
    description: '改变光线：黄金时刻、影棚闪光、霓虹、窗光。',
    runtime: 'cloud',
    icon: 'Lightbulb',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'golden', label: '黄金时刻', prompt: 'warm golden-hour sunlight from the side' },
      { id: 'studio', label: '影棚', prompt: 'soft professional studio lighting' },
      { id: 'flash', label: '闪光灯', prompt: 'direct on-camera flash look' },
      { id: 'window', label: '窗光', prompt: 'soft natural window light' },
      { id: 'neon', label: '霓虹', prompt: 'pink and blue neon lighting' },
      { id: 'dramatic', label: '戏剧光', prompt: 'moody dramatic low-key lighting' },
    ],
    buildPrompt: ({ option }) =>
      `Relight this photo with ${option?.prompt ?? 'soft studio lighting'}, with realistic shadows and highlights. Keep the content identical. Output only the photo.`,
  }),
  task({
    id: 'ai-season',
    name: '季节天气',
    category: '场景',
    description: '把夏天变成雪天，加上雨、樱花、秋叶。',
    runtime: 'cloud',
    icon: 'Snowflake',
    needsPrompt: false,
    usesMask: false,
    options: [
      { id: 'snow', label: '下雪', prompt: 'a snowy winter day' },
      { id: 'autumn', label: '秋天', prompt: 'autumn with golden and red leaves' },
      { id: 'spring', label: '樱花', prompt: 'spring with cherry blossoms' },
      { id: 'rain', label: '下雨', prompt: 'a rainy day with wet reflective surfaces' },
      { id: 'fog', label: '雾天', prompt: 'a misty foggy morning' },
      { id: 'night', label: '夜晚', prompt: 'night time with city lights' },
    ],
    buildPrompt: ({ option }) =>
      `Change the scene to ${option?.prompt ?? 'a snowy winter day'} while keeping the people, objects and composition the same. Output only the photo.`,
  }),
  task({
    id: 'ai-product',
    name: '商品图',
    category: '场景',
    description: '干净的电商背景，带影棚阴影。',
    runtime: 'cloud',
    icon: 'Package',
    needsPrompt: true,
    promptPlaceholder: '例如：白色影棚、大理石桌面、带绿植的木桌',
    usesMask: false,
    buildPrompt: ({ text }) =>
      `Turn this into a professional product photo: place the product on ${text || 'a clean white studio background'} with realistic soft shadows and reflections. Keep the product exactly the same. Output only the photo.`,
  }),
  // Create
  task({
    id: 'ai-custom',
    name: '自定义指令',
    category: '创意',
    description: '告诉 AI 你想要什么：“改成冬天”“加顶帽子”“把白天变成夜晚”。',
    runtime: 'cloud',
    icon: 'MessageSquare',
    needsPrompt: true,
    promptPlaceholder: '描述你想要的改动',
    usesMask: true,
    buildPrompt: ({ text }) => `${text}. Output only the edited photo.`,
  }),
  task({
    id: 'ai-poster',
    name: '海报',
    category: '创意',
    description: '把照片做成带标题的设计海报。',
    runtime: 'cloud',
    icon: 'LayoutTemplate',
    needsPrompt: true,
    promptPlaceholder: '标题文字，例如：夏日特惠',
    usesMask: false,
    aspectRatio: '3:4',
    buildPrompt: ({ text }) =>
      `Design a stylish poster using this photo as the main image, with the headline "${text || 'HELLO'}" in bold modern typography and a clean layout. Output only the poster.`,
  }),
  task({
    id: 'ai-sticker',
    name: '贴纸',
    category: '创意',
    description: '抠图贴纸，白边，卡通风格。',
    runtime: 'cloud',
    icon: 'Sticker',
    needsPrompt: false,
    usesMask: false,
    aspectRatio: '1:1',
    buildPrompt: () =>
      'Turn the main subject into a die-cut sticker: cartoon style, thick white outline, plain white background around it. Output only the image.',
  }),
];

/** Category names in display order. */
export const AI_TASK_CATEGORIES: readonly AiTaskCategory[] = [
  '修复',
  '消除与替换',
  '人像',
  '风格',
  '场景',
  '创意',
];

/** Finds a task by id. */
export function findTask(id: string): AiTask | undefined {
  return AI_TASKS.find((t) => t.id === id);
}
