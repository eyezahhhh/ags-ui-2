import { Accessor } from "gnim";

export function optionalAs<T, V>(
	value: T | Accessor<T>,
	callback: (value: T) => V,
) {
	if (value instanceof Accessor) {
		return value.as(callback);
	}
	return callback(value);
}
