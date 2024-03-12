import { Context, InputFile, NextFunction } from "grammy";
import got from "got";
import {Canvas, Image, loadImage} from "canvas";
import * as fs from "fs";
import sharp from "sharp";
import {execa} from "execa";

interface ImageSequenceAnimationMiddlewareOptions {
    animationId: string;
    width: number;
    height: number;
    images: string[];
    bgAudioURL?: string;
}

class AnimationController {
    public totalFrames: number = 0;
    public canvas: Canvas;

    public constructor(public animId: string, public fps: number, public framesDir: string, width: number, height: number) {
        this.canvas = new Canvas(width, height);
    }

    private async saveFrame() {
        if(!fs.existsSync(this.framesDir)) {
            await fs.promises.mkdir(this.framesDir, { recursive: true });
        }
        await fs.promises.writeFile(`${this.framesDir}/${this.getFrameName(this.totalFrames + 1)}`, this.canvas.toBuffer("image/png"));
        this.totalFrames++;
    }

    public getFrameName(frame: number = this.totalFrames, ext: boolean = true) {
        return `${this.animId}-f${frame}` + (ext ? ".png" : "");
    }

    public async animateSwipe(image: Image, duration: number = 1000) {
        let ctx2d = this.canvas.getContext("2d");

        const maxFrames = Math.floor(this.fps * duration / 1000);
        const aspectRatio = image.width / image.height;

        let resizeHeight;
        let resizeWidth;
        let topPadding;
        let leftPadding;

        if(image.height > image.width) {
            resizeHeight = ctx2d.canvas.height;
            resizeWidth = aspectRatio * ctx2d.canvas.height;
            topPadding = 0;
            leftPadding = (ctx2d.canvas.width - resizeWidth) / 2;
        } else {
            resizeWidth = ctx2d.canvas.width;
            resizeHeight = ctx2d.canvas.height / aspectRatio;
            topPadding = (ctx2d.canvas.height - resizeHeight) / 2;
            leftPadding = 0;
        }

        for(let frame = 0; frame <= maxFrames; frame++) {
            ctx2d.fillStyle = `rgba(0, 0, 0, ${(frame + 1) / maxFrames})`;

            let dx = this.canvas.width - (Math.sin((frame / maxFrames) * Math.PI / 2) * this.canvas.width);

            ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx2d.drawImage(image, leftPadding + dx, topPadding, resizeWidth, resizeHeight);
            await this.saveFrame();
        }
    }

    public async animateIdle(duration: number) {
        let frames = Math.floor((duration / 1000) * this.fps);
        await this.saveFrame();

        for(let f = 0; f < frames; f++) {
            await fs.promises.cp(`${this.framesDir}/${this.getFrameName()}`, `${this.framesDir}/${this.getFrameName(this.totalFrames + 1)}`);
            this.totalFrames++;
        }
    }

    public async render(audioName?: string) {
        await execa(
            "ffmpeg",
            [
                "-y",
                "-framerate",
                String(this.fps),
                "-i",
                `./${this.animId}-f%d.png`,
                audioName ? "-i" : "",
                audioName ? `./${audioName}` : "",
                audioName ? "-map": "",
                audioName ? "1:a" : "",
                audioName ? "-map": "",
                audioName ? "0:v" : "",
                "-c:v",
                "libx264",
                this.animId + ".mp4",
            ],
            { cwd: this.framesDir }
        );

        return this.framesDir + "/" + this.animId + ".mp4";
    }
}

export const ImageSequenceAnimationMiddleware = async (ctx: Context, next: NextFunction, options: ImageSequenceAnimationMiddlewareOptions | undefined) => {
    if(!options || options.images.length === 0) return await next();

    const tempDir = "./tmp";

    let existingPath = tempDir + "/" +  options.animationId + ".mp4";
    if(fs.existsSync(existingPath)) {
        await ctx.replyWithVideo(new InputFile(existingPath), {
            reply_to_message_id: ctx.message?.message_id
        });
        return;
    }

    let animation = new AnimationController(options.animationId, 30, tempDir, options.width, options.height);

    for(let url of options.images) {
        let image = await loadImage(await sharp((await got(url)).rawBody).toFormat('png').toBuffer());
        await animation.animateSwipe(image);
        await animation.animateIdle(5000);
    }

    let audioFileName;
    if(options.bgAudioURL) {
        audioFileName = options.animationId + options.bgAudioURL.substring(options.bgAudioURL.lastIndexOf("."));
        await fs.promises.writeFile(tempDir + "/" + audioFileName, (await got(options.bgAudioURL)).rawBody);
    }

    let video = await animation.render(audioFileName);

    await ctx.replyWithVideo(new InputFile(video), {
        reply_to_message_id: ctx.message?.message_id
    });

    for(let frame = 1; frame <= animation.totalFrames; frame++) {
        await fs.promises.rm( `${animation.framesDir}/${animation.animId}-f${frame}.png`);
    }
    if(audioFileName) {
        await fs.promises.rm( `${animation.framesDir}/${audioFileName}`);
    }
    return;
}