import path from 'path'
import text2png from 'text2png'

function getCodePoint(string) {
    let high = string.charCodeAt(0)
    if (high < 0xD800) {
        return string.charCodeAt(0)
    } else {
        let high = string.charCodeAt(0)
        let low = string.charCodeAt(1)
        return (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000
    }
}

function GlyphRenderer() {
    const hanazono = ['HanaMinA.ttf', 'HanaMinB.ttf']
    let fontSize = 256
    Object.defineProperty(this, 'size', {
        set: (val) => {
            fontSize = Math.max(val, 1)
        },
        get: () => fontSize
    })
    this.render = (letter) => {
        const usable = letter.length == 2 ? hanazono[1] : hanazono[0]
        return new Promise(resolve => {
            const result = text2png(letter, {
                font: `${fontSize}px _RenderFont`,
                localFontPath: path.resolve(__dirname, '../fonts/' + usable),
                localFontName: '_RenderFont',
                backgroundColor: 'white',
                output: 'buffer',
            })
            resolve(result)
        })
    }
}

export {getCodePoint, GlyphRenderer}
