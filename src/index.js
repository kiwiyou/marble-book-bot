import Config from 'config'
import path from 'path'
import Telegraf from 'telegraf'
import TelegrafI18n from 'telegraf-i18n'
import TelegrafSession from 'telegraf/session'
import { Riksdb, Zdic } from './dictionary'
import { getCodePoint, GlyphRenderer } from './util'

const bot = new Telegraf(Config.get('Bot.token'))
const i18n = new TelegrafI18n({
    defaultLanguage: 'en',
    allowMissing: true,
    directory: path.resolve(__dirname, '../locales'),
    useSession: true,
})
const userLang = {}

const answerTimeout = Config.get('Bot.answerTimeout')
bot.use(TelegrafSession())
bot.use(i18n.middleware())
bot.use((ctx, next) => {
    if (!answerTimeout || !ctx.message) {
        return next()
    } else {
        const delay = Date.now() / 1000 - ctx.message.date
        if (delay <= answerTimeout) {
            return next()
        }
    }
})
bot.use((ctx, next) => {
    ctx.lang = userLang[ctx.from.id] || ctx.from.language_code
    return next()
})

const commands = Config.get("Bot.command")

const riksdb = new Riksdb()
const zdic = new Zdic()
function buildDictionary(letter) {
    return Telegraf.Extra
        .markdown()
        .markup((m) => m.inlineKeyboard([
            m.callbackButton('Riksdb', 'riks_' + letter),
            m.callbackButton('Zdic', 'zdic_' + letter),
        ]))
}
bot.hears(new RegExp('^' + commands + '\\s+(\\D{1,2})$'), (ctx) => {
    const character = ctx.match[1]
    return ctx.reply(i18n.t(ctx.lang, 'search.select-dic'), buildDictionary(character))
})
bot.hears(new RegExp('^' + commands + '\\s+(\\d+)$'), (ctx) => {
  const index = parseInt(ctx.match[1]) - 1
  const reply = ctx.message.reply_to_message.text
  if(index < 0 || index >= reply.length) return
  const character = reply.charAt(index)
  return ctx.reply(i18n.t(ctx.lang, 'search.select-dic'), buildDictionary(character))
})

const localeMenu = Telegraf.Extra
    .markdown()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('🇨🇳', 'lang_cn'),
        m.callbackButton('🇭🇰', 'lang_hk'),
        m.callbackButton('🇯🇵', 'lang_jp'),
        m.callbackButton('🇰🇷', 'lang_kr'),
        m.callbackButton('🇹🇼', 'lang_tw'),
        m.callbackButton('🇺🇸', 'lang_en'),
    ]))
bot.command('lang', (ctx) => {
    return ctx.reply(i18n.t(ctx.lang, 'lang.ask'), localeMenu)
})

bot.action(/^lang_(..)$/, (ctx) => {
    const { from, match } = ctx
    let lang = 'en'
    switch (match[1]) {
        case 'cn':
            lang = 'zh_CN'
            break;
        case 'hk':
            lang = 'zh_HK'
            break;
        case 'jp':
            lang = 'ja_JP'
            break;
        case 'kr':
            lang = 'ko_KR'
            break;
        case 'tw':
            lang = 'zh_TW'
            break;
    }
    userLang[from.id] = lang
    return ctx.editMessageText(i18n.t(lang, 'lang.changed', { lang }))
})

const glyphRenderer = new GlyphRenderer()
glyphRenderer.size = Config.get('Bot.fontSize')
bot.action(/^riks_(.{1,2})$/, async (ctx) => {
    const { match, lang } = ctx
    const character = getCodePoint(match[1])
    console.log(`Request U+${character.toString(16).toUpperCase().padStart(4, '0')}, Locale ${lang}`)
    try {
        const result = await riksdb.findByUnicode(character)
        if (result) {
            const [rendered, message] = await Promise.all([glyphRenderer.render(match[1]), ctx.replyWithPhoto('https://i.ibb.co/9TCF0WZ/loading.png', {
                caption: i18n.t(lang, 'search.riksdb', result),
            })])
            await ctx.deleteMessage()
            return ctx.telegram.editMessageMedia(ctx.chat.id, message.message_id, null, {
                type: 'photo',
                media: {
                    source: rendered,
                },
                caption: i18n.t(lang, 'search.riksdb', result),
            })
        } else {
            return ctx.editMessageText(i18n.t(lang, 'search.no-result'))
        }
    } catch (err) {
        return ctx.editMessageText(i18n.t(lang, 'error', { err }), Telegraf.Extra.HTML())
    }
})

bot.action(/^zdic_(.{1,2})$/, async (ctx) => {
    const { match, lang } = ctx
    const character = Array.from(match[1])[0]
    const unicode = getCodePoint(Array.from(match[1])[0])
    console.log(`Request ${character}(U+${unicode.toString(16).toUpperCase().padStart(4, '0')}), Locale ${lang}`)
    try {
        const result = await zdic.findByCharacter(character)
        if (result) {
            const [rendered, message] = await Promise.all([glyphRenderer.render(match[1]), ctx.replyWithPhoto('https://i.ibb.co/9TCF0WZ/loading.png', {
                caption: i18n.t(lang, 'search.zdic', result),
            })])
            await ctx.deleteMessage()
            return ctx.telegram.editMessageMedia(ctx.chat.id, message.message_id, null, {
                type: 'photo',
                media: {
                    source: rendered,
                },
                caption: i18n.t(lang, 'search.zdic', result),
            })
        } else {
            return ctx.editMessageText(i18n.t(lang, 'search.no-result'))
        }
    } catch (err) {
        return ctx.editMessageText(i18n.t(lang, 'error', { err }), Telegraf.Extra.HTML())
    }
})

bot.catch((err) => console.error(err))

bot.launch()
