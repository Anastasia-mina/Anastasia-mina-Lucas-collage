export const defaults = Object.freeze({ enabled: true, mode: 'time', day: '07:00', night: '19:00', transparency: 45, textSize: 100, background: 'paper', decorations: true });
export const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
export function normalize(value = {}) {
    const result = { ...defaults, ...value };
    if (!['time', 'system', 'day', 'night'].includes(result.mode)) result.mode = defaults.mode;
    if (!validTime(result.day) || !validTime(result.night) || result.day === result.night) {
        result.day = defaults.day; result.night = defaults.night;
    }
    const n = Number(result.transparency);
    result.transparency = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 45;
    const textSize = Number(result.textSize);
    result.textSize = Number.isFinite(textSize) ? Math.min(115, Math.max(85, Math.round(textSize))) : 100;
    result.background = result.background === 'native' ? 'native' : 'paper';
    result.enabled = result.enabled !== false;
    result.decorations = result.decorations !== false;
    return result;
}
export function resolveMode(settings, date = new Date(), systemDark = false) {
    const s = normalize(settings);
    if (s.mode === 'day' || s.mode === 'night') return s.mode;
    if (s.mode === 'system') return systemDark ? 'night' : 'day';
    const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const day = minutes(s.day), night = minutes(s.night), now = date.getHours() * 60 + date.getMinutes();
    return (day < night ? now >= day && now < night : now >= day || now < night) ? 'day' : 'night';
}
