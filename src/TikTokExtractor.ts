import { Context, Filter, NextFunction } from "grammy";
import got from "got";
import { HttpsProxyAgent } from "hpagent";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import {ImageSequenceAnimationMiddleware} from "./ImageSequenceAnimationMiddleware.js";
import { InputMediaPhoto } from "grammy/types";
import { performFeedback } from "./PerformFeedback.js";
import { ConfigManager } from "./Config/ConfigManager.js";

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

export const TikTokExtractorMiddleware = async (ctx: Filter<Context, "::url">, next: NextFunction) => {
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

    performFeedback(ctx);

    let typeIndex = videoUrl.indexOf("/video/");
    if(typeIndex === -1) {
        typeIndex = videoUrl.indexOf("/photo/");
    }
    if(typeIndex === -1) {
        console.log(`Failed to extract video id from URL: ${videoUrl}`);
        return await next();
    }

    let idVideo = videoUrl.substring(typeIndex + 7, videoUrl.length);
    idVideo = (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;

    let video_info = JSON.parse((await got(tiktok_api_url + idVideo, gotOptions)).body) as TikTokVideoInfoResponse;

    console.log(`target: ${idVideo}, found: ${video_info.aweme_list[0].aweme_id}, found_link: ${video_info.aweme_list[0].video.play_addr.url_list[0]}`);

    if(idVideo !== video_info.aweme_list[0].aweme_id) {
        return await ctx.reply("Sorry, I can't extract this video ;(\nSeems like region restriction.", {
            reply_to_message_id: ctx.message.message_id
        });
    }

    if(video_info.aweme_list[0].aweme_type === TikTokAwemeType.IMAGES_MULTIPLE) {
        let images = video_info.aweme_list[0].image_post_info.images.map(i => i.display_image.url_list[0]);

        let conf = await ConfigManager.BetaFeatureConfig.getValue("photo_animation") ?? {};

        if(conf[ctx.chat.id]) {
            return await ImageSequenceAnimationMiddleware(ctx, next, {
                animationId: video_info.aweme_list[0].aweme_id,
                images,
                width: video_info.aweme_list[0].image_post_info.images[0].display_image.width,
                height: video_info.aweme_list[0].image_post_info.images[0].display_image.height,
                bgAudioURL: video_info.aweme_list[0].video.play_addr.url_list[0]
            });
        } else {
            let imagesTg: InputMediaPhoto[] = images.map(i => ({
                type: "photo",
                media: i
            }));

            let imgMessage = await ctx.replyWithMediaGroup(imagesTg, {
                reply_to_message_id: ctx.message?.message_id
            });

            await ctx.replyWithAudio(video_info.aweme_list[0].video.play_addr.url_list[0], {
                reply_to_message_id: imgMessage[0].message_id
            });
            return;
        }
    }

    return await SendVideoMiddleware(ctx, next, video_info.aweme_list[0].video.play_addr.url_list[0]);
}