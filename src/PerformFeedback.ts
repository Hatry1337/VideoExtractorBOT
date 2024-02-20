import { Context } from "grammy";

export async function performFeedback(ctx: Context) {
    try {
        await ctx.react("👀");
    } catch (e: any) {
        console.log("Failed to react on message", ctx.message?.message_id, "error:", e);
    }
}