import { Context, InputFile, NextFunction } from "grammy";
import got from "got";
import { HttpsProxyAgent } from "hpagent";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import {ImageSequenceAnimationMiddleware} from "./ImageSequenceAnimationMiddleware.js";

const tiktok_api_url = "https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=";

enum TikTokAwemeType {
    VIDEO_REGULAR = 0,
    IMAGES_MULTIPLE = 150
}

interface TikTokVideoInfoResponse {
    aweme_list: {
        aweme_id: string;
        aweme_type: TikTokAwemeType;

        desk: string;
        create_time: number;
        author: {
            uid: string;
        };
        video: {
            play_addr: {
                uri: string;
                url_list: string[];
                file_hash: string;
            },
            download_addr: {
                uri: string;
                url_list: string[];
            }
        }
        image_post_info: {
            images: {
                display_image: {
                    uri: string;
                    url_list: string[];
                    width: number;
                    height: number;
                }
            }[];
        }
    }[];
}

export const TikTokExtractorMiddleware = async (ctx: Context, next: NextFunction) => {
    if(!ctx.message?.text) return await next();

    let proxy_agent: HttpsProxyAgent | undefined;
    if(process.env.PROXY) {
        proxy_agent = new HttpsProxyAgent({
            proxy: process.env.PROXY
        });
    }

    let gotOptions = {
        agent: proxy_agent ? { https: proxy_agent } : undefined,
        headers: {
            "User-Agent": "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet"
        }
    }

    let videoUrl: string;

    if(ctx.message.text.includes("tiktok.com")) {
        if(ctx.message.text.includes("/video/")) {
            let res =   /(?:www\.)?tiktok\.com\/.*\/(\w*)\/?/.exec(ctx.message.text);
            if(!res || !res[1]) return await next();
            videoUrl = "https://" + res[0];
        } else {
            let res =   /v[mt]\.tiktok\.com\/(\w*)\/?/.exec(ctx.message.text) ||
                        /tiktok\.com\/t\/(\w*)\/?/.exec(ctx.message.text);

            if(!res || !res[1]) return await next();

            videoUrl = (await got(`https://vm.tiktok.com/${res[1]}/`, gotOptions)).url;
        }
    } else {
        return await next();
    }

    let author = await ctx.getAuthor();
    console.log(`[TikTokExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: ${videoUrl}.`);

    let idVideo = videoUrl.substring(videoUrl.indexOf("/video/") + 7, videoUrl.length);
    idVideo = (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;

    let video_info = JSON.parse((await got(tiktok_api_url + idVideo, gotOptions)).body) as TikTokVideoInfoResponse;

    if(idVideo !== video_info.aweme_list[0].aweme_id) {
        return await ctx.reply("Sorry, I can't extract this video ;(\nSeems like region restriction.", {
            reply_to_message_id: ctx.message.message_id
        });
    }

    if(video_info.aweme_list[0].aweme_type === TikTokAwemeType.IMAGES_MULTIPLE) {
        let images = video_info.aweme_list[0].image_post_info.images.map(i => i.display_image.url_list[0]);

        console.log(images);

        return await ImageSequenceAnimationMiddleware(ctx, next, {
            images,
            width: video_info.aweme_list[0].image_post_info.images[0].display_image.width,
            height: video_info.aweme_list[0].image_post_info.images[0].display_image.height
        });

        /*
        let images: InputMediaPhoto[] = video_info.aweme_list[0].image_post_info.images.map(i => ({
            type: "photo",
            media: i.display_image.url_list[0]
        }));

        let imgMessage = await ctx.replyWithMediaGroup(images, {
            reply_to_message_id: ctx.message?.message_id
        });

        await ctx.replyWithAudio(video_info.aweme_list[0].video.play_addr.url_list[0], {
            reply_to_message_id: imgMessage[0].message_id
        });
        return;
         */
    }

    return await SendVideoMiddleware(ctx, next, video_info.aweme_list[0].video.play_addr.url_list[0]);
}