// DEV is injected by AGS
// @ts-expect-error
export const IS_DEV = typeof DEV == "boolean" ? !!DEV : false;
