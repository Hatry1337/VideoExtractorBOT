import { ConfigStorage } from "./ConfigStorage.js";
import * as fs from "fs";

export interface IBetaFeatureConfig {
    [key: string]: boolean;
}

export class ConfigManager {
    public static BetaFeatureConfig: ConfigStorage<IBetaFeatureConfig>;

    public static async start(dir: string = "./config") {
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        this.BetaFeatureConfig = new ConfigStorage("beta-config", dir);
    }
}