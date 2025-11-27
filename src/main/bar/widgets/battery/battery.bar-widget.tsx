import AstalBattery from "gi://AstalBattery?version=0.1";
import styles from "./battery.bar-widget.style";
import { createBinding } from "gnim";
import { createCursorPointer } from "@util/ags";

interface Props {
    onClicked?: () => void;
}

export function BatteryBarWidget({ onClicked }: Props) {
    const battery = AstalBattery.get_default();

    return (
        <button cssClasses={[styles.button]} onClicked={onClicked} cursor={createCursorPointer()}>
            <image iconName={createBinding(battery, "battery_icon_name")} />
        </button>
    )
}