// Native theme presets select the appearance extension without duplicating its CSS.
export const RELEASE = '3.4.1';
export const THEME_NAMES = Object.freeze({
    time: '霓虹拼贴 3.3 · 自动',
    day: '霓虹拼贴 3.3 · 白天',
    night: '霓虹拼贴 3.3 · 夜晚',
    system: '霓虹拼贴 3.3 · 跟随系统',
});
export function nativeThemeCss(mode = 'time') {
    if (!Object.hasOwn(THEME_NAMES, mode)) mode = 'time';
    return `/* Vaporwave Collage native theme 3.3 */\nbody { --vc-theme-active: 1; --vc-theme-mode: ${mode}; --nc-active: 0; }\n`;
}
export function readNativeThemeMode(css = '') {
    if (!String(css).includes('Vaporwave Collage native theme 3.3')) return null;
    if (!/--vc-theme-active\s*:\s*1\s*[;}]/.test(css)) return null;
    const mode = /--vc-theme-mode\s*:\s*(time|day|night|system)\s*[;}]/.exec(css)?.[1];
    return mode || null;
}
export function isLegacyScrapbookCss(css = '') {
    return String(css).includes('Neon Scrapbook 1.0') && /--nc-active\s*:\s*1\s*[;}]/.test(css);
}
export function makeNativeTheme(mode = 'time') {
    if (!Object.hasOwn(THEME_NAMES, mode)) mode = 'time';
    return {
        name: THEME_NAMES[mode],
        author: 'Lucas',
        license: '禁止二改、二传及商用。',
        blur_strength: 6,
        main_text_color: 'rgba(255, 240, 252, 1)',
        italics_text_color: 'rgba(237, 195, 231, 1)',
        underline_text_color: 'rgba(255, 131, 227, 1)',
        quote_text_color: 'rgba(158, 156, 255, 1)',
        blur_tint_color: 'rgba(23, 10, 32, 0.55)',
        chat_tint_color: 'rgba(0, 0, 0, 0)',
        user_mes_blur_tint_color: 'rgba(23, 10, 32, 0.55)',
        bot_mes_blur_tint_color: 'rgba(23, 10, 32, 0.55)',
        shadow_color: 'rgba(0, 0, 0, 0)',
        border_color: 'rgba(212, 130, 201, 0.32)',
        shadow_width: 0,
        font_scale: 1,
        fast_ui_mode: false,
        waifuMode: false,
        chat_display: 0,
        noShadows: true,
        chat_width: 50,
        custom_css: nativeThemeCss(mode),
    };
}
