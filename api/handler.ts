import fetch from "cross-fetch";

const EMOJIS = [
    '<:WumpusHead:961561557022670848>',
    '<:WumpusMelt:961561720713805845>',
    '<:WumpusPencil:961561819653234688>',
    '<:WumpusPopcorn:961561898304806934>',
    '<:WumpusShrimp:961562016470949908>',
    '<:WumpusStar:961562151934394388>',
    '<:WumpusSticker:961562224516825098>',
    '<:Radio:961595797890273341>',
]

const TITLE_EMOJIS = {
    Strings: "<:Sticker:961596009924923413>",
    "Added Experiments": "<:Backpack:961660535718420490>",
    "Removed Experiments": "<:Backpack:961660535718420490>",
    "Updated Experiments": "<:Backpack:961660535718420490>",
}

function formatComment(comment: string): [string, Array<string>] {
    let mediaLinks = []
    comment = comment.replace(/^#{1,6} (.*)/g, (_, p1) => {
        return `**${TITLE_EMOJIS[p1] + " " || ""}${p1}**`
    })
    let urls = comment.match(/https?:\/\/[^`\n\s]+?\.(?:png|jpg|jpeg|webp|svg|mp4|gif)/g)
    urls ? urls.forEach(url => {
        mediaLinks.push(
            url.endsWith('svg')
                ? `https://util.bruhmomentlol.repl.co/svg?q=${url}`
                : url,
        )
    }) : null
    return [comment, mediaLinks]
}

export async function handleComment(data: any, urls: Array<string>) {
    let response: any = {
        username: data.user.login,
        avatar_url: data.user.avatar_url,
        embeds: [
            {
                description: `${EMOJIS[~~(Math.random() * EMOJIS.length)]} New comment on \`${data.commit_id}\``,
                timestamp: data.created_at,
                footer: {
                    text: 'Cat University',
                    icon_url:
                        'https://cdn.discordapp.com/avatars/890186631645106197/3a064ad5e211e2aaac80352313a12b97.png',
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
                        url: data.html_url,
                        style: 5,
                    },
                ],
            },
        ],
    }

    let [comment, mediaLinks] = formatComment(data.body);

    if (mediaLinks.length > 0) {
        response.embeds[0].description += "\n<:MesssageAttachment:961660264917368873> Attachments included"
        mediaLinks = mediaLinks.slice(0, 10)

        for (const url of mediaLinks) {
            response.embeds.push({
                image: {
                    url
                }
            })
        }
    }

    // Theres probably a better way to do this

    response.embeds[0].description += `\n\n${comment}`
    response.embeds[0].description.trim()
    response.embeds[0].description = response.embeds[0].description.length > 4096 ? response.embeds[0].description.substring(0, 4090) + "...```" : response.embeds[0].description;

    let to_send = JSON.stringify(response);

    for (const url of urls) {
        console.log(`Sending FormData to ${url}`)
        let res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: to_send,
        })
        console.log(`status: ${res.status}
ratelimit-limit: ${res.headers.get("X-Ratelimit-Limit")}
ratelimit-remaining: ${res.headers.get("X-Ratelimit-Remaining")}
ratelimit-reset: ${res.headers.get("X-Ratelimit-Reset")}
ratelimit-reset-after: ${res.headers.get("X-Ratelimit-Reset-After")}`)
    }
}

export async function handleCommit(data: any, urls: Array<string>) {
    let response = {
        username: data.sender.login,
        avatar_url: data.sender.avatar_url,
        embeds: [
            {
                description: "",
                timestamp: "",
                footer: {
                    text: 'Cat University',
                    icon_url:
                        'https://cdn.discordapp.com/avatars/890186631645106197/3a064ad5e211e2aaac80352313a12b97.png',
                },
            },
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: 'View Commit',
                        url: data.head_commit.url,
                        style: 5,
                    },
                ],
            },
        ],
    }

    let description = `<: push: 962379954241273946 > ${data.pusher.name} pushed ${data.commits.length} commit${data.commits.length > 1 ? "s" : ""}\n`;
    let created_at: string;

    data.commits.forEach((commit, index: number) => {
        description += `\n <: diff: 962380103214587904 > \`${commit.id.slice(0, 7)}\` (${commit.author.username}) - ${commit.message}\n`
        commit.added.length > 0 ? (description += `**Added**:\n\`${commit.added.join(',')}\`\n`) : null
        commit.removed.length > 0 ? (description += `**Removed**:\n\`${commit.removed.join(',')}\`\n`) : null
        commit.modified.length > 0 ? (description += `**Modified**:\n\`${commit.modified.join(',')}\`\n`) : null

        if (index === data.commits.length - 1) {
            created_at = (new Date(commit.timestamp)).toISOString();
        }
    });

    description = description.trim()
    description = description.length > 4096 ? description.slice(0, 4093) + '...' : description;

    response.embeds[0].description = description;
    response.embeds[0].timestamp = created_at;

    let to_send = JSON.stringify(response);

    for (const url of urls) {
        console.log(`Sending ${to_send} to ${url}`)
        let res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: to_send,
        })
        console.log(`status: ${res.status}
ratelimit-limit: ${res.headers.get("X-Ratelimit-Limit")}
ratelimit-remaining: ${res.headers.get("X-Ratelimit-Remaining")}
ratelimit-reset: ${res.headers.get("X-Ratelimit-Reset")}
ratelimit-reset-after: ${res.headers.get("X-Ratelimit-Reset-After")}`)
    }
}