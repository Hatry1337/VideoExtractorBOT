import { CommandContext, Context } from "grammy";
import { ChatMember } from "@grammyjs/types";
import { BOTCommand } from "./BOTCommand.js";
import { ConfigManager } from "../Config/ConfigManager.js";

const features: string[] = [ "photo_animation" ];

export class UseBetaFeature extends BOTCommand {
    public name: string = "usebetafeature";
    public description: string = "Use specified beta feature in this group/dm.";

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        let args = (ctx.message?.text ?? "").split(" ").slice(1);

        if(!features.includes(args[0])) {
            await ctx.reply("Unknown feature. Supported features list:\n`" + features.join("`\n") + "`", { parse_mode: "Markdown" });
            return;
        }

        let flag = !args[1] || args[1] === "true"
        let config = await ConfigManager.BetaFeatureConfig.getValue(args[0]) ?? {};

        if(ctx.chat.type === "group" || ctx.chat.type === "supergroup" || ctx.chat.type === "channel") {
            if(author.status !== "administrator" && author.status !== "creator") {
                await ctx.reply("Only administrator of this group can configure beta features!");
                return;
            }
        }

        config[ctx.chat.id] = flag;
        await ConfigManager.BetaFeatureConfig.setValue(args[0], config);

        await ctx.reply("Successfully " + (flag ? "enabled" : "disabled") + " `" + args[0] + "` beta feature.", { parse_mode: "Markdown" });
    }
}