import { WithOptional } from "@components/with-optional/with-optional";
import { getMinimumCoverSize, loadImageAsync } from "@util/image";
import { Gdk, Gtk } from "ags/gtk4";
import GdkPixbuf from "gi://GdkPixbuf?version=2.0";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { Accessor, createState, With } from "gnim";

interface ImageInfo {
	pixbuf: GdkPixbuf.Pixbuf;
	allocation: Gdk.Rectangle;
}

const Picture = Gtk.Picture;

export default function Thumbnail(props: {
	path: string | Accessor<string>;
	contentFit?: Gtk.ContentFit | Accessor<Gtk.ContentFit>;
}) {
	const { path, contentFit } = props;

	const [imageInfo, setImageInfo] = createState<ImageInfo | null>(null);

	return (
		<box hexpand vexpand>
			<WithOptional value={path}>
				{(path) => (
					<box
						hexpand
						vexpand
						onMap={(self) => {
							const cancellable = new Gio.Cancellable();

							const connectionId = self.connect("unmap", () => {
								cancellable.cancel();
								self.disconnect(connectionId);
							});

							GLib.idle_add(GLib.PRIORITY_LOW, () => {
								const allocation = self.get_allocation();
								if (!allocation.width || !allocation.height) {
									return GLib.SOURCE_CONTINUE;
								}
								loadImageAsync(path, {
									cancellable,
									dimensions: (imageDimensions) =>
										getMinimumCoverSize(
											...imageDimensions,
											allocation.width,
											allocation.height,
										),
								})
									.then((pixbuf) => setImageInfo({ pixbuf, allocation }))
									.catch((e) => {
										console.error(`Failed to load image: ${path}:`, e);
									});

								return GLib.SOURCE_REMOVE;
							});
						}}
					>
						<With value={imageInfo}>
							{(imageInfo) =>
								imageInfo && (
									<Picture
										widthRequest={imageInfo.allocation.width}
										heightRequest={imageInfo.allocation.height}
										onMap={(self) => self.set_pixbuf(imageInfo.pixbuf)}
										contentFit={contentFit || Gtk.ContentFit.COVER}
									/>
								)
							}
						</With>
					</box>
				)}
			</WithOptional>
		</box>
	);
}
