{
  description = "My Awesome Desktop Shell";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, ags, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system:
          f system
        );
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          pname = "my-shell";
          entry = "app.ts";

          astalPackages = with ags.packages.${system}; [
            io
            astal4
            network
            apps
            battery
            hyprland
            wireplumber
            tray
            notifd
            mpris
            bluetooth
            auth
            greet
            powerprofiles
          ];

          extraPackages = astalPackages ++ [
            pkgs.libadwaita
            pkgs.libsoup_3
          ];
        in
        {
          default = pkgs.stdenv.mkDerivation {
            name = pname;
            src = ./.;

            nativeBuildInputs = with pkgs; [
              wrapGAppsHook3
              gobject-introspection
              ags.packages.${system}.default
            ];

            buildInputs = extraPackages ++ [
              pkgs.gjs
            ];

            installPhase = ''
              runHook preInstall

              mkdir -p $out/bin
              mkdir -p $out/share
              cp -r * $out/share

              ags bundle ${entry} $out/bin/${pname} \
                -d "SRC='$out/share'"

              runHook postInstall
            '';
          };
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          astalPackages = with ags.packages.${system}; [
            io
            astal4
            network
            apps
            battery
            hyprland
            wireplumber
            tray
            notifd
            mpris
            bluetooth
            auth
            greet
            powerprofiles
          ];

          extraPackages = astalPackages ++ [
            pkgs.libadwaita
            pkgs.libsoup_3
          ];
        in
        {
          default = pkgs.mkShell {
            buildInputs = [
              (ags.packages.${system}.default.override {
                inherit extraPackages;
              })
            ];
          };
        }
      );
    };
}
