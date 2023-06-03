import { CommandContext, Context } from "grammy";
import { ChatMember } from "grammy/out/types.node";
import { CommandsManager } from "../CommandsManager";

export abstract class BOTCommand {
    public abstract name: string;
    public abstract description: string;

    public manager!: CommandsManager;

    public abstract callbackFn(ctx: CommandContext<Context>, author: ChatMember): Promise<void>;
}