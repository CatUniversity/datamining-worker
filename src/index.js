const { formatString } = require('./markdown.js')

// Random emojis, just for fun
const emojis = [
    '<:WumpusHead:961561557022670848>',
    '<:WumpusMelt:961561720713805845>',
    '<:WumpusPencil:961561819653234688>',
    '<:WumpusPopcorn:961561898304806934>',
    '<:WumpusShrimp:961562016470949908>',
    '<:WumpusStar:961562151934394388>',
    '<:WumpusSticker:961562224516825098>',
    '<:Radio:961595797890273341>',
]

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
    const url = new URL(request.url)
    const params = new URLSearchParams(url.search)

    // Not really necessary, unless someone makes a manual request
    if (request.method !== 'POST') return new Response('', { status: 405 })

    // Same as above, also used to verify if the request is from github,
    // not the most elegant way but meh
    if (request.headers.get('X-GitHub-Event') !== 'commit_comment')
        return new Response('', { status: 200 })

    // And ofc how can we forget the webhook url, isnt really limited to
    // discord webhoook url but the body we return is in discord's format
    if (!params.has('h'))
        return new Response('No webhook url found', { status: 400 })

    // Creating the body
    const json = await request.json()
    const data = await buildResponseJSON(json.comment)

    // Finally send!
    return fetch(params.get('h'), {
        method: 'POST',
        body: data,
    })
}

/**
 * Builds the response JSON
 * @param {any} comment
 * @returns {FormData}
 */
async function buildResponseJSON(comment) {
    let formData = new FormData()
    let attachments = []

    let [content, media] = formatString(comment.body, {
        Strings: '<:Sticker:961596009924923413> Strings',
        'Added Experiments': '<:Backpack:961660535718420490> Added Experiments',
        'Removed Experiments':
            '<:Backpack:961660535718420490> Removed Experiments',
        'Updated Experiments':
            '<:Backpack:961660535718420490> Updated Experiments',
    })

    if (media.length > 0) {
        media = media.slice(0, 10)

        for (let index = 0; index < media.length; index++) {
            const url = media[index];
            let res = await fetch(url)
            let data = await res.blob()
            let name = url.split('/').pop()

            formData.append(`files[${index}]`, data, name)
            attachments.push({
                id: index,
                filename: name,
            })
        }
    }

    // The description of the main embed
    const rEmoji = emojis[~~(Math.random() * emojis.length)]
    const rTitle = `${rEmoji} New comment on \`${comment.commit_id}\`${media.length > 0
        ? '\n<:MesssageAttachment:961660264917368873> Attachments included'
        : ''
        }\n\n`

    // Trim to 4096 chars
    content =
        rTitle +
        (content.length > 4096 - rTitle.length
            ? content.substring(0, 4090 - rTitle.length) + '...```'
            : content)

    // Final payload
    let payload = {
        username: comment.user.login,
        avatar_url: comment.user.avatar_url,
        embeds: [
            {
                description: content,
                timestamp: comment.created_at,
                footer: {
                    text: 'Otter & Cat Universities',
                    icon_url:
                        'https://cdn.discordapp.com/emojis/940320300132888586.png',
                },
            },
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: 'View Comment',
                        url: comment.html_url,
                        style: 5,
                    },
                ],
            },
        ],
    }

    if (attachments.length > 0) {
        payload.attachments = attachments
    }

    formData.append('payload_json', JSON.stringify(payload))

    // Convert to JSON
    return formData
}
