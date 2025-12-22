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
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # --- Define shared packages here ---
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

          pname = "my-shell";
          entry = "app.ts";
        in
        {
          default = pkgs.stdenv.mkDerivation {
            name = pname;
            src = ./.;

            # dontWrapQtApps = true;

            nativeBuildInputs = with pkgs; [
              wrapGAppsHook4 # Switched to 4 for GTK4/Astal4
              gobject-introspection
              ags.packages.${system}.default
            ];

            buildInputs = extraPackages ++ [ pkgs.gjs ];

            # This ensures the font is available at runtime
            propagatedBuildInputs = [
              pkgs.kode-mono
              pkgs.papirus-icon-theme
              pkgs.hicolor-icon-theme
            ];

            installPhase = ''
              runHook preInstall
              mkdir -p $out/bin
              mkdir -p $out/share
              cp -r * $out/share
              ags bundle ${entry} $out/bin/${pname} -d "SRC='$out/share'"
              runHook postInstall
            '';
          };
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          # Pull the extraPackages defined in the packages block above
          # or just redefine the same logic if preferred. 
          # A cleaner way is to define extraPackages inside forAllSystems 
          # but outside both 'packages' and 'devShells'.

          # For simplicity in this specific flake structure:
          shellExtraPackages = self.packages.${system}.default.buildInputs;
        in
        {
          default = pkgs.mkShell {
            buildInputs = [
              (ags.packages.${system}.default.override {
                extraPackages = shellExtraPackages;
              })
            ];
          };
        }
      );
    };
}
