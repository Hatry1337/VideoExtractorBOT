import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";

import { BOTCommand } from "./Commands/BOTCommand.js";
import { CommandsManager } from "./CommandsManager.js";

import { Help } from "./Commands/Help.js";
import { Start } from "./Commands/Start.js";
import { WhoAmI } from "./Commands/WhoAmI.js";
import { TikTokExtractorMiddleware } from "./TikTokExtractor.js";
import { InstagramReelExtractorMiddleware } from "./InstagramReelExtractor.js";
import { YouTubeShortExtractorMiddleware } from "./YouTubeShortExtractor.js";

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
bot.on("::url", YouTubeShortExtractorMiddleware);

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