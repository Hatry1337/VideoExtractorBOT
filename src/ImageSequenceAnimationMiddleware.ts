import { Context, InputFile, NextFunction } from "grammy";
import got from "got";
import {Canvas, CanvasLineCap, Image, loadImage} from "canvas";
import * as fs from "fs";
import sharp from "sharp";
import {execa} from "execa";

interface ImageSequenceAnimationMiddlewareOptions {
    width: number;
    height: number;
    images: string[];
    bgAudioURL?: string;
}

class AnimationController {
    public totalFrames: number = 0;
    public animId: string;
    public canvas: Canvas;

    public constructor(public fps: number, public framesDir: string, width: number, height: number) {
        this.animId = `c${new Date().getTime()}-r${Math.floor(Math.random() * 10000)}`;
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

        for(let frame = 0; frame <= maxFrames; frame++) {
            let dx = this.canvas.width - (Math.sin((frame / maxFrames) * Math.PI / 2) * this.canvas.width);

            ctx2d.drawImage(image, dx, 0);
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

    public async render() {
        await execa(
            "ffmpeg",
            [
                "-y",
                "-framerate",
                String(this.fps),
                "-i",
                `./${this.animId}-f%d.png`,
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

    let animation = new AnimationController(30,"./tmp", options.width, options.height);

    for(let url of options.images) {
        let image = await loadImage(await sharp((await got(url)).rawBody).toFormat('png').toBuffer());
        await animation.animateSwipe(image);
        await animation.animateIdle(5000);
    }

    let video = await animation.render();

    await ctx.replyWithVideo(new InputFile(video), {
        reply_to_message_id: ctx.message?.message_id
    });

    for(let frame = 1; frame <= animation.totalFrames; frame++) {
        await fs.promises.rm( `${animation.framesDir}/${animation.animId}-f${frame}.png`);
    }
    return;
}