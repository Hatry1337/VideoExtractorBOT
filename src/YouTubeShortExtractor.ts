import { Context, Filter, NextFunction } from "grammy";
import ytdl from "ytdl-core";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import { performFeedback } from "./PerformFeedback.js";

export const YouTubeShortExtractorMiddleware = async (ctx: Filter<Context, "::url">, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("youtube.com/shorts/")) return await next();

    let res = /youtube\.com\/shorts\/([\w_-]*)\/?/.exec(ctx.message.text);
    if(!res || !res[1]) return await next();

    let author = await ctx.getAuthor();
    console.log(`[YouTubeShortExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: https://youtube.com/shorts/${res[1]}.`);

    if(!ytdl.validateID(res[1])) {
        console.log(`[YouTubeShortExtractor] https://youtube.com/shorts/${res[1]} is not valid youtube video.`);
        return await next();
    }

    performFeedback(ctx);

    let videoInfo = await ytdl.getInfo("https://youtube.com/shorts/" + res[1]);

    let videos = videoInfo.formats.filter(f => f.container === "mp4" && f.hasVideo && f.hasAudio);
    let url = videos.find(f => f.qualityLabel === "720p" || f.qualityLabel === "720p60")?.url ?? videos[0].url;

    return await SendVideoMiddleware(ctx, next, url);
}