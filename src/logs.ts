export function log(...args: any[]) {
	args.forEach((arg) => {
		if (typeof arg === "string") {
			console.log(arg);
		} else {
			const variableName = Object.keys(arg)[0];
			console.log(`${variableName}: ${arg[variableName]}`);
		}
	});
}

export function debug(...args: any[]) {
	args.forEach((arg) => {
		if (typeof arg === "string") {
			console.debug(arg);
		} else {
			const variableName = Object.keys(arg)[0];
			console.debug(`${variableName}: ${arg[variableName]}`);
		}
	});
}
