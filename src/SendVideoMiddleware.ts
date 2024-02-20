import { Context, InlineKeyboard, InputFile, NextFunction } from "grammy";
import got from "got";

export const SendVideoMiddleware = async (ctx: Context, next: NextFunction, videoUrl: string | undefined) => {
    if(!videoUrl) return await next();

    try {
        await ctx.replyWithVideo(videoUrl, {
            reply_to_message_id: ctx.message?.message_id
        });
        return;
    } catch (e) {
        console.log(`[SendVideo] Can't directly send video ${videoUrl}. Reuploading...`);
    }

    let video = got.stream(videoUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9"
        }
    });

    let message = await ctx.reply("Uploading video... 0%", {
        reply_to_message_id: ctx.message?.message_id
    });

    let lastProgress = -1;
    let interval = setInterval(async () => {
        let progress = Math.floor(video.downloadProgress.percent * 100);
        if(progress === lastProgress) return;
        await ctx.api.editMessageText(message.chat.id, message.message_id, `Uploading video... ${progress}%`);
        lastProgress = progress;
    }, 10000);

    try {
        await ctx.replyWithVideo(new InputFile(video), {
            reply_to_message_id: ctx.message?.message_id
        });
    } catch (e: any) {
        if("error_code" in e && e.error_code === 413) {
            await ctx.reply(
                "You know what? I hate this job! Why there's so large file!?!?!? " +
                "Why there's so small limit in telegram?!?!\n" +
                "Fine. To be not so useless, here's a link where you can download file by yourself.\n" +
                "Sorry for any inconveniences. Thank you for this opportunity to talk it out. I'm tired.", {
                reply_to_message_id: ctx.message?.message_id,
                reply_markup: new InlineKeyboard().url("Download", videoUrl)
            });
            console.log("Failed to upload video due to size limit:", e);
        } else {
            await ctx.reply("❌".repeat(20) + "\nWe lost everything....\nJoking.\nJust a disaster-severity error.", {
                reply_to_message_id: ctx.message?.message_id
            });
            console.log("Failed to upload video:", e);
        }
    }

    clearInterval(interval);
    await ctx.api.deleteMessage(message.chat.id, message.message_id);
}