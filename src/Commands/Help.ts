import { CommandContext, Context } from "grammy";
import { ChatMember } from "grammy/out/types.node";
import { BOTCommand } from "./BOTCommand";

export class Help extends BOTCommand {
    public name: string = "help";
    public description: string = "Show commands help.";

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        await ctx.reply(this.manager.commands.map(c => `/${c.name} - ${c.description}`).join("\n"));
    }
}