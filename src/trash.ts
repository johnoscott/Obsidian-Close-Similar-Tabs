// from main onLoad
dupliLeafCount(leaves: WorkspaceLeaf[], target: string): number {
    // code used in main not 
    // const condition =
    // 	this.dupliLeafCount(leaves, target) === 1;
    // don't close leaf if only one leaf
    // if (condition) {
    // 	debug("don't close unique leaf")
    // 	const cursPos = leaf.getEphemeralState();
    // 	app.workspace.setActiveLeaf(leaf);
    // 	leaf.setEphemeralState(cursPos);
    // 	result = 1;
    // } else {
    let countSamePathLeaves = 0;

    for (const leaf of leaves) {
        if (leaf.getViewState().state?.file === target) {
            console.log(
                "leaf.getViewState().state?.file",
                leaf.getViewState().state?.file
            );
            console.log("target", target);
            countSamePathLeaves++;
        }
    }
    console.log("countSamePathLeaves", countSamePathLeaves);

    return countSamePathLeaves;
}