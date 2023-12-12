import 'obsidian'
import { WorkspaceTabs } from "obsidian";
// import {app} from 'obsidian'

declare module 'obsidian' {
    export interface app {
        workspace: Workspace;
    }
    export interface Workspace {
        activeTabGroup: WorkspaceTabs;
    }
    
    export interface CSTSettings {
        byWindow: "current" | "all";
        switch: boolean;
    }    
}
