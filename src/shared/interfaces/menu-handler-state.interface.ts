import { MenuHandler } from "main/menu/handlers/menu-handler";

export type IMenuHandlerState =
	| {
			handler: typeof MenuHandler;
			side: "left" | "right";
			data: string | number | null;
	  }
	| {
			handler: null;
	  };
