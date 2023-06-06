use datamining_worker::handlers::handler;
use vercel_runtime::{run, Error};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}
