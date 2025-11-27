import { Accessor, createState } from "gnim";

export function optionalAs<T, V>(
	value: T | Accessor<T>,
	callback: (value: T) => V,
) {
	if (value instanceof Accessor) {
		return value.as(callback);
	}
	return callback(value);
}

export function getOptional<T>(value: T | Accessor<T>) {
	if (value instanceof Accessor) {
		return value.get();
	}
	return value;
}

export function asAccessor<T>(value: T | Accessor<T>) {
	if (value instanceof Accessor) {
		return value;
	}
	const [accessor] = createState(value);
	return accessor;
}
