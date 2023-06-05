import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";

import { BOTCommand } from "./Commands/BOTCommand";
import { CommandsManager } from "./CommandsManager";

import { Help } from "./Commands/Help";
import { Start } from "./Commands/Start";
import { WhoAmI } from "./Commands/WhoAmI";
import { TikTokExtractorMiddleware } from "./TikTokExtractor";
import { InstagramReelExtractorMiddleware } from "./InstagramReelExtractor";

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TOKEN: string;
            ADMIN?: string;
            PROXY?: string;
        }
    }
}

const bot = new Bot(process.env.TOKEN);
const cmdMgr = new CommandsManager(bot);

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});

bot.on("::url", TikTokExtractorMiddleware)
bot.on("::url", InstagramReelExtractorMiddleware);

//Custom Commands definition
const COMMANDS: BOTCommand[] = [
    new Help(),
    new Start(),
    new WhoAmI(),
];
//===============================================//

(async () => {
    console.log("Starting BOT..");
    bot.start().catch(e => console.error("BOT Main Loop Error:", e));

    console.log("Registering commands...");
    for(let c of COMMANDS){
        cmdMgr.registerCommand(c);
        console.log(c.name, "registered.");
    }

    console.log("Sending 'my' commands...");
    await bot.api.setMyCommands(cmdMgr.commands.map(c => ({
        command: c.name,
        description: c.description
    })));

    console.log("BOT is Ready.");
})();