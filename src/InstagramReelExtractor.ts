import { Context, Filter, NextFunction } from "grammy";
import got from "got";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import { CookieJar } from "tough-cookie";
import randomUseragent from "random-useragent";
import { performFeedback } from "./PerformFeedback.js";

interface InstaSaveAPIResponse {
    status: string;
    p: string;
    data: string;
}

const BASE_DOMAIN = "igdownloader.app";
const BASE_URL = "https://" + BASE_DOMAIN;

export const InstagramReelExtractorMiddleware = async (ctx: Filter<Context, "::url">, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("instagram.com/reel")) return await next();

    let res = /instagram\.com\/reel\/([\w_-]*)\/?/.exec(ctx.message.text);
    if(!res || !res[1]) return await next();

    let author = await ctx.getAuthor();
    console.log(`[InstagramReelExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: https://instagram.com/reel/${res[1]}.`);

    performFeedback(ctx);

    const headers = {
        'Origin': BASE_URL,
        'Host': BASE_DOMAIN,
        'Referer': BASE_URL + "/en/",
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': randomUseragent.getRandom(),
    }

    //obtain cookies
    let jar = new CookieJar();
    await got(BASE_URL + "/en/", { cookieJar: jar, headers });

    let data = JSON.parse((await got(BASE_URL + "/api/ajaxSearch", {
        method: "POST",
        cookieJar: jar,
        form: {
            q: "https://instagram.com/reel/" + res[1],
            t: "media"
        },
        headers
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