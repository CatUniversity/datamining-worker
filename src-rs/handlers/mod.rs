pub mod comment;
pub mod push;

use http::Method;
use serde_json::from_slice;
use vercel_runtime::{Body, Error, Request, Response, StatusCode};

use crate::{
    types::{Comment, Push},
    utils::create_message,
};

pub async fn handler(request: Request) -> Result<Response<Body>, Error> {
    if request.method() != Method::POST {
        return Ok(create_message(
            StatusCode::METHOD_NOT_ALLOWED,
            "Method not allowed",
        )?);
    }

    let event = if let Some(header) = request.headers().get("x-github-event") {
        header.to_str()?
    } else {
        return Ok(create_message(
            StatusCode::BAD_REQUEST,
            "Expected a x-github-event header",
        )?);
    };
    let body = request.body();

    match event {
        "push" => {
            let push = from_slice::<Push>(body)?;
            push::handle(push).await
        }
        "commit_comment" => {
            let comment = from_slice::<Comment>(body)?;
            comment::handle(comment).await
        }
        _ => {
            return Ok(create_message(
                StatusCode::BAD_REQUEST,
                "Only supported events are 'push' and 'commit_comment'",
            )?);
        }
    }
}
