import { CommandContext, Context } from "grammy";
import { ChatMember } from "@grammyjs/types";
import { CommandsManager } from "../CommandsManager.js";

export abstract class BOTCommand {
    public abstract name: string;
    public abstract description: string;

    public manager!: CommandsManager;

    public abstract callbackFn(ctx: CommandContext<Context>, author: ChatMember): Promise<void>;
}