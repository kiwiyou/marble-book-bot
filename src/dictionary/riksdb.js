import _request from 'req-fast'
import Util from 'util'
const request = Util.promisify(_request)

function Riksdb() {
    let sessionId = ''
    this.findByUnicode = async (unicode) => {
        const option = {
            url: "http://riksdb.korea.ac.kr/supercjk/jsp/getHanjaInfo.jsp",
            method: 'POST',
            dataType: 'form',
            data: {
                ucode: unicode.toString(16).toUpperCase().padStart(5, '0')
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
            throw new Error(`Riksdb returned HTTP ${response.statusCode}.`)
        } else {
            const json = JSON.parse(response.body)
            if (Object.entries(json).length === 0) {
                return null
            }
            return {
                radical: json.radical,
                stroke: 1 * json.rstroke,
                korean: json.info_kr,
                pinyin: json.info_cn,
                on_reading: json.info_jp,
                english_meaning: json.info_en,
            }
        }
    }
}

export default Riksdb