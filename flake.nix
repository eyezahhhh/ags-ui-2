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
    , ...
    }:
    let
      pname = "eyezah-ui";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forEachSystem = f:
        nixpkgs.lib.genAttrs systems (system:
          f system nixpkgs.legacyPackages.${system}
        );
    in
    {
      ############################################################
      # Configurable builder function
      ############################################################

      lib = {
        mkEyezahUI = system: { instanceId ? "eyezah-ui" }:
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
          pkgs.stdenv.mkDerivation {
            name = pname;
            src = ./.;

            nativeBuildInputs = [
              pkgs.wrapGAppsHook4
              pkgs.gobject-introspection
              ags.packages.${system}.default
              pkgs.nodejs_24
            ];

            buildInputs = extraPackages ++ [
              pkgs.gjs
              pkgs.nodejs_24
            ];

            buildPhase = ''
              runHook preBuild

              echo "Current directory:"
              pwd
              ls -la

              npm ci --omit=dev

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out/bin
              mkdir -p $out/share
              cp -r * $out/share

              ags bundle main.app.ts \
                $out/bin/${pname} \
                --root . \
                --gtk 4 \
                -d "SRC='$out/share'" \
                -d "INSTANCE_ID='${instanceId}'"

              runHook postInstall
            '';
          };
      };

      ############################################################
      # Default package (flake-valid derivation)
      ############################################################

      packages = forEachSystem (system: pkgs: {
        default = self.lib.mkEyezahUI system { };
      });

      ############################################################
      # Dev shell
      ############################################################

      devShells = forEachSystem (system: pkgs:
        let
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
            astalPackages ++ [
              pkgs.libadwaita
              pkgs.libsoup_3
              pkgs.glib-networking
              pkgs.nodejs_24
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

      ############################################################
      # Home Manager module
      ############################################################

      homeManagerModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.programs.eyezah-ui;
        in
        {
          options.programs.eyezah-ui = {
            enable = lib.mkEnableOption "Eyezah UI";

            instanceId = lib.mkOption {
              type = lib.types.str;
              default = "eyezah-ui";
              description = "Astal instance ID used during build.";
            };
          };

          config = lib.mkIf cfg.enable {
            home.packages = [
              (self.lib.mkEyezahUI pkgs.system {
                instanceId = cfg.instanceId;
              })
            ];
          };
        };
    };
}
