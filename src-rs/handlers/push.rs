use serde_json::json;
use vercel_runtime::{Body, Error, Response};

use crate::{types::Push, utils::send_json};

pub async fn handle(push: Push) -> Result<Response<Body>, Error> {
    let mut description = format!(
        "<:_:962379954241273946> {name} pushed {amount} commit{s}\n",
        name = push.pusher.name,
        amount = push.commits.len(),
        s = if push.commits.is_empty() { "" } else { "s" }
    );

    for commit in &push.commits {
        description.push_str(&format!(
            "\n<:_:962380103214587904> `{id}` ({name}) - {message}\n",
            id = &commit.id[..7],
            name = commit.author.username,
            message = commit.message
        ));

        for (name, prop) in [
            ("Added", &commit.added),
            ("Removed", &commit.removed),
            ("Modified", &commit.modified),
        ] {
            if !prop.is_empty() {
                description.push_str(&format!("**{name}**\n`{list}`\n", list = prop.join(",")));
            }
        }
    }

    description = description.trim().to_owned();
    if description.len() > 4096 {
        description = description[..4093].to_owned();
        description += "..."
    }

    let embed = json!({
        "username": push.sender.login,
        "avatar_url": push.sender.avatar_url,
        "embeds": [
            {
                "description": description,
                "timestamp": push.commits.last().map(|commit| &commit.timestamp as &str).unwrap_or("0000-01-01T00:00:00+0000"),
                "footer": {
                    "text": "Cat University",
                    "icon_url": "https://cdn.discordapp.com/icons/886481241656922122/13b5042baf7568ddd31ecc36611fbe1d.png",
                },
            },
        ],
        "components": [
            {
                "type": 1,
                "components": [
                    {
                        "type": 2,
                        "label": "View Commit",
                        "url": push.head_commit.url,
                        "style": 5,
                    },
                ],
            },
        ],
    }).to_string();

    Ok(send_json(&embed).await?)
}
