import { Context, Filter, NextFunction } from "grammy";
import got from "got";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import { CookieJar } from "tough-cookie";
import randomUseragent from "random-useragent";
import { performFeedback } from "./PerformFeedback.js";
import { HttpsProxyAgent } from "hpagent";

const BASE_DOMAIN = "www.instagram.com";
const BASE_URL = "https://" + BASE_DOMAIN;
const GRAPH_QL_API = BASE_URL + "/api/graphql"


export const InstagramReelExtractorMiddleware = async (ctx: Filter<Context, "::url">, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("instagram.com/reel")) return await next();

    let res = /instagram\.com\/reel\/([\w_-]*)\/?/.exec(ctx.message.text);
    if(!res || !res[1]) return await next();

    let author = await ctx.getAuthor();
    console.log(`[InstagramReelExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: https://instagram.com/reel/${res[1]}.`);

    performFeedback(ctx);

    const userAgent = randomUseragent.getRandom();

    let jar = new CookieJar();
    let proxy_agent: HttpsProxyAgent | undefined;
    if(process.env.PROXY) {
        proxy_agent = new HttpsProxyAgent({
            proxy: process.env.PROXY
        });
    }

    let gotOptions = {
        agent: proxy_agent ? { https: proxy_agent } : undefined,
        cookieJar: jar
    }

    const headersBase = {
        "Host": BASE_DOMAIN,
        "User-Agent": userAgent,
        "Connection": "keep-alive"
    }

    //obtain cookies
    await got(BASE_URL + "/reel/" + res[1], {
        headers: headersBase,
        ...gotOptions
    });

    const headersApi = {
        "Host": BASE_DOMAIN,
        "User-Agent": userAgent,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": BASE_URL + "/reel/" + res[1],
        "Content-Type": "application/x-www-form-urlencoded",
        "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
        "X-CSRFToken": (await jar.getCookies(BASE_URL)).filter(c => c.key === "csrftoken")[0].value,
        "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVrNrE6N5Vg",
        "X-ASBD-ID": "129477",
        "Origin": BASE_URL,
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
        "TE": "trailers",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
    }

    const postData = {
        av:	"0",
        __d:	"www",
        __user:	"0",
        __a:	"1",
        __req:	"2",
        __hs:	"19785.HYP:instagram_web_pkg.2.1..0.0",
        dpr:	"1",
        __ccg:	"UNKNOWN",
        __rev:	"1011798589",
        __s:	"z4rq8k:36c3cu:i8fhmg",
        __hsi:	"7342028156794187225",
        __dyn:	"7xeUjG1mxu1syUbFp40NonwgU29zEdF8aUco2qwJw5ux609vCwjE1xoswaq0yE7i0n24oaEd86a3a1YwBgao6C0Mo2iyovw8O4U2zxe2GewGwso88cobEaU2eUlwhEe87q7U1bobpEbUGdwtU662O0Lo6-3u2WE5B0bK1Iwqo5q1IQp1yUoxe4UrAwCAxW",
        __csr:	"gqhQG_kZtbFkFajpp22dfSAARZpQry9JKEVpLG9zQvhkaGHCyV9qyLx1zozKdyulfjGi4eRG8JaniHBQ9KWCybUlz9XJGA9Ay48K4pEWtG4XBx6iaDGEOqm5801l19no3Q80qN03LE0pcPj0ww4wwn876dg0kAhpQaBg7S1jg0g3w4uBkw2Qw09ga",
        __comet_req:	"7",
        lsd:	"AVrNrE6N5Vg",
        jazoest:	"2900",
        __spin_r:	"1011798589",
        __spin_b:	"trunk",
        __spin_t:	"1709449141",
        fb_api_caller_class:	"RelayModern",
        fb_api_req_friendly_name:	"PolarisPostActionLoadPostQueryQuery",
        variables:	JSON.stringify({
            shortcode: res[1],
            fetch_comment_count:40,
            fetch_related_profile_media_count:3,
            parent_comment_count:24,
            child_comment_count:3,
            fetch_like_count:10,
            fetch_tagged_user_count:null,
            fetch_preview_comment_count:2,
            has_threaded_comments:true,
            hoisted_comment_id:null,
            hoisted_reply_id:null,
        }),
        server_timestamps:	"true",
        doc_id: "10015901848480474"
    }

    let response = await got(GRAPH_QL_API, {
        method: "POST",
        form: postData,
        headers: headersApi,
        ...gotOptions
    });

    let link = JSON.parse(response.body).data.xdt_shortcode_media.video_url;

    return await SendVideoMiddleware(ctx, next, link);
}