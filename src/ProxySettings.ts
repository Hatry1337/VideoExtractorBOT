import { HttpsProxyAgent } from "hpagent";

export default class ProxySettings {
    public static getProxyAgent() {
        if(process.env.PROXY) {
            return new HttpsProxyAgent({
                proxy: process.env.PROXY
            });
        }
    }
}