import { Context, InlineQueryResultBuilder, InputFile, NextFunction } from "grammy";
import got from "got";
import * as crypto from "crypto";

export const SendVideoMiddleware = async (ctx: Context, next: NextFunction, videoUrl: string | undefined, thumbnail: string | undefined) => {
    if(!videoUrl) return await next();

    try {
        if(ctx.inlineQuery) {
            const result = InlineQueryResultBuilder
                .videoMp4(
                    crypto.randomBytes(64).toString("utf-8"),
                    "Result Video",
                    videoUrl,
                    thumbnail ?? "https://media.discordapp.net/attachments/691738035913621556/1201123525579247617/image.png&format=png"
                );
            await ctx.answerInlineQuery([result]);
            return;
        }
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

    if(ctx.inlineQuery) {
        const result = InlineQueryResultBuilder
            .videoMp4()
            .text("Uploading video... 0%")
        await ctx.answerInlineQuery([result]);

        await ctx.
        await ctx.replyWithVideo(new InputFile(video), {
            reply_to_message_id: ctx.message?.message_id
        });

        clearInterval(interval);
        await ctx.api.deleteMessage(message.chat.id, message.message_id);
        return;
    }

    let message = await ctx.reply("Uploading video... 0%", {
        reply_to_message_id: ctx.message?.message_id
    });

    let interval = setInterval(async () => {
        await ctx.api.editMessageText(message.chat.id, message.message_id, `Uploading video... ${Math.floor(video.downloadProgress.percent * 100)}%`);
    }, 10000);

    await ctx.replyWithVideo(new InputFile(video), {
        reply_to_message_id: ctx.message?.message_id
    });

    clearInterval(interval);
    await ctx.api.deleteMessage(message.chat.id, message.message_id);
}