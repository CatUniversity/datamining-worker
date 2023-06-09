use itertools::Itertools;
use once_cell::sync::Lazy;
use regex::{Captures, Regex};
use serde_json::json;
use vercel_runtime::{Body, Error, Response, StatusCode};

use crate::{
    types::{Comment, InnerComment},
    utils::{create_message, get_random_emoji, send_json, CLIENT},
};

const HEADINGS: Lazy<Regex> = Lazy::new(|| Regex::new(r#"(^#{1,6})\s+(.+)"#).unwrap());
const MEDIA: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"https?://[^\n\s]+?\.(?:png|jpg|jpeg|webp|svg|mp4|gif)"#).unwrap());

pub async fn handle(comment: Comment) -> Result<Response<Body>, Error> {
    let body = comment.comment.body;

    let formatted_body = HEADINGS.replace_all(&body, |caps: &Captures| {
        let content = match &caps[2] {
            "Strings" => "<:_:961596009924923413> Strings",
            "Added Experiments" => "<:_:961660535718420490> Added Experiments",
            "Removed Experiments" => "<:_:961660535718420490> Removed Experiments",
            "Updated Experiments" => "<:_:961660535718420490> Updated Experiments",
            other => other,
        };

        if caps[1].len() > 3 {
            format!("**{content}**")
        } else {
            format!("{octothorpes} {content}", octothorpes = &caps[1])
        }
    });

    let mut description = format!(
        "{emoji} New comment on `{id}`\n\n{formatted_body}",
        emoji = get_random_emoji(),
        id = &comment.comment.commit_id[..7]
    );

    description = description.trim().to_owned();
    if description.len() > 4096 {
        description = description[..4093].to_owned();
        description += "..."
    }

    let mut inner_embeds = vec![json!({
        "description": description,
        "timestamp": comment.comment.created_at,
        "footer": {
            "text": "Cat University",
            "icon_url":
                "https://cdn.discordapp.com/icons/886481241656922122/13b5042baf7568ddd31ecc36611fbe1d.png",
        },
    })];

    // Parsing media urls in the html form is much more sane
    let html_comment = CLIENT
        .get(comment.comment.url)
        .header("Accept", "application/vnd.github.html+json")
        .send()
        .await?
        .json::<InnerComment>()
        .await?;

    for mat in MEDIA.find_iter(&html_comment.body_html).take(9).dedup() {
        let url = mat.as_str();
        let name = match url.split("/").last() {
            Some(n) => n,
            None => {
                return Ok(create_message(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Unreachable. Media link found in comment but unable split at '/'",
                )?)
            }
        };

        inner_embeds.push(json!({
            "title": name,
            "image": {
                "url": url
            }
        }))
    }

    let embeds = json!({
        "username": comment.comment.user.login,
        "avatar_url": comment.comment.user.avatar_url,
        "embeds": inner_embeds,
        "components": [
            {
                "type": 1,
                "components": [
                    {
                        "type": 2,
                        "label": "View Comment",
                        "url": comment.comment.html_url,
                        "style": 5,
                    },
                ],
            },
        ],
    })
    .to_string();

    Ok(send_json(&embeds).await?)
}
