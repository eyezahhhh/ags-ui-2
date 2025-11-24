export function cc(...classes: (string | null | false | undefined)[]) {
	return classes.filter((className) => !!className) as string[];
}
