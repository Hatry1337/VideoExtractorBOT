import { CommandContext, Context } from "grammy";
import { ChatMember } from "grammy/out/types.node";
import { BOTCommand } from "./BOTCommand";

export class Start extends BOTCommand {
    public name: string = "start";
    public description: string = "Initialize the BOT.";

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        await ctx.reply("To extract videos send me a link or forward a message containing the link.")
    }
}