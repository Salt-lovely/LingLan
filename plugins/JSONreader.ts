import { default as Bot } from "el-bot";
import { log } from "mirai-ts";
import { ChatMessage } from "mirai-ts/dist/types/message-type";
import fs from 'fs';
// import { Member } from 'mirai-ts/dist/types/contact'
// import { type } from "os";
interface Word {
    /**匹配 */
    match: string | string[] | RegExp,
    /**回应，可以是字符串数组，随机返回，这个是必须的 */
    reply: string | string[],
    /**午夜的回复 */
    midnight?: string | string[],
    /**早晨的回复 */
    morning?: string | string[],
    /**中午的回复 */
    noon?: string | string[],
    /**下午的回复 */
    afternoon?: string | string[],
    /**晚上的回复 */
    night?: string | string[],
    /**回复模式，0-直接发言 1-回复 2-at发言 */
    mode?: number,
    /**这个回复的类型 0-全测试 1-按一天中的时间段回复 2-按节假日回复 */
    type?: number,
    /**倾向 0-早晨 1-中午 2-下午 3-晚上 4-午夜 5-节日 */
    inclination?: number,
}

module.exports = function (ctx: Bot) {
    const mirai = ctx.mirai;
    const prefix = '[JSONreader]: '
    const debug = true
    const rawWords: Word[] = [
        {
            match: /^(小?铃兰酱?)?(早上?|上午)[安好]?[哦哟呀啊啦拉]?[！？~\!\?\.]?/,
            reply: ['早安', '早呀', '早上好', '新的一天也要加油鸭'],
            morning: ['早安~', '早呀~', '早上好~', '早安！', '早呀！', '早上好！', '新的一天也要加油鸭'],
            noon: ['现在是午安~', '中午好，RUA!', '现在是午饭时间哦', 'emmm，一觉起来都到午饭时间了'],
            afternoon: ['下午好', '已经下午啦', '现在该说下午好啦', '午饭时间早就过了，等晚饭啦'],
            night: ['emmm，晚上好', '都晚上了...', '现在该说晚上好了吧', '嘛，晚上好啦'],
        }, {
            match: /^(小?铃兰酱?)?晚上好?[哦哟呀啊啦拉]?[！？~\!\?\.]?/,
            reply: ['晚上好！', '已经这么晚啦', '晚上好，要早点睡哦', '晚上好呀'],
            morning: ['emmm，早安', '好像有点早...', '现在该说早上好吧', '有时差吗...'],
            noon: ['现在该说 午安~', '中午好~', '中午好，RUA!', '现在是午觉时间啦', '现在是午饭时间哦'],
            afternoon: ['下午好', '已经下午啦', '现在该说下午好啦', '现在可不是午觉时间啦'],
            night: ['晚上好！', '已经这么晚啦', '晚上好，要早点睡哦', '晚上好呀'],
        }, {
            match: /^(小?铃兰酱?)?晚安[呀啊啦拉]?([\,，~。]祝?你?做?一?个?好梦[哦哟呀啊啦拉]?)?[！？~\!\?\.]?/,
            reply: ['晚安啦~', '晚安，祝好梦~', '晚安，记得早点睡哦', '晚安，早睡早起呀']
        }, {
            match: /^(小?铃兰酱?)?(午安|中午好?)[哦哟呀啊啦拉]?[！？~\!\?\.]?/,
            reply: ['午安~', '中午好呀', '累的话就去睡午觉吧', '中午吃了好吃的吗'],
            morning: ['emmm，早安', '好像有点早...', '现在该说早上好吧', '有点早哦...'],
            noon: ['午安~', '中午好呀', '累的话就去睡午觉吧', '中午吃了好吃的吗'],
            afternoon: ['下午好', '已经下午啦', '现在该说下午好啦', '午饭时间早就过了，等晚饭啦'],
            night: ['emmm，现在是晚上好', '已经晚上了...', '现在该说晚安了吧', '午饭时间早就过了'],
        }, {
            match: /^(小?铃兰酱?)?(下午好?)[哦哟呀啊啦拉]?[！？~\!\?\.]?/,
            reply: ['下午好呀', '下午啦', '下午好，有睡午觉吗'],
            morning: ['emmm，早安', '好像有点早...', '现在该说早上好吧', '有时差吗...'],
            noon: ['午安~', '中午好呀', '累的话就去睡午觉吧', '中午吃了好吃的吗'],
            afternoon: ['下午好呀', '下午啦', '下午好，有睡午觉吗'],
            night: ['嘛，现在是晚上好', '已经晚上了...', '现在该说晚安了吧', '午饭时间早就过了'],
        }, {
            match: /^←_←$/,
            reply: '→_→',
            type: -1,
        }, {
            match: /^→_→$/,
            reply: '←_←',
            type: -1,
        }, {
            match: /^→_←$/,
            reply: '←_→',
            type: -1,
        }, {
            match: /^←_→$/,
            reply: '→_←',
            type: -1,
        },
    ]
    /**回复列表 */
    let words: Word[] = rawWords
    /**是否允许临时会话 */
    const allowTempmsg = false
    /**QQ群允许列表 */
    const premittedGroup = [221503191, 965684800]
    /**主人QQ */
    const master = [732237136,]
    /**读取JSON文件 */
    function ReloadJSON(callback?: () => void) {
        // 异步过程
        setTimeout(() => {
            let wordsFromFlie: Word[] = []
            // 获取文件 -> 循环读取文件 -> 循环读取JSON列表 -> 压入wordsFromFlie -> 更新words
            // 获取文件
            info('异步加载json')
            let jsonFiles = getJsonFiles(__dirname + '/JSONreader')
            // 循环读取文件
            jsonFiles.forEach(function (item, index) {
                info('读取json: ' + item)
                try {
                    let raw = fs.readFileSync(item)
                    // 循环读取JSON列表
                    let json: any[] = JSON.parse(raw.toString('utf-8'))
                    for (let j of json) {
                        // 压入wordsFromFlie
                        let w = formatWord(j)
                        if (w)
                            wordsFromFlie.push(w);
                    }
                    success('读取文件' + item)
                }
                catch (e) {
                    error('出错文件: ' + item)
                }
            })
            // 更新words
            words = [...rawWords, ...wordsFromFlie]
            success('语言库已更新')
            if (debug)
                for (let i of words)
                    console.log(i)
            // 回调函数
            if (callback)
                callback();
        }, 0)
        function formatWord(json: any): Word | null {
            // 必须要有 match 和 reply 两个属性
            if (typeof json.match == 'undefined' || typeof json.reply == 'undefined')
                return null;
            let m = guessArrayOrRegexp(json.match), r = guessArrayOrRegexp(json.reply)
            // reply 不能是regexp
            if (r instanceof RegExp)
                return null;
            let w: Word = { match: m, reply: r }
            // 尝试获取其他属性
            let prop: ('morning' | 'noon' | 'afternoon' | 'night' | 'midnight')[] = ['morning', 'noon', 'afternoon', 'night', 'midnight']
            for (let p of prop) {
                if (typeof json[p] != 'undefined') {
                    let x = guessArrayOrRegexp(json[p])
                    if (x && !(x instanceof RegExp))
                        w[p] = x
                }
            }
            let numprop: ('mode' | 'type' | 'inclination')[] = ['mode', 'type', 'inclination']
            for (let p of numprop) {
                if (typeof json[p] == 'number') {
                    w[p] = json[p]
                }
            }
            return w
        }
        function guessArrayOrRegexp(x: string): string | string[] | RegExp {
            if (/^\/.*\/$/.test(x))
                return RegExp(x.replace(/^\/|\/$/g, ''))
            if (/^\[.*\]$/.test(x)) {
                let arr: string[] = JSON.parse(x.replace(/\'/g, '"'))
                return arr
            }
            return x
        }
        /**读取目录中所有.json文件 */
        function getJsonFiles(jsonPath: string) {
            let jsonFiles: string[] = [];
            info('读取: ' + jsonPath)
            let files = fs.readdirSync(jsonPath);
            info('已获取: [' + files.join(', ') + ']')
            files.forEach(function (item, index) {
                let fPath = jsonPath + '/' + item;
                info('读取: ' + fPath)
                let stat = fs.statSync(fPath);
                if (stat.isFile() && /\.json$/i.test(item)) {
                    info('获取: ' + fPath)
                    jsonFiles.push(fPath);
                }
            });
            return jsonFiles
        }
    }
    /**主过程 */
    function onChat(msg: ChatMessage) {
        let id = msg.type
        // 主人发出的指令
        if (id == 'FriendMessage') {
            if (master.indexOf(msg.sender.id) != -1) {
                info('管理员' + msg.sender.id + '来信')
                switch (msg.plain) {
                    case 'JSONreader reload': case 'jsonreader reload': case '/JSONreader reload': case '/jsonreader reload':
                        ReloadJSON(() => {
                            msg.reply('已重新加载JSONreader语言库')
                        })
                        return // 直接退出
                    default:
                        break
                }
            } else {
                info('好友' + msg.sender.id + '来信')
            }
        }
        // 是否允许临时会话
        if (id == 'TempMessage' && !allowTempmsg) {
            info('陌生人' + msg.sender.id + '来信，已拒绝')
            return
        }
        // 检查是否在允许列表
        // @ts-ignore
        if (id == 'GroupMessage' && typeof msg.sender.group != 'undefined' && premittedGroup.indexOf(msg.sender.group.id) == -1) {
            // @ts-ignore
            info('陌生群' + msg.sender.group.id + '来信，已拒绝')
            return
        }
        // info('触发message事件')
        let match = matchString(msg.plain)
        if (!match)
            return;
        // 获取返回
        let rep: string | string[] = match.reply
        reply(randomChoice(rep), match.mode || 0, msg)
        info('已回复消息')
        if (msg.stopPropagation) {
            msg.stopPropagation()
            info('停止消息冒泡')
        }
    }
    /**
     * 匹配消息
     * @param str 消息文本
     */
    function matchString(str: string): Word | null {
        for (let x of words) {
            if (typeof x.match == 'undefined' || typeof x.reply == 'undefined') { continue }
            let match = x.match
            let reply = x.reply
            let mode = x.mode || 0
            if (match instanceof RegExp) {
                if (match.test(str))
                    return matchTime(x);
            } else if (match instanceof Array) {
                for (let s of match) {
                    if (str.indexOf(s))
                        return matchTime(x);
                }
            } else if (typeof match == 'string') {
                if (str.indexOf(match))
                    return matchTime(x);
            }
        }
        return null
    }
    /**
     * 匹配时间对应消息
     * @param x 返回的Word
     */
    function matchTime(x: Word): Word {
        let h = (new Date).getHours()
        let w: Word = { match: x.match, reply: '', mode: x.mode || 0 }
        let type = x.type || 0
        /**倾向 0-早晨 1-中午 2-下午 3-晚上 4-午夜 5-节日 */
        let i = x.inclination || 0
        if (type < 0) { // 类型小于 0 直接返回
            w.reply = x.reply
            return w
        }
        if ((type == 0 && i != 5) || type == 1) { // 类型为 1(按一天中的时间确认), 或 类型为 0
            switch (h) {
                case 22: case 23: case 0: case 1: case 2:
                    // 午夜 或 夜晚
                    if (i == 3) { // 3-倾向于夜晚
                        w.reply = x.night || x.midnight || x.reply
                    } else {
                        w.reply = x.midnight || x.night || x.reply
                    }
                    break
                case 3: case 4:
                    // 午夜或早晨
                    if (i == 4) { // 4-倾向于午夜
                        w.reply = x.midnight || x.morning || x.reply
                    } else {
                        w.reply = x.morning || x.midnight || x.reply
                    }
                    break
                case 5: case 6: case 7: case 8: case 9:
                    // 早晨
                    w.reply = x.morning || x.reply
                    break
                case 10:
                    // 早晨或中午
                    if (i == 0) { // 0-倾向于早晨
                        w.reply = x.morning || x.noon || x.reply
                    } else {
                        w.reply = x.noon || x.morning || x.reply
                    }
                    break
                case 11: case 12: case 13:
                    // 中午
                    w.reply = x.noon || x.reply
                    break
                case 14:
                    // 中午或下午
                    if (i == 1) { // 1-倾向于中午
                        w.reply = x.noon || x.afternoon || x.reply
                    } else {
                        w.reply = x.afternoon || x.noon || x.reply
                    }
                    break
                case 15:
                case 16:
                    // 下午
                    w.reply = x.afternoon || x.reply
                    break
                case 17:
                    // 下午或晚上
                    if (i == 2) { // 2-倾向于下午
                        w.reply = x.afternoon || x.night || x.reply
                    } else {
                        w.reply = x.night || x.afternoon || x.reply
                    }
                    break
                case 18:
                case 19:
                case 20:
                case 21:
                    // 晚上
                    w.reply = x.night || x.reply
                    break
                default:
                    w.reply = x.reply
            }
        }
        if (type == 0 || type == 2) {
            // 节假日
        }
        return w
    }
    /**
     * 随机抽取数组中的一个元素返回
     * @param str 数组
     */
    function randomChoice<T>(str: T | T[]): T {
        if (str instanceof Array)
            return str[Math.floor(Math.random() * str.length)];
        return str
    }
    /**
     * 回复
     * @param str 要回复的内容
     * @param mode 0-直接发言 1-回复 2-at发言
     * @param msg ChatMessage 实例
     */
    function reply(str: string, mode: number, msg: ChatMessage) {
        switch (mode) {
            case 1:
                msg.reply(str, true)
                break
            case 2:
                msg.reply(str, true)
                break
            default:
                msg.reply(str, false)
        }
    }
    info(__dirname)
    info('监听消息事件')
    mirai.on("message", onChat);
    info('加载JSON')
    ReloadJSON()
    function success(msg: string | number) { log.success(prefix + msg) }
    function warn(msg: string | number) { log.warning(prefix + msg) }
    function error(msg: string | number) { log.error(prefix + msg) }
    function info(msg: string | number) { if (debug) log.info(prefix + msg) }
}
