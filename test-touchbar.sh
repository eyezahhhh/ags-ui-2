#!/nix/store/rlgii39vy2cp7y4rgxz6l0bl7115nk7a-bash-interactive-5.3p3/bin/bash

# export WLR_DRM_DEVICES=/dev/dri/card2;
# export WLR_NO_HARDWARE_INPUT=1;

export XDG_SEAT=seat-touchbar;

cage -s -D -d ./start-touchbar.sh;
