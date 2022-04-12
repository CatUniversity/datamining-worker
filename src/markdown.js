/**
 * REGEX HELL
 */

Object.defineProperty(exports, '__esModule', { value: true })

const regexHell = {
    heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(\n+|$)/gm,
    url: /https?:\/\/[^`\n\r\n\t\f\v ]+\.(?:png|jpg|jpeg|webp|svg|mp4|gif)(?:\b|])/g,
    codeBlock: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(\n+|$)/gm,
    codeInline: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/gm,
}

/**
 * Extract media links, and also some other manipulations with the
 * string & return it.
 * @param {String} src
 * @param {any} headings
 * @returns {Array<String, Array<String>>}
 */
function formatString(src, headings) {
    headings = headings || {}
    let mediaLinks = []
    let ignore = {}

    let formattedString = src
        .replace(regexHell.codeBlock, (match, _1, _2, _3, p4) => {
            idx =
                Object.keys(ignore).length +
                '_suffixToNotCauseIssuesWithNormalData_' +
                ~~(Math.random() * 100)
            ignore[idx] = match.slice(0, match.length - p4.length)
            return (idx += p4)
        })
        .replace(regexHell.codeInline, match => {
            idx =
                Object.keys(ignore).length +
                '_suffixToNotCauseIssuesWithNormalData_' +
                ~~(Math.random() * 100)
            ignore[idx] = match
            return idx
        })
        .replace(regexHell.heading, (_m, _1, p2, p3) => {
            return `**${headings[p2.trim()] || p2.trim()}**${p3}`
        })

    let urls = formattedString.match(regexHell.url)
    urls
        ? urls.forEach(url => {
            mediaLinks.push(
                url.endsWith('svg')
                    ? `https://util.bruhmomentlol.repl.co/svg?q=${url}`
                    : url,
            )
        })
        : null

    Object.keys(ignore).forEach(key => {
        formattedString = formattedString.replace(key, ignore[key])
    })

    return [formattedString, mediaLinks]
}

exports.formatString = formatString
