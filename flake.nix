{
  description = "My Awesome Desktop Shell";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { self
    , nixpkgs
    , ags
    ,
    }:
    let
      pname = "my-shell";
      entry = "app.ts";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forEachSystem = f:
        nixpkgs.lib.genAttrs systems (system:
          let
            pkgs = nixpkgs.legacyPackages.${system};

            astalPackages = with ags.packages.${system}; [
              io
              astal4
              apps
              auth
              battery
              bluetooth
              cava
              greet
              hyprland
              mpris
              network
              notifd
              powerprofiles
              tray
              wireplumber
            ];

            extraPackages =
              astalPackages
              ++ [
                pkgs.libadwaita
                pkgs.libsoup_3
                pkgs.glib-networking
              ];
          in
          f system pkgs extraPackages
        );
    in
    {
      packages = forEachSystem (system: pkgs: extraPackages: {
        default = pkgs.stdenv.mkDerivation {
          name = pname;
          src = ./.;

          nativeBuildInputs = with pkgs; [
            wrapGAppsHook3
            gobject-introspection
            ags.packages.${system}.default
          ];

          buildInputs = extraPackages ++ [ pkgs.gjs ];

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin
            mkdir -p $out/share
            cp -r * $out/share
            ags bundle ${entry} $out/bin/${pname} -d "SRC='$out/share'"

            runHook postInstall
          '';
        };
      });

      devShells = forEachSystem (system: pkgs: extraPackages: {
        default = pkgs.mkShell {
          buildInputs = [
            (ags.packages.${system}.default.override {
              inherit extraPackages;
            })
          ];
        };
      });
    };
}
