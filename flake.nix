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
        mkEyezahUI = system: { instanceId ? "eyezah-ui"
                             , homeDirectory ? "/home/eyezah" # for debugging
                             }:
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
          pkgs.buildNpmPackage {
            name = pname;
            src = ./.;
            dontNpmBuild = true;
            npmDepsHash = "sha256-5L+u1IJ6GkdEQEVqo5IKPVw5XlNrO+f7D+pq2ArYOhY=";

            nativeBuildInputs = [
              pkgs.wrapGAppsHook4
              pkgs.gobject-introspection
              ags.packages.${system}.default
              pkgs.jq
            ];

            buildInputs = extraPackages ++ [
              pkgs.gjs
              pkgs.nodejs_24
            ];

            postPatch = ''
              # Remove from package.json
              ${pkgs.lib.getExe pkgs.jq} 'del(.dependencies.ags, .dependencies.gnim, .devDependencies.ags, .devDependencies.gnim)' package.json > package.json.tmp && mv package.json.tmp package.json

              # Remove from the root dependencies and the node_modules entry in the lockfile
              ${pkgs.lib.getExe pkgs.jq} 'del(.packages."".dependencies.ags, .packages."".dependencies.gnim, .packages."node_modules/ags", .packages."node_modules/gnim")' package-lock.json > package-lock.json.tmp && mv package-lock.json.tmp package-lock.json
            '';

            installPhase = ''
              runHook preInstall

              export HOME="${homeDirectory}"

              node script/generate-wallust-file.js --dummy
              node script/generate-styles.js --output-file "/dev/null"
              node script/generate-wallust-file.js --instance "${instanceId}"

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

            package = lib.mkOption {
              type = lib.types.package;
              default = (self.lib.mkEyezahUI pkgs.system {
                instanceId = cfg.instanceId;
                homeDirectory = config.home.homeDirectory;
              });
              description = "The final eyezah-ui package derivation.";
            };
          };

          config = lib.mkIf cfg.enable {
            home.packages = [ cfg.package ];
          };
        };
    };
}
