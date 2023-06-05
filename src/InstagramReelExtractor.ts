import { Context, NextFunction } from "grammy";
import got from "got";
import { SendVideoMiddleware } from "./SendVideoMiddleware";

interface InstaSaveAPIResponse {
    status: string;
    p: string;
    data: string;
}

const BASE_URL = "https://igdownloader.app";

export const InstagramReelExtractorMiddleware = async (ctx: Context, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("instagram.com/reel")) return await next();

    let res = /instagram\.com\/reel\/([\w_-]*)\/?/.exec(ctx.message.text);
    if(!res || !res[1]) return await next();

    let author = await ctx.getAuthor();
    console.log(`[InstagramReelExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: https://instagram.com/reel/${res[1]}.`);

    let data = JSON.parse((await got(BASE_URL + "/api/ajaxSearch", {
        method: "POST",
        form: {
            q: "https://instagram.com/reel/" + res[1],
            t: "media"
        },
        headers: {
            'Origin': BASE_URL,
            'Referer': BASE_URL + "/en/",
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9',
        }
    })).body) as InstaSaveAPIResponse;

    let linkStart = data.data.indexOf("https://download");
    if(linkStart === -1) {
        return console.error(`[InstagramReelExtractor] Failed to found video link in response. Video: ${res[1]}.`);
    }

    let linkEnd = data.data.indexOf("\" class", linkStart);
    if(linkEnd === -1) {
        return console.error(`[InstagramReelExtractor] Failed to found video link in response. Video: ${res[1]}.`);
    }

    let link = data.data.substring(linkStart, linkEnd);

    return await SendVideoMiddleware(ctx, next, link);
}