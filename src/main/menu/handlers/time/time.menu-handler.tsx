import GObject from "gnim/gobject";
import { MenuHandler } from "../menu-handler";

export class TimeMenuHandler extends MenuHandler {
    constructor() {
        super("time");
    }

    public getContent(window: GObject.Object, data: string | number | null): GObject.Object {
        return <box>
            <label label="Time" />
        </box>
    }
}