use serde::Deserialize;

#[derive(Deserialize)]
pub struct User {
    pub login: String,
    pub avatar_url: String,
}

#[derive(Deserialize)]
pub struct HeadCommit {
    pub url: String,
}

#[derive(Deserialize)]
pub struct Pusher {
    pub name: String,
}

#[derive(Deserialize)]
pub struct Author {
    pub username: String,
}

#[derive(Deserialize)]
pub struct Commit {
    pub id: String,
    pub message: String,
    pub author: Author,
    pub added: Vec<String>,
    pub removed: Vec<String>,
    pub modified: Vec<String>,
    pub timestamp: String,
}

#[derive(Deserialize)]
pub struct Push {
    pub sender: User,
    pub head_commit: HeadCommit,
    pub pusher: Pusher,
    pub commits: Vec<Commit>,
}

#[derive(Deserialize)]
pub struct InnerComment {
    pub user: User,
    pub commit_id: String,
    pub created_at: String,
    pub html_url: String,
    pub body: String,
}

#[derive(Deserialize)]
pub struct Comment {
    pub comment: InnerComment,
}
