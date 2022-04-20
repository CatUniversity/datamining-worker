const { formatString } = require('./markdown.js')

const webhooks = JSON.parse(WEBHOOK_URLS)
const auth = AUTHKEY

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
    event.respondWith(handleRequestWithCatch(event.request))
})

/**
 * Respond with appropriate data
 * @param {Request} request
 */
async function handleRequestWithCatch(request) {
    try {
        return await handleRequest(request)
    } catch (e) {
        console.error(e)
        return new Response(`Error: ${e}`, { status: 500 })
    }
}

/**
 * Respond with appropriate data
 * @param {Request} request
 */
async function handleRequest(request) {
    let { pathname } = new URL(request.url)

    if (pathname === '/webhooks') {
        if (request.headers.get('Authorization') !== auth) {
            return new Response('Unauthorized', { status: 401 })
        }

        if (request.method === 'GET') {
            return new Response(WEBHOOK_URLS, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        }
        return new Response('Method not allowed', { status: 405 })
    }

    // Not really necessary, unless someone makes a manual request
    if (request.method !== 'POST')
        return new Response('Method not allowed', { status: 405 })

    // Determine what and how to send
    // 'commit_comment' -> form data with parsed images if present
    // 'push' -> form data but less complex
    let json = await request.json()

    if (json.repository.full_name !== 'Discord-Datamining/Discord-Datamining') {
        return new Response('Not for this repo, please dont abuse the worker', {
            status: 403,
        })
    }

    let data
    ghEvent = request.headers.get('X-GitHub-Event')
    if (ghEvent === 'commit_comment') {
        data = await buildCommentResponseData(json.comment)
    } else if (ghEvent === 'push') {
        data = buildCommitResponseData(json)
    } else {
        return new Response('Unsupported event', { status: 501 })
    }

    return await sendData(data)
}

async function sendData(data) {
    let failed = {}
    webhooks.forEach(async (webhook, i) => {
        let res = await fetch(webhook, {
            method: 'POST',
            body: data,
        })
        let text = await res.text()
        if (!res.ok) {
            console.error(
                `Error sending to ${webhook}, status: ${res.status}, reason: ${text}`,
            )
            failed[`webhook-${i}`] = { status: res.status, text }
        }
    })

    failed = JSON.parse(failed)

    if (failed !== '{}') {
        return new Response(failed, { status: 500 })
    }

    return new Response('Success', { status: 200 })
}

/**
 * Builds the response JSON
 * @param {any} comment
 * @returns {FormData}
 */
async function buildCommentResponseData(comment) {
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
            const url = media[index]
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
            ? content.slice(0, 4090 - rTitle.length) + '...```'
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

    return formData
}

function buildCommitResponseData(json) {
    let formData = new FormData()
    let description = `<:push:962379954241273946> ${json.pusher.name} pushed ${json.commits.length} commit(s)\n`
    let created_at
    json.commits.forEach((commit, index) => {
        description += `\n<:diff:962380103214587904> \`${commit.id.slice(
            0,
            7,
        )}\` (${commit.author.username}) - ${commit.message}\n`
        commit.added.length > 0
            ? (description += `**Added**:\n\`${commit.added.join(',')}\`\n`)
            : null
        commit.removed.length > 0
            ? (description += `**Removed**:\n\`${commit.removed.join(',')}\`\n`)
            : null
        commit.modified.length > 0
            ? (description += `**Modified**:\n\`${commit.modified.join(
                ',',
            )}\`\n`)
            : null
        if (index === json.commits.length - 1) {
            created_at = commit.timestamp
        }
    })
    description =
        description.trim().length > 4096
            ? description.trim().slice(0, 4096)
            : description.trim()

    created_at = new Date(created_at)

    formData.append(
        'payload_json',
        JSON.stringify({
            username: json.sender.login,
            avatar_url: json.sender.avatar_url,
            embeds: [
                {
                    description,
                    timestamp: created_at.toISOString(),
                    footer: {
                        text: 'Otter & Cat Universities',
                        icon_url:
                            'https://cdn.discordapp.com/emojis/940320300132888586.png',
                    },
                },
            ],
        }),
    )

    return formData
}
