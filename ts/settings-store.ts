import * as fs from 'fs';

export interface ISettingsStore<T> {
    load() : Promise<T>;
    save(settings: T) : Promise<void>;
}

export class SettingsStore<T> implements ISettingsStore<T> {
    constructor(private settingsFile: string) {}
    load() : Promise<T> {
        try {
            let settings: T = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
            return Promise.resolve<T>(settings);
        } catch(e) {
            return Promise.reject({error: "internal-server-error", error_description: "error loading settings file " + this.settingsFile + ": " + e.toString()});
        }
    }
    save(settings: T) : Promise<void> {
        fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), 'utf8');
        return Promise.resolve();
    }
}