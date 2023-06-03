import { Context } from "grammy";
import got from "got";
import { HttpsProxyAgent } from "hpagent";

const tiktok_api_url = "https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=";

interface TikTokVideoInfoResponse {
    aweme_list: {
        aweme_id: string;
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
    }[];
}

export const TikTokExtractorMiddleware = async (ctx: Context) => {
    if(!ctx.message?.text) return;

    let videoUrl: string;

    if(ctx.message.text.includes("vm.tiktok.com") || ctx.message.text.includes("vt.tiktok.com")) {
        let res = /v[mt]\.tiktok\.com\/(\w*)\/?/.exec(ctx.message.text);
        if(!res || !res[1]) return;
        videoUrl = (await got(`https://vm.tiktok.com/${res[1]}/`, {
            headers: {
                "User-Agent": "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet"
            }
        })).url;
    } else if(ctx.message.text.includes("/video/")) {
        videoUrl = ctx.message.text;
    } else {
        return;
    }

    let idVideo = videoUrl.substring(videoUrl.indexOf("/video/") + 7, videoUrl.length);
    idVideo = (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;

    let proxy_agent: HttpsProxyAgent | undefined;
    if(process.env.PROXY) {
        proxy_agent = new HttpsProxyAgent({
            proxy: process.env.PROXY
        });
    }

    let video_info = JSON.parse((await got(tiktok_api_url + idVideo, {
        agent: proxy_agent ? { https: proxy_agent } : undefined,
        headers: {
            "User-Agent": "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet"
        }
    })).body) as TikTokVideoInfoResponse;

    if(idVideo !== video_info.aweme_list[0].aweme_id) {
        return await ctx.reply("Sorry, I can't extract this video ;(\nSeems like region restriction.", {
            reply_to_message_id: ctx.message.message_id
        });
    }

    await ctx.replyWithVideo(video_info.aweme_list[0].video.play_addr.url_list[0], {
        reply_to_message_id: ctx.message.message_id
    });
}