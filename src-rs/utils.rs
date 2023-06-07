use std::env::var;

use once_cell::sync::Lazy;
use rand::{seq::SliceRandom, thread_rng};
use reqwest::Client;
use serde_json::{from_str, json};
use vercel_runtime::{Body, Error, Response, StatusCode};

const EMOJIS: &[&str] = &[
    "<:_:961561557022670848>", // WumpusHead
    "<:_:961561720713805845>", // WumpusMelt
    "<:_:961561819653234688>", // WumpusPencil
    "<:_:961561898304806934>", // WumpusPopcorn
    "<:_:961562016470949908>", // WumpusShrimp
    "<:_:961562151934394388>", // WumpusStar
    "<:_:961562224516825098>", // WumpusSticker
    "<:_:961595797890273341>", // Radio
];

const CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

pub fn create_message(status: StatusCode, message: &str) -> Result<Response<Body>, http::Error> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body(
            json!({
                "code": status.as_u16(),
                "message": message,
            })
            .to_string()
            .into(),
        )
}

pub fn get_random_emoji() -> &'static str {
    let mut rng = thread_rng();
    EMOJIS.choose(&mut rng).unwrap()
}

pub async fn send_json(json: &str) -> Result<Response<Body>, Error> {
    let urls = match var("WEBHOOK_URLS") {
        Ok(val) => from_str::<Vec<String>>(&val)?,
        _ => {
            return Ok(create_message(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Couldn't retrieve WEBHOOK_URLS environment variable",
            )?)
        }
    };

    for url in urls {
        let _ = CLIENT
            .post(format!("https://discord.com/api/v10/webhooks/{url}"))
            .header("Content-Type", "application/json")
            .body(json.to_owned())
            .send()
            .await;
    }

    Ok(create_message(
        StatusCode::OK,
        "Success fully posted updates to all webhooks",
    )?)
}
