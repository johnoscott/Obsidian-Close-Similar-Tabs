import { WorkspaceTabs } from "obsidian";

declare module 'obsidian' {
    interface app {
        workspace: Workspace;
    }
    interface Workspace {
        activeTabGroup: WorkspaceTabs;
    }
    
    interface CSTSettings {
        byWindow: "current" | "all";
        switch: boolean;
    }    
}
