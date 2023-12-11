import { Workspace } from "obsidian";
// import 'obsidian'

declare global {
    interface app {
        workspace: Workspace;
    }
    interface CSTSettings {
        byWindow: "current" | "all";
        switch: boolean;
    }
}
