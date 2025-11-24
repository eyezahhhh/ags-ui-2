import app from "ags/gtk4/app"
import { monitorFile } from "ags/file"
import { BarWindow } from "./window/bar/bar.window"
import { createDebouncer } from "../utils/time.util"

const reloadStyles = createDebouncer(() => {
  app.reset_css()
  app.apply_css("./astal-style.css")
  console.log("Reloaded CSS.")
}, 100)

app.start({
  css: "./astal-style.css",
  main: () => {
    const monitors = app.get_monitors()
    for (const monitor of monitors) {
      BarWindow(monitor)
    }

    monitorFile("./astal-style.css", () => reloadStyles())
  },
})
