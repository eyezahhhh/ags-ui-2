{
  description = "ezshell desktop shell and greeter";

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
      pname = "ezshell";

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
        mkEzshell = system: { instanceId ? "ezshell"
                            , homeDirectory ? "/home/eyezah"
                            , enableShell ? true
                            , enableGreeter ? false
                            , settings ? { }
                            }:
          let
            pkgs = nixpkgs.legacyPackages.${system};

            fontPackages = with pkgs; [
              inter
              comic-mono
              oswald
              roboto
              kode-mono
            ];

            yaml = pkgs.formats.yaml { };

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
                pkgs.accountsservice
                pkgs.papirus-icon-theme
                pkgs.libmanette
                pkgs.libgudev
                pkgs.libvirt-glib
                pkgs.inter
                pkgs.comic-mono
                pkgs.oswald
                pkgs.roboto
                pkgs.kode-mono
              ];
          in
          pkgs.buildNpmPackage {
            name = pname;
            src = ./.;
            dontNpmBuild = true;
            dontWrapQtApps = true;
            npmDepsHash = "sha256-Fbxfxb9HasM7p+eZ3LiBKSaWkdlV1pjFCGnYf2g04Vc=";

            nativeBuildInputs = [
              pkgs.wrapGAppsHook4
              pkgs.gobject-introspection
              ags.packages.${system}.default
              pkgs.jq
              pkgs.makeWrapper
            ];

            buildInputs = extraPackages ++ [
              pkgs.gjs
              pkgs.nodejs_24
              pkgs.wlr-randr
              pkgs.imagemagick
              pkgs.brightnessctl
              pkgs.libqalculate
              pkgs.mozlz4a
              pkgs.qrencode
              pkgs.lm_sensors
              pkgs.inter
              pkgs.comic-mono
              pkgs.oswald
              pkgs.roboto
              pkgs.kode-mono
            ];

            postPatch = ''
              ${pkgs.lib.getExe pkgs.jq} \
                'del(.dependencies.ags, .dependencies.gnim, .devDependencies.ags, .devDependencies.gnim)' \
                package.json > package.json.tmp && mv package.json.tmp package.json

              ${pkgs.lib.getExe pkgs.jq} \
                'del(.packages."".dependencies.ags,
                     .packages."".dependencies.gnim,
                     .packages."node_modules/ags",
                     .packages."node_modules/gnim")' \
                package-lock.json > package-lock.json.tmp && mv package-lock.json.tmp package-lock.json
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

              cp ${yaml.generate "ezshell-config" settings} $out/share/config.yaml
            ''
            + pkgs.lib.optionalString enableShell ''
              echo "Bundling shell..."

              ags bundle main.app.ts \
                $out/bin/${pname}-shell \
                --root . \
                --gtk 4 \
                -d "SRC='$out/share'" \
                -d "INSTANCE_ID='${instanceId}'" \
                -d "CONFIG='$out/share/config.yaml'"
            ''
            + pkgs.lib.optionalString enableGreeter ''
              echo "Bundling greeter..."

              ags bundle greeter.app.ts \
                $out/bin/${pname}-greeter \
                --root . \
                --gtk 4 \
                -d "SRC='$out/share'" \
                -d "INSTANCE_ID='${instanceId}'" \
                -d "CONFIG='$out/share/config.yaml'"
            ''
            + ''
              runHook postInstall
            '';

            postFixup = ''
              for bin in $out/bin/*; do
                wrapProgram "$bin" \
                  --prefix PATH : ${pkgs.lib.makeBinPath [
                    pkgs.nodejs_24
                    pkgs.wlr-randr
                    pkgs.imagemagick
                    pkgs.brightnessctl
                    pkgs.libqalculate
                    pkgs.mozlz4a
                    pkgs.qrencode
                    pkgs.lm_sensors
                    pkgs.inter
                    pkgs.comic-mono
                    pkgs.oswald
                    pkgs.roboto
                    pkgs.kode-mono
                  ]} \
                  --prefix XDG_DATA_DIRS : "${pkgs.lib.makeSearchPath "share" ([ pkgs.papirus-icon-theme ] ++ fontPackages)}"
              done
            '';
          };
      };

      packages = forEachSystem (system: pkgs: {
        default = self.lib.mkEzshell system { };
      });

      devShells = forEachSystem (system: pkgs:
        let
          fontPackages = with pkgs; [
            inter
            comic-mono
            oswald
            roboto
            kode-mono
          ];

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
              pkgs.accountsservice
              pkgs.libmanette
              pkgs.libgudev
              pkgs.libvirt-glib
            ];
        in
        {
          default = pkgs.mkShell {
            FONTCONFIG_FILE = pkgs.makeFontsConf {
              fontDirectories = map (f: "${f}/share/fonts") fontPackages;
            };

            nativeBuildInputs = [
              pkgs.nodejs_24
              pkgs.imagemagick
              pkgs.brightnessctl
              pkgs.libqalculate
              pkgs.mozlz4a
              pkgs.qrencode
              pkgs.lm_sensors
            ];

            buildInputs = [
              (ags.packages.${system}.default.override {
                inherit extraPackages;
              })
              pkgs.papirus-icon-theme
            ];
          };
        }
      );

      homeManagerModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.programs.ezshell;
        in
        {
          options.programs.ezshell = {
            shell.enable = lib.mkEnableOption "ezshell desktop shell";
            greeter.enable = lib.mkEnableOption "ezshell greeter";

            settings = lib.mkOption {
              type = lib.types.attrsOf lib.types.anything;
              default = { };
              description = "Freeform config written to YAML.";
            };

            exposeAgs = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = "Expose the AGS binary in the user's environment.";
            };

            instanceId = lib.mkOption {
              type = lib.types.str;
              default = "ezshell";
              description = "Astal instance ID used during build.";
            };

            package = lib.mkOption {
              type = lib.types.package;
              default =
                self.lib.mkEzshell pkgs.system {
                  instanceId = cfg.instanceId;
                  homeDirectory = config.home.homeDirectory;
                  enableShell = cfg.shell.enable;
                  enableGreeter = cfg.greeter.enable;
                  settings = cfg.settings;
                };
              description = "Final ezshell package derivation.";
            };
          };

          config = lib.mkIf (cfg.shell.enable || cfg.greeter.enable) {
            assertions = [
              # {
              #   assertion =
              #     !(cfg.greeter.enable) || (cfg.settings.greeter.sessionsDir != null);

              #   message =
              #     "programs.ezshell.greeter.sessionsDir must be set when greeter.enable = true.";
              # }
            ];

            home.packages =
              [ cfg.package ]
              ++ lib.optional cfg.exposeAgs ags.packages.${pkgs.system}.default;
          };
        };
    };
}
