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
          # Include your existing astal/extra packages logic here...
          astalPackages = with ags.packages.${system}; [ /* ... */ ];
          extraPackages = astalPackages ++ [ pkgs.libadwaita /* ... */ ];

          pname = "my-shell";
        in
        {
          default = pkgs.stdenv.mkDerivation {
            inherit pname;
            version = "0.1.0";
            src = ./.; # Nix will see your pre-compiled CSS and types here

            nativeBuildInputs = [
              pkgs.wrapGAppsHook4
              pkgs.gobject-introspection
              ags.packages.${system}.default
            ];

            buildInputs = extraPackages ++ [ pkgs.gjs ];

            installPhase = ''
              runHook preInstall
  
              mkdir -p $out/bin
              mkdir -p $out/share/my-shell
  
              # 1. Copy everything to the share directory
              # This includes your precompiled astal-style.css and types/
              cp -r * $out/share/my-shell
  
              # 2. Bundle the Main Shell
              # We set the root to the share directory so relative imports work
              ags bundle $out/share/my-shell/main.app.ts $out/bin/my-shell \
                -r $out/share/my-shell \
                -g 4 \
                -d "SRC='$out/share/my-shell'"

              # 3. Bundle the Greeter
              ags bundle $out/share/my-shell/greeter.app.ts $out/bin/my-greeter \
                -r $out/share/my-shell \
                -g 4 \
                -d "SRC='$out/share/my-shell'"
    
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
