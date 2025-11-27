export function cc(...classes: (string | null | false | undefined)[]) {
	return classes.filter((className) => !!className) as string[];
}

export function compareString(a: string, b: string) {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}
