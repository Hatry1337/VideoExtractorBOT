import { Context, NextFunction } from "grammy";
import { filterFormats, getInfo, validateID } from "ytdl-core";
import { SendVideoMiddleware } from "./SendVideoMiddleware";

export const YouTubeShortExtractorMiddleware = async (ctx: Context, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("youtube.com/shorts/")) return await next();

    let res = /youtube\.com\/shorts\/([\w_-]*)\/?/.exec(ctx.message.text);
    if(!res || !res[1]) return await next();

    let author = await ctx.getAuthor();
    console.log(`[YouTubeShortExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: https://youtube.com/shorts/${res[1]}.`);

    if(!validateID(res[1])) {
        console.log(`[YouTubeShortExtractor] https://youtube.com/shorts/${res[1]} is not valid youtube video.`);
        return await next();
    }

    let videoInfo = await getInfo("https://youtube.com/shorts/" + res[1]);

    let videos = videoInfo.formats.filter(f => f.container === "mp4" && f.hasVideo && f.hasAudio);
    let url = videos.find(f => f.qualityLabel === "720p" || f.qualityLabel === "720p60")?.url ?? videos[0].url;

    return await SendVideoMiddleware(ctx, next, url);
}