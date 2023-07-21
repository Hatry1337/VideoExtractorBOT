import { CommandContext, Context } from "grammy";
import { BOTCommand } from "./BOTCommand.js";
import {ChatMember} from "@grammyjs/types";

export class Help extends BOTCommand {
    public name: string = "help";
    public description: string = "Show commands help.";

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        await ctx.reply(this.manager.commands.map(c => `/${c.name} - ${c.description}`).join("\n"));
    }
}