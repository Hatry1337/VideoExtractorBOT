import { Context, NextFunction } from "grammy";
import ytdl from "ytdl-core";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";

export const YouTubeShortExtractorMiddleware = async (ctx: Context, next: NextFunction) => {
    if(!ctx.from) return await next();
    if(!ctx.inlineQuery?.query && !ctx.message?.text) return await next();

    let target = ctx.inlineQuery?.query ?? ctx.message?.text;
    if(!target || !target.includes("youtube.com/")) return await next();

    // we want to auto-extract only yt shorts videos
    if (ctx.message?.text && !target.includes("youtube.com/shorts")) return await next();

    let res = /youtu(?:be\.com|\.be)\/(?:shorts\/|watch\?v=|)([\w_-]*)\/?/.exec(target);
    if(!res || !res[1]) return await next();

    console.log(`[YouTubeShortExtractor] User @${ctx.from.username} (${ctx.from.id}) requested video extraction: https://youtu.be/${res[1]}.`);

    if(!ytdl.validateID(res[1])) {
        console.log(`[YouTubeShortExtractor] https://youtu.be/${res[1]} is not valid youtube video.`);
        return await next();
    }

    let videoInfo = await ytdl.getInfo("https://youtu.be/" + res[1]);

    let videos = videoInfo.formats.filter(f => f.container === "mp4" && f.hasVideo && f.hasAudio);
    let video = videos.find(f => f.qualityLabel === "720p" || f.qualityLabel === "720p60") ?? videos[0];

    return await SendVideoMiddleware(ctx, next, video.url, videoInfo.thumbnail_url);
}