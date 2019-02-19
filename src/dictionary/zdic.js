import _request from 'req-fast'
import Util from 'util'
import Cheerio from 'cheerio'
const request = Util.promisify(_request)

function Zdic() {
    let sessionId = ''
    this.findByCharacter = async (character) => {
        const option = {
            url: "http://www.zdic.net/sousuo/",
            method: 'GET',
            data: {
              q: character,
            },
            cookies: {
                'JSESSIONID': sessionId
            }
        }
        const response = await request(option)
        if (response.cookies['JSESSIONID']) {
            sessionId = response.cookies['JSESSIONID']
            return await this.findByUnicode(unicode)
        }
        if (response.statusCode !== 200) {
            throw new Error(`Zdic returned HTTP ${response.statusCode}.`)
        } else {
            const $ = Cheerio.load(response.body)
            const chinese = $('div.tab-page > p').map((i, e) => $(e).text()).get()
            const forward = chinese.filter(e => e.startsWith('　◎ 见'))
            if(forward.length == 1) return this.findByCharacter(forward.join().slice(5, 6))
            else return {
                pinyin: $('span.dicpy > a').eq(0).text(),
                zhuyin: $('span.dicpy > a').eq(1).text(),
                wubi: $('td.z_i_t4 > span').eq(0).text(),
                cangjie: $('td.z_i_t4 > span').eq(1).text(),
                chinese: '\n' + chinese.filter(e => e.startsWith('　') && !e.startsWith('　◎')).join('\n'),
            }
        }
    }
}

export default Zdic
