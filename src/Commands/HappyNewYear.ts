import { CommandContext, Context } from "grammy";
import { ChatMember } from "@grammyjs/types";
import { BOTCommand } from "./BOTCommand.js";

export class HappyNewYear extends BOTCommand {
    public name: string = "hny";
    public description: string = "🎄🎄🎄";

    private chats: Set<number> = new Set<number>();
    private lastHour: number = -1;

    public async callbackFn(ctx: CommandContext<Context>, author: ChatMember) {
        this.chats.add(ctx.chat.id);
        await ctx.reply("🎄");
    }

    public async init() {
        setInterval(() => {
            if(this.lastHour !== new Date().getUTCHours()) {
                for(let c of this.chats.values()) {
                    //sorry for this yandere-dev code. i wanted to write this as fast as i can xd
                    switch (new Date().getUTCHours()) {
                        case 19: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year UTC+5");
                            break;
                        }
                        case 20: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year UTC+4");
                            break;
                        }
                        case 21: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year MSK");
                            break;
                        }
                        case 22: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year UTC+2");
                            break;
                        }
                        case 23: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year UTC+1");
                            break;
                        }
                        case 0: {
                            this.manager.bot.api.sendMessage(c, "🎄 Happy New Year UTC");
                            break;
                        }
                    }

                }
                this.lastHour = new Date().getUTCHours();
            }
        }, 10000);
    }
}