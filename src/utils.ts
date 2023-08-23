import { View, WorkspaceLeaf, debounce } from "obsidian";
import CST from "./main";

export function removeItem<T>(arr: Array<T>, value: T): Array<T> {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

export function getAddedValues(a: number[], b: number[]): number[] {
    const added: number[] = [];

    for (const value of b) {
        if (!a.includes(value)) {
            added.push(value);
        }
    }

    return added;
}

export function addedValue(a: WorkspaceLeaf[], b: WorkspaceLeaf[]): WorkspaceLeaf | null {
    return b.find(value => !a.includes(value)) || null;
}

export const getEl = (leaf: WorkspaceLeaf | null) => { 
    return (leaf as any)?.parent?.containerEl
}

export const clearAfterDelay = debounce(() => {
    console.clear();
}, 1000 * 30, true);

export const isEmpty = (leaf: WorkspaceLeaf | null) => {
    console.log("isEmpty(leaf)", leaf?.view.getViewType() === "empty")
    return leaf?.view.getViewType() === "empty"
} 

// paths
export const pathInfos = (leaves: WorkspaceLeaf[]) => {    
    const paths = leaves.map(
        (leaf) => {
            return getPath(leaf)
        }
    )
    console.log("pathInfos", paths)
}

export const leafPath = (leave: WorkspaceLeaf) => { 

}

export const getPath = (leaf: WorkspaceLeaf | null):string => {
    return (leaf!.view as any).file && (leaf!.view as any).file.path || ""
}

// active visible leaf
export const getView = (_this: CST): View|null => {
    const { workspace } = _this.app
    const view = workspace.getActiveViewOfType(View) // workspace.activeLeaf
    return view
}

export const getActiveLeaf = (_this: CST): WorkspaceLeaf | null => {
    const { workspace } = (_this.app) as any
    return  workspace.activeLeaf
}

export function pathsInfo()  { 
    const activeLeafpath = getPath(getActiveLeaf(this))
    console.log("activeLeafpath", activeLeafpath)
    const view = getView(this) || null
    const viewPath = getPath(view!.leaf)
    console.log("activeLeafpath", viewPath)
}