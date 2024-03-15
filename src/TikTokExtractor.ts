import { Context, InputFile, NextFunction } from "grammy";
import fetch, { RequestInit } from 'node-fetch';
import { HttpsProxyAgent } from "hpagent";
import { SendVideoMiddleware } from "./SendVideoMiddleware.js";
import { InputMediaPhoto } from "grammy/types";

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
            },
            cover: {
                uri: string;
                url_list: string[];
                width: number;
                height: number;
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

class TikTokExtractor {
    public constructor() {

    }

    public static async extractVideoURL(text: string, reqConfig?: RequestInit): Promise<string | undefined> {
        if(text.includes("video")) {
            let res = /(?:www\.)?tiktok\.com\/.*\/video\/(\w*)\/?/.exec(text);
            if(!res || !res[1]) return;

            return "https://" + res[0];
        } else {
            let res = /(?:v[mt]|www)\.tiktok\.com\/?t?\/(\w*)\/?/.exec(text);
            if(!res || !res[1]) return;

            return (await fetch(`https://vm.tiktok.com/${res[1]}/`, reqConfig)).url;
        }
    }

    public static getRequestConfig(extras?: RequestInit): RequestInit {
        return Object.assign({
            agent,
            headers: {
                "User-Agent": "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet"
            }
        }, extras);
    }

    public static getVideoId(url: string): string {
        let idVideo = url.substring(url.indexOf("/video/") + 7, url.length);
        return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
    }

    public static async getVideoInfo(id: string): Promise<TikTokVideoInfoResponse> {
        let response = await fetch(tiktok_api_url + id, TikTokExtractor.getRequestConfig());
        return await response.json() as TikTokVideoInfoResponse;
    }
}

export const TikTokExtractorMiddleware = async (ctx: Context, next: NextFunction) => {
    if(!ctx.message?.text) return await next();
    if(!ctx.message.text.includes("tiktok.com")) return;

    let videoUrl: string | undefined = await TikTokExtractor.extractVideoURL(ctx.message.text, TikTokExtractor.getRequestConfig());

    if(!videoUrl) {
        console.log(`Failed to extract video url from input '${ctx.message.text}'`);
        return;
    }

    let author = await ctx.getAuthor();
    console.log(`[TikTokExtractor] User @${author.user.username} (${author.user.id}) requested video extraction: ${videoUrl}.`);

    let idVideo = TikTokExtractor.getVideoId(videoUrl);
    let video_info = await TikTokExtractor.getVideoInfo(idVideo);

    if(idVideo !== video_info.aweme_list[0].aweme_id) {
        return await ctx.reply("Sorry, I can't extract this video ;(\nSeems like region restriction.", {
            reply_to_message_id: ctx.message.message_id
        });
    }

    if(video_info.aweme_list[0].aweme_type === TikTokAwemeType.IMAGES_MULTIPLE) {
        let images = video_info.aweme_list[0].image_post_info.images.map(i => i.display_image.url_list[0]);

        /*
        console.log(images);

        return await ImageSequenceAnimationMiddleware(ctx, next, {
            images,
            width: video_info.aweme_list[0].image_post_info.images[0].display_image.width,
            height: video_info.aweme_list[0].image_post_info.images[0].display_image.height
        });
        */


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

    return await SendVideoMiddleware(
        ctx,
        next,
        video_info.aweme_list[0].video.play_addr.url_list[0],
        video_info.aweme_list[0].video.cover.url_list[0]
    );
}