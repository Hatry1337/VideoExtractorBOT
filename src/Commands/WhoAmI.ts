import { CommandContext, Context } from "grammy";
import { ChatMember } from "@grammyjs/types";
import { BOTCommand } from "./BOTCommand.js";

export class WhoAmI extends BOTCommand {
    public name: string = "whoami";
    public description: string = "Show your account info.";

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        await ctx.reply(
            "Your account details:\n" +
            `Name: ${author.user.first_name} ${author.user.last_name ?? ""}\n` +
            `Username: ${author.user.username}\n` +
            `UserId: ${author.user.id}`
        );
    }
}