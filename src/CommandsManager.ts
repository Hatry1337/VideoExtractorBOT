import { Bot } from "grammy";
import { BOTCommand } from "./Commands/BOTCommand.js";

export class CommandsManager {
    public commands: BOTCommand[] = [];

    constructor(public bot: Bot) { }

    public registerCommand(cmd: BOTCommand) {
        cmd.manager = this;
        this.bot.command(cmd.name, async (ctx) => {
            if(ctx.chat.type === "channel") return;

            let author = await ctx.getAuthor();
            await cmd.callbackFn(ctx, author).catch(e => console.error(`[${cmd.name}] Error invoking callbackFn:`, e));
        });
        this.commands.push(cmd);
    }

    public async init() {
        for(let c of this.commands) {
            if(c.init) {
                console.log("Initializing " + c.name + " command...");
                await c.init();
                console.log("Command " + c.name + " initialized.");
            }
        }
    }
}