import { VercelRequest, VercelResponse } from "@vercel/node";
import { handleComment, handleCommit } from "./handler"

const WEBHOOK_URLS: Array<string> = JSON.parse(process.env.WEBHOOK_URLS);

export default async (request: VercelRequest, response: VercelResponse) => {
    if (request.method !== "POST") return response.status(405).send("Method not allowed");

    const body = request.body;

    if (body.repository.full_name !== "Discord-Datamining/Discord-Datamining") {
        return response.status(400).send("Invalid repository");
    }

    const event = request.headers["x-github-event"];

    if (event === "push") {
        await handleCommit(body, WEBHOOK_URLS)
        return response.status(200).send("OK, hopefully\n");
    }

    if (event === "commit_comment") {
        await handleComment(body.comment, WEBHOOK_URLS);
        return response.status(200).send("OK, hopefully\n");
    }

    return response.status(501).send("Unsupported event");
}
