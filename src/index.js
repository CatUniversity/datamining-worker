const { formatString } = require('./markdown.js')

const webhooks = JSON.parse(WEBHOOK_URLS);

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
 * Respond with appropriate data
 * @param {Request} request
 */
async function handleRequest(request) {
    // Not really necessary, unless someone makes a manual request
    if (request.method !== 'POST')
        return new Response('Method not allowed', { status: 405 })

    // Determine what and how to send
    // 'commit_comment' -> form data
    // 'push' aka commit -> normal json
    let json
    switch (request.headers.get('X-GitHub-Event')) {
        case 'commit_comment':
            // Creating the body
            json = await request.json()

            // Finally send!
            return await sendData(await buildResponseFormData(json.comment))
        case 'push':
            // Since this is a simple embed, we don't need a separate
            // function to form the body

            json = await request.json()

            let description = `<:push:962379954241273946> ${json.pusher.name} pushed ${json.commits.length} commit(s) to \`${json.repository.full_name}\`\n`
            let created_at
            json.commits.forEach((commit, index) => {
                description += `\n<:diff:962380103214587904> \`${commit.id.substring(
                    0,
                    7,
                )}\` (${commit.author.username}) - ${commit.message}`
                commit.added.length > 0
                    ? (description += `Added:\n${commit.added.join('\n- ')}\n`)
                    : null
                commit.removed.length > 0
                    ? (description += `Removed:\n${commit.removed.join(
                        '\n- ',
                    )}\n`)
                    : null
                commit.modified.length > 0
                    ? (description += `Modified:\n${commit.modified.join(
                        '\n- ',
                    )}\n`)
                    : null
                if (index === json.commits.length - 1) {
                    created_at = commit.timestamp
                }
            })
            description =
                description.length > 4096
                    ? description.substring(0, 4096)
                    : description
            return await sendData(JSON.stringify({
                username: json.sender.login,
                avatar_url: json.sender.avatar_url,
                embeds: [
                    {
                        description: description,
                        timestamp: created_at,
                        footer: {
                            text: 'Otter & Cat Universities',
                            icon_url:
                                'https://cdn.discordapp.com/emojis/940320300132888586.png',
                        },
                    },
                ],
            }))
        default:
            return new Response('Unsupported event', { status: 200 })
    }
}

async function sendData(data) {
    webhooks.forEach(async webhook => {
        await fetch(webhook, {
            method: 'POST',
            body: data,
        })
    })
}

/**
 * Builds the response JSON
 * @param {any} comment
 * @returns {FormData}
 */
async function buildResponseFormData(comment) {
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
