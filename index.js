import { defaults, normalize, resolveMode, validTime } from './model.js';
import { RELEASE, THEME_NAMES, nativeThemeCss, readNativeThemeMode, isLegacyScrapbookCss } from './native-theme.js';

const KEY = 'vaporwave_collage';
const context = () => window.SillyTavern?.getContext();
const $ = selector => document.querySelector(selector);
const modes = { time: '按时间切换', system: '跟随系统外观', day: '白天', night: '夜晚' };
const otherSkins = [
    ['dingtalk-tavern', 'dingtalk_tavern'], ['kindle-paper', 'kindle_paper'],
    ['x-tavern', 'x_tavern'], ['bluebird-mobile', 'bluebird_mobile'],
    ['claude-mobile-ui', 'claude_mobile_ui'], ['ins-frame-skin', 'ins_frame_skin'], ['ph-frame-skin', 'ph_frame_skin'],
];
let settings, controls, dialog, panel, art, wallpaper, controller, media, timer, observer;
let mounted = false, starting = false, busy = false, previousFocus, saveTimer;
let themeObserver, lastNativeThemeMode = null;
const save = () => context()?.saveSettingsDebounced();
const icon = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

function currentThemeMode() {
    return readNativeThemeMode(context()?.powerUserSettings?.custom_css || '');
}

function selectNativeTheme(mode = settings.mode) {
    const power = context()?.powerUserSettings;
    if (!power) return;
    const name = THEME_NAMES[mode] || THEME_NAMES.time;
    const picker = $('#themes');
    const existing = picker && [...picker.options].some(option => option.value === name);
    if (existing && window.jQuery) {
        window.jQuery(picker).val(name).trigger('change');
    } else {
        // Covers installing while the native theme list is already open.
        power.theme = name;
        power.custom_css = nativeThemeCss(mode);
        let style = $('#custom-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-style'; document.head.append(style); }
        style.textContent = power.custom_css;
        if ($('#customCSS')) $('#customCSS').value = power.custom_css;
        if (picker) {
            if (!existing) { const option = document.createElement('option'); option.value = name; option.textContent = name; picker.append(option); }
            picker.value = name;
        }
    }
    settings.nativeThemePaused = false;
    save();
}

function syncNativeTheme(initial = false) {
    if (!mounted) return;
    const mode = currentThemeMode();
    const previous = lastNativeThemeMode;
    lastNativeThemeMode = mode;
    if (mode && !(initial && settings.nativeThemePaused)) {
        const wasEnabled = settings.enabled;
        settings.enabled = true;
        settings.mode = mode;
        settings.nativeThemePaused = false;
        if (!initial && !wasEnabled) void suspendSkins().then(() => { apply(); decorate(); });
        save();
        apply(); decorate();
    } else if (!mode && previous) {
        settings.enabled = false;
        save(); apply();
    }
}

function setMode(mode) {
    settings.mode = mode;
    if (currentThemeMode()) selectNativeTheme(mode);
    save(); apply();
}

function activateTheme() {
    const power = context()?.powerUserSettings;
    if (power && !currentThemeMode()) settings.previousNativeTheme = power.theme;
    selectNativeTheme(settings.mode);
}

// Only known appearance extensions are paused. Their original flags are kept for restoration.
async function suspendSkins() {
    const c = context();
    settings.previousSkins ??= {};
    const live = otherSkins.filter(([name, key]) => c.extensionSettings[key]?.enabled === true && !c.extensionSettings.disabledExtensions?.includes(`third-party/${name}`));
    for (const [name, key] of live) { settings.previousSkins[name] = true; c.extensionSettings[key].enabled = false; }
    const installed = otherSkins.filter(([name, key]) => c.extensionSettings[key] && !c.extensionSettings.disabledExtensions?.includes(`third-party/${name}`));
    for (const [name] of installed) {
        try {
            const response = await fetch(`/scripts/extensions/third-party/${name}/manifest.json`);
            if (!response.ok) continue;
            const manifest = await response.json();
            if (manifest.js && !manifest.js.includes('..')) {
                const module = await import(`/scripts/extensions/third-party/${name}/${manifest.js}`);
                await module.onDisable?.();
            }
        } catch (error) { console.warn('[Vaporwave] 无法暂停旧美化', name, error); }
    }
    save();
}

function apply() {
    if (!mounted) return;
    const active = settings.enabled;
    document.body.classList.toggle('vc-enabled', active);
    controls.hidden = !active; art.hidden = !active || !settings.decorations;
    wallpaper.hidden = !active || settings.background !== 'paper';
    if (!active) {
        delete document.body.dataset.vcMode;
        document.body.style.removeProperty('--vc-alpha');
        document.body.style.removeProperty('--vc-type-scale');
        if (dialog.open) dialog.close();
        return;
    }
    const mode = resolveMode(settings, new Date(), media.matches);
    document.body.dataset.vcMode = mode;
    document.body.style.setProperty('--vc-alpha', String(1 - settings.transparency / 100));
    document.body.style.setProperty('--vc-type-scale', String(settings.textSize / 100));
    const toggle = $('#vc-toggle');
    toggle.innerHTML = icon(mode === 'night' ? 'moon' : 'sun');
    toggle.setAttribute('aria-label', `切换到${mode === 'night' ? '白天' : '夜晚'}模式`);
    toggle.title = `${modes[settings.mode]}，当前${mode === 'night' ? '夜晚' : '白天'}。点击切换`;
    dialog.querySelectorAll('[data-vc-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vcMode === settings.mode)));
    $('#vc-caption').textContent = `${modes[settings.mode]} · 当前${mode === 'night' ? '夜晚' : '白天'}`;
    $('#vc-transparency-value').textContent = `${settings.transparency}%`;
    $('#vc-transparency').value = String(settings.transparency);
    $('#vc-text-size').value = String(settings.textSize);
    $('#vc-text-size-value').textContent = `${settings.textSize}%`;
    $('#vc-background').value = settings.background;
    $('#vc-decorations').checked = settings.decorations;
    $('#vc-day').value = settings.day; $('#vc-night').value = settings.night;
    $('#vc-schedule').hidden = settings.mode !== 'time';
}

function showSettings() {
    previousFocus = document.activeElement;
    apply();
    if (!dialog.open) dialog.showModal();
}

function nativeDrawer(id) {
    dialog.close();
    const drawer = document.getElementById(id);
    if (!drawer) return;
    if (!drawer.querySelector('.drawer-content.openDrawer')) window.jQuery(drawer.querySelector('.drawer-toggle')).trigger('click');
}

async function home() {
    if (busy) return;
    if ($('#curEditTextarea') || (context().streamingProcessor && !context().streamingProcessor.isFinished)) {
        window.toastr?.info('请先完成编辑或停止生成，再返回欢迎页。'); return;
    }
    busy = true;
    try {
        const { closeCurrentChat } = await import('/script.js');
        await closeCurrentChat();
        if ($('.welcomePanel')) $('#chat').scrollTop = 0;
    } finally { busy = false; }
}

function decorate() {
    if (!mounted || !settings.enabled) return;
    const messages = [...document.querySelectorAll('#chat > .mes')];
    for (const message of messages) {
        const role = message.getAttribute('is_user');
        const type = message.getAttribute('type');
        const conversation = (role === 'true' || role === 'false') && message.getAttribute('is_system') !== 'true' && !['assistant_message', 'welcome_prompt'].includes(type) && !message.classList.contains('smallSysMes');
        message.classList.toggle('vc-chat-message', conversation);
        const block = message.querySelector(':scope > .mes_block');
        const decoration = block?.querySelector(':scope > .vc-message-collage');
        if (!conversation) { decoration?.remove(); continue; }
        if (block && !decoration) {
            const collage = document.createElement('div');
            collage.className = 'vc-message-collage'; collage.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span'); label.className = 'vc-message-label';
            label.textContent = role === 'true' ? 'USER / NIGHT DRIVE' : 'CHAR / NEON DREAMS';
            const stamp = document.createElement('span'); stamp.className = 'vc-message-stamp';
            const print = document.createElement('span'); print.className = 'vc-message-print';
            print.textContent = role === 'true' ? 'HOME RECORDING' : 'AFTER HOURS';
            collage.append(label, stamp, print); block.prepend(collage);
        } else if (decoration) {
            const label = decoration.querySelector('.vc-message-label');
            const print = decoration.querySelector('.vc-message-print');
            const labelText = role === 'true' ? 'USER / NIGHT DRIVE' : 'CHAR / NEON DREAMS';
            const printText = role === 'true' ? 'HOME RECORDING' : 'AFTER HOURS';
            if (label && label.textContent !== labelText) label.textContent = labelText;
            if (print && print.textContent !== printText) print.textContent = printText;
        }
    }
    const isWelcome = Boolean($('#chat .welcomePanel'));
    document.body.classList.toggle('vc-welcome', isWelcome);
    document.body.classList.toggle('vc-conversation', !isWelcome && messages.some(message => message.classList.contains('vc-chat-message')));
    if (!isWelcome) return;
    const greeting = $('#chat .mes[type="assistant_message"] .mes_block');
    if (greeting && !greeting.querySelector('.vc-welcome-heading')) {
        const title = document.createElement('h1'); title.className = 'vc-welcome-heading'; title.innerHTML = `欢迎回来 <span class="vc-crown" aria-hidden="true">${icon('crown')}</span>`;
        greeting.prepend(title);
    }
    const prompt = $('#chat .mes[type="welcome_prompt"] .mes_text');
    if (prompt && !prompt.querySelector('.vc-start-heading')) {
        const title = document.createElement('h2'); title.className = 'vc-start-heading'; title.textContent = '快速开始';
        prompt.prepend(title);
        const descriptions = { 'sys-settings-button': '连接模型服务\n开启新的对话', rightNavHolder: '创建或导入\n管理你的角色', 'extensions-settings-button': '添加扩展功能\n定制你的酒馆' };
        prompt.querySelectorAll('.drawer-opener').forEach(button => {
            const text = descriptions[button.dataset.target]; if (!text) return;
            const detail = document.createElement('small'); detail.className = 'vc-card-description'; detail.textContent = text;
            button.append(detail);
            const number = document.createElement('em'); number.className = 'vc-card-number'; number.setAttribute('aria-hidden', 'true');
            number.textContent = { 'sys-settings-button': '01 / CONNECT', rightNavHolder: '02 / CHARACTERS', 'extensions-settings-button': '03 / EXPLORE' }[button.dataset.target];
            button.append(number);
        });
    }
}

async function setEnabled(enabled) {
    settings.enabled = enabled;
    settings.nativeThemePaused = !enabled;
    if (enabled) { activateTheme(); await suspendSkins(); }
    save(); apply(); decorate();
    if (!enabled) document.body.classList.remove('vc-welcome', 'vc-conversation');
}

async function restorePrevious() {
    await setEnabled(false);
    const c = context();
    for (const [name, key] of otherSkins) if (settings.previousSkins?.[name] && c.extensionSettings[key]) c.extensionSettings[key].enabled = true;
    settings.previousSkins = {};
    const name = settings.previousNativeTheme;
    const picker = $('#themes');
    if (name && picker && [...picker.options].some(option => option.value === name)) window.jQuery(picker).val(name).trigger('change');
    save();
    window.toastr?.info('之前的外观设置已恢复。刷新酒馆即可加载。');
}

function handleClick(event) {
    const target = event.target.closest('[data-vc-action], [data-vc-mode]');
    if (!target) return;
    if (target.dataset.vcMode) { setMode(target.dataset.vcMode); return; }
    switch (target.dataset.vcAction) {
        case 'theme': setMode(document.body.dataset.vcMode === 'night' ? 'day' : 'night'); break;
        case 'settings': showSettings(); break;
        case 'close': dialog.close(); break;
        case 'home': void home(); break;
        case 'background': settings.background = 'native'; save(); apply(); nativeDrawer('backgrounds-button'); break;
        case 'api': nativeDrawer('sys-settings-button'); break;
        case 'characters': nativeDrawer('rightNavHolder'); break;
        case 'extensions': nativeDrawer('extensions-settings-button'); break;
        case 'enable': void setEnabled(true); break;
        case 'disable': void setEnabled(false); break;
        case 'restore': void restorePrevious(); break;
        case 'reset': Object.assign(settings, defaults); if (currentThemeMode()) selectNativeTheme(defaults.mode); save(); apply(); break;
    }
}

async function mount() {
    if (mounted || starting || !context() || !$('#extensions_settings')) return;
    starting = true;
    try {
        settings = normalize(context().extensionSettings[KEY]); context().extensionSettings[KEY] = settings;
        const migrateLegacy = isLegacyScrapbookCss(context().powerUserSettings?.custom_css) && settings.nativeThemeMigration !== RELEASE;
        if (migrateLegacy) { settings.enabled = true; settings.mode = 'time'; settings.nativeThemePaused = false; settings.nativeThemeMigration = RELEASE; }
        controller = new AbortController(); const { signal } = controller;
        media = matchMedia('(prefers-color-scheme: dark)');
        wallpaper = document.createElement('div'); wallpaper.id = 'vc-wallpaper'; wallpaper.setAttribute('aria-hidden', 'true');
        art = document.createElement('div'); art.id = 'vc-art'; art.setAttribute('aria-hidden', 'true');
        art.innerHTML = `
            <div class="vc-edge vc-edge-left"></div><div class="vc-edge vc-edge-right"></div>
            <div class="vc-paper-note vc-note-stories"><span>Lost in<br>neon.<br>Found in<br>dreams.</span><b>♡</b></div>
            <div class="vc-paper-note vc-note-kinder"><span>Late<br>nights.<br>Slow<br>tapes.</span><b>♡</b></div>
            <div class="vc-paper-note vc-note-still"><span>Stay<br>on the<br>air.</span><b>♡</b></div>
            <div class="vc-paper-note vc-note-fiction"><span>Pastel<br>skies.<br>Digital<br>dreams.</span><b>♡</b></div>
            <div class="vc-paper-note vc-note-story"><span>Rewind<br>the night.<br>Replay<br>the dream.</span><b>♡</b></div>
            <div class="vc-note"><small>STEREO / 1989</small><span>Midnight radio.<br>Endless summer.</span><b>♡</b></div>
            <div class="vc-dream-note">Soft<br>static.<br>Endless<br>summer.<b>♡</b></div>
            <div class="vc-side-caption"><span>NEON</span><span>NEVER</span><span>SLEEPS</span><b>♡</b></div>
            <div class="vc-side-label"><span>SIDE A</span><span>NEON NIGHTS</span><span>SIDE B</span><span>LUCID DREAMS</span><span>PLAY</span><em>REWIND ... ♡</em></div>`;
        controls = document.createElement('div'); controls.id = 'vc-controls';
        controls.innerHTML = `<button type="button" data-vc-action="home" aria-label="返回欢迎页" title="返回欢迎页">${icon('house')}</button><button type="button" id="vc-toggle" data-vc-action="theme" aria-label="切换日夜模式"></button><button type="button" data-vc-action="settings" aria-label="霓虹外观设置" title="霓虹外观设置">${icon('sliders')}</button>`;
        dialog = document.createElement('dialog'); dialog.id = 'vc-appearance'; dialog.setAttribute('aria-labelledby', 'vc-title');
        dialog.innerHTML = `<header><span class="vc-kicker">VAPORWAVE / APPEARANCE</span><button type="button" data-vc-action="close" aria-label="关闭外观设置">${icon('xmark')}</button></header><h2 id="vc-title">日光与夜色</h2><p class="vc-intro">调一束喜欢的光，继续你的故事。</p><div class="vc-mode-previews"><button type="button" class="vc-day-preview" data-vc-mode="day"><i></i><b>白日梦</b><span>暮粉纸纹 · 霓虹墨色</span></button><button type="button" class="vc-night-preview" data-vc-mode="night"><i></i><b>霓虹夜</b><span>电光粉 · 午夜蓝</span></button></div><div class="vc-auto"><button type="button" data-vc-mode="time">${icon('clock')} 按时间切换</button><button type="button" data-vc-mode="system">${icon('desktop')} 跟随系统外观</button></div><div id="vc-schedule"><label>白天开始<input id="vc-day" type="time"></label><label>夜晚开始<input id="vc-night" type="time"></label></div><p id="vc-caption" role="status"></p><div class="vc-setting"><label for="vc-transparency">面板背景透明度</label><output id="vc-transparency-value" for="vc-transparency">45%</output><input type="range" id="vc-transparency" min="0" max="100" step="1"><small>调节面板底色。文字和纸张装饰保持清晰。</small></div><div class="vc-setting"><label for="vc-background">背景图片</label><select id="vc-background"><option value="paper">蒸汽波揉皱纸纹</option><option value="native">使用酒馆背景</option></select><button type="button" data-vc-action="background">${icon('image')} 更换或上传背景</button></div><label class="vc-check"><input type="checkbox" id="vc-decorations">显示两侧拼贴装饰</label><footer><button type="button" data-vc-action="reset">恢复默认</button><button type="button" class="vc-primary" data-vc-action="close">完成</button></footer>`;
        const typography = document.createElement('div'); typography.className = 'vc-setting';
        typography.innerHTML = '<label for="vc-text-size">首页文字大小</label><output id="vc-text-size-value" for="vc-text-size">100%</output><input type="range" id="vc-text-size" min="85" max="115" step="5"><small>调整标题、卡片说明和输入框。聊天正文使用酒馆原有字号。</small>';
        dialog.querySelector('#vc-background').closest('.vc-setting').before(typography);
        const credit = document.createElement('div'); credit.className = 'vc-dialog-credit';
        credit.innerHTML = '<b>Lucas</b><span>禁止二改、二传及商用。</span>';
        dialog.append(credit);
        panel = document.createElement('div'); panel.id = 'vc-extension-settings';
        panel.innerHTML = '<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header vc-panel-header"><div class="vc-panel-title"><b>霓虹拼贴 · Vaporwave</b><small>v3.4.1 · Lucas</small></div><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><div class="vc-panel-body"><p class="vc-panel-description">启用后可调整日夜模式、透明度和背景。界面主题可选择“霓虹拼贴 3.3”系列。</p><div class="vc-panel-actions"><button type="button" class="menu_button vc-panel-primary" data-vc-action="enable">启用美化</button><button type="button" class="menu_button" data-vc-action="settings">外观设置</button><button type="button" class="menu_button" data-vc-action="disable">关闭美化</button><button type="button" class="menu_button" data-vc-action="restore">恢复之前外观</button></div><div class="vc-panel-rights"><b>Lucas</b><span>禁止二改、二传及商用。</span></div></div></div></div>';
        document.body.append(wallpaper, art, controls, dialog); $('#extensions_settings').prepend(panel);
        for (const el of [controls, dialog, panel]) el.addEventListener('click', handleClick, { signal });
        dialog.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus(); }, { signal });
        dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }, { signal });
        $('#vc-transparency').addEventListener('input', event => {
            settings.transparency = Number(event.target.value); apply(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 200);
        }, { signal });
        $('#vc-background').addEventListener('change', event => { settings.background = event.target.value; save(); apply(); }, { signal });
        $('#vc-text-size').addEventListener('input', event => { settings.textSize = Number(event.target.value); apply(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 200); }, { signal });
        $('#vc-decorations').addEventListener('change', event => { settings.decorations = event.target.checked; save(); apply(); }, { signal });
        // Opening the native background drawer also reveals the user's own background.
        $('#backgrounds-button .drawer-toggle')?.addEventListener('click', () => {
            if (settings.enabled && settings.background !== 'native' && !$('#backgrounds-button .openDrawer')) {
                settings.background = 'native'; save(); apply();
            }
        }, { signal, capture: true });
        for (const id of ['vc-day', 'vc-night']) $(`#${id}`).addEventListener('change', () => {
            const day = $('#vc-day').value, night = $('#vc-night').value;
            if (!validTime(day) || !validTime(night) || day === night) { window.toastr?.info('请设置两个不同的有效时间。'); apply(); return; }
            settings.day = day; settings.night = night; save(); apply();
        }, { signal });
        window.addEventListener('focus', apply, { signal }); document.addEventListener('visibilitychange', apply, { signal });
        media.addEventListener('change', apply, { signal });
        document.addEventListener('keydown', event => { if (settings.enabled && event.altKey && event.shiftKey && event.code === 'KeyV') { event.preventDefault(); showSettings(); } }, { signal });
        // Repair decoration when the native app replaces a message block or author.
        // Streaming text and our own decoration insertions do not schedule a rebuild.
        const chatRoot = $('#chat');
        observer = new MutationObserver(records => {
            const needsDecoration = records.some(record => {
                if (record.type === 'attributes' || record.target === chatRoot) return true;
                if (record.target.matches?.('.mes_block') && record.target.closest('.vc-chat-message') && !record.target.querySelector(':scope > .vc-message-collage')) return true;
                return [...record.addedNodes].some(node => node.matches?.('.mes,.mes_block,.welcomePanel'));
            });
            if (needsDecoration) decorate();
        });
        observer.observe(chatRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['is_user', 'is_system', 'type'] });
        mounted = true;
        if (migrateLegacy) activateTheme();
        const themeStyle = $('#custom-style');
        if (themeStyle) { themeObserver = new MutationObserver(() => syncNativeTheme()); themeObserver.observe(themeStyle, { childList: true, characterData: true, subtree: true }); }
        syncNativeTheme(true);
        if (settings.enabled) await suspendSkins();
        apply(); decorate(); timer = setInterval(apply, 30000);
    } finally { starting = false; }
}

export function onDisable() {
    if (!mounted) return;
    controller.abort(); observer.disconnect(); themeObserver?.disconnect(); themeObserver = null; lastNativeThemeMode = null; clearInterval(timer); clearTimeout(saveTimer);
    if (dialog.open) dialog.close();
    for (const el of [controls, dialog, panel, art, wallpaper]) el.remove();
    document.querySelectorAll('.vc-welcome-heading,.vc-start-heading,.vc-card-description,.vc-card-number').forEach(el => el.remove());
    document.querySelectorAll('#chat .vc-chat-message').forEach(message => message.classList.remove('vc-chat-message'));
    document.querySelectorAll('#chat .vc-message-collage').forEach(decoration => decoration.remove());
    document.body.classList.remove('vc-enabled', 'vc-welcome', 'vc-conversation'); delete document.body.dataset.vcMode;
    document.body.style.removeProperty('--vc-alpha'); mounted = false;
    document.body.style.removeProperty('--vc-type-scale');
}
export async function onEnable() { await mount(); if (mounted) await setEnabled(true); }
const c = context();
if (c?.eventTypes.APP_READY) c.eventSource.once(c.eventTypes.APP_READY, () => setTimeout(() => void mount(), 0));
if (document.readyState === 'complete') setTimeout(() => void mount(), 0);
else window.addEventListener('load', () => setTimeout(() => void mount(), 0), { once: true });

