import * as worldInfo from '../../../../world-info.js';
import { getCharaFilename } from '../../../../utils.js';

export const DEFAULT_HISTORY_COUNT = 5;
export const MAX_HISTORY_COUNT = 30;
export const MAX_PRONOUN_RULES = 1500;

const HISTORY_BUDGET = 8000;
const LOREBOOK_BUDGET = 6000;
const LOREBOOK_SCAN_DEPTH = 100;

export function historyCount(value) {
    const count = Math.trunc(Number(value));
    return count > 0 ? Math.min(count, MAX_HISTORY_COUNT) : DEFAULT_HISTORY_COUNT;
}

function clip(text, limit) {
    return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
}

function collectHistory(messages, settings, language, getCache) {
    const history = [];
    let remaining = HISTORY_BUDGET;
    for (const message of messages.slice(-historyCount(settings.historyCount)).reverse()) {
        if (message.is_system) continue;
        const cache = settings.includePreviousTranslations ? getCache(message) : null;
        const translation = cache && (cache.language ?? '').trim().toLowerCase() === language.toLowerCase()
            ? cache
            : null;
        const entry = { speaker: message.name ?? '', fromUser: !!message.is_user };
        if (settings.includeChatHistory && message.mes?.trim()) entry.original = clip(message.mes, 1800);
        if (translation) {
            entry.translation = clip(translation.text, 1800);
            if (translation.manuallyEdited) entry.userCorrected = true;
        }
        if (!entry.original && !entry.translation) continue;
        const size = JSON.stringify(entry).length;
        if (size > remaining) continue;
        remaining -= size;
        history.push(entry);
    }
    return history.reverse();
}

function matchesKeyword(text, key, entry, substitute) {
    const keyword = substitute(key).trim();
    if (!keyword) return false;
    const regex = worldInfo.parseRegexFromString(keyword);
    if (regex) return regex.test(text);
    const caseSensitive = entry.caseSensitive ?? worldInfo.world_info_case_sensitive;
    const needle = caseSensitive ? keyword : keyword.toLowerCase();
    const haystack = caseSensitive ? text : text.toLowerCase();
    const wholeWords = entry.matchWholeWords ?? worldInfo.world_info_match_whole_words;
    if (!wholeWords || /\s/.test(needle)) return haystack.includes(needle);

    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`).test(haystack);
}

function matchesEntry(entry, scan, substitute) {
    if (entry.decorators?.includes('@@activate')) return true;
    if (entry.decorators?.includes('@@dont_activate')) return false;
    if (entry.constant) return true;

    const depth = entry.scanDepth ?? worldInfo.world_info_depth;
    const text = scan.slice(0, Math.max(0, depth)).join('\n');
    const matches = key => matchesKeyword(text, key, entry, substitute);
    if (!entry.key?.some(matches)) return false;
    if (!entry.selective || !entry.keysecondary?.length) return true;

    switch (Number(entry.selectiveLogic)) {
        case 1: return !entry.keysecondary.every(matches);
        case 2: return !entry.keysecondary.some(matches);
        case 3: return entry.keysecondary.every(matches);
        default: return entry.keysecondary.some(matches);
    }
}

async function collectLorebook(context, target, previous, mode) {
    // Resolve names without evaluating macros that can change chat variables.
    const substitute = text => text.replace(/{{\s*(char|user)\s*}}/gi, (match, key) =>
        (key.toLowerCase() === 'char' ? context.name2 : context.name1) || match);
    const scan = [target, ...previous.slice(-LOREBOOK_SCAN_DEPTH).reverse()]
        .filter(message => !message.is_system)
        .map(message => worldInfo.world_info_include_names && message.name
            ? `${message.name}: ${message.mes ?? ''}`
            : String(message.mes ?? ''));
    const character = context.characters?.[context.characterId];
    const avatar = target.original_avatar ?? character?.avatar;
    const filename = avatar ? getCharaFilename(null, { manualAvatarKey: avatar }) : null;
    const tags = context.tagMap?.[avatar] ?? [];
    const entries = await worldInfo.getSortedEntries();
    const lorebook = [];
    const seen = new Set();
    let remaining = LOREBOOK_BUDGET;

    for (const entry of entries) {
        const id = JSON.stringify([entry.world, entry.uid]);
        if (entry.disable || !entry.content?.trim() || seen.has(id)) continue;
        const filter = entry.characterFilter;
        if (filter?.names?.length && filter.names.includes(filename) === !!filter.isExclude) continue;
        if (filter?.tags?.length && tags.some(tag => filter.tags.includes(tag)) === !!filter.isExclude) continue;
        if (mode !== 'all' && !matchesEntry(entry, scan, substitute)) continue;

        const content = substitute(entry.content).trim();
        if (!content) continue;
        const excerpt = clip(content, Math.min(2400, remaining));
        lorebook.push(excerpt);
        seen.add(id);
        remaining -= excerpt.length;
        if (remaining < 120) break;
    }
    return lorebook;
}

export async function buildTranslationContext(context, settings, messageId, source, speaker, language, getCache) {
    const message = Number.isInteger(messageId) ? context.chat?.[messageId] : null;
    const previous = message ? context.chat.slice(Math.max(0, messageId - LOREBOOK_SCAN_DEPTH), messageId) : [];
    const reference = {};
    const rules = context.chatMetadata?.if_combo_translator_pronouns;
    if (typeof rules === 'string' && rules.trim()) {
        reference.pronounRules = clip(rules.trim(), MAX_PRONOUN_RULES);
    }

    if (settings.includeChatHistory || settings.includePreviousTranslations) {
        const history = collectHistory(previous, settings, language, getCache);
        if (history.length) reference.history = history;
    }

    if (settings.includeLorebook) {
        const target = { name: speaker, mes: message?.mes ?? source, original_avatar: message?.original_avatar };
        const lorebook = await collectLorebook(context, target, previous, settings.lorebookMode);
        if (lorebook.length) reference.lorebook = lorebook;
    }

    if (!Object.keys(reference).length) return '';
    if (speaker) reference.currentSpeaker = speaker;
    return JSON.stringify(reference);
}
