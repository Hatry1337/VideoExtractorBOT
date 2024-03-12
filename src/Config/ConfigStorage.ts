import * as fs from "fs";

export class ConfigStorage<T extends Object | string | number | boolean = Object> {
    readonly filePath: string;

    public constructor(private name: string, configDir: string = "./config") {
        this.filePath = configDir + "/" + name + ".json";
    }

    private async readConf() {
        let data = await fs.promises.readFile(this.filePath,{ encoding: "utf8" });
        if(data.length === 0) {
            data = "{}";
        }
        return data;
    }

    public async getValue(key: string): Promise<T | undefined> {
        return JSON.parse(await this.readConf())[key];
    }

    public async setValue(key: string, value: T) {
        let conf = JSON.parse(await this.readConf());
        conf[key] = value;
        await fs.promises.writeFile(this.filePath, JSON.stringify(conf, undefined, 4));
    }
}