#!/bin/bash

# Array of all Pebble emulators
EMULATORS=("aplite" "basalt" "chalk" "diorite" "emery" "flint")

# Check if image name was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <image-name>"
    echo "Example: $0 main_menu"
    exit 1
fi

IMAGE_NAME="$1"
SCREENSHOT_DIR="./screenshots"

# Create screenshots directory if it doesn't exist
mkdir -p "$SCREENSHOT_DIR"

echo "Taking screenshots for: $IMAGE_NAME"
echo "=========================================="

# Loop through each emulator and take a screenshot
for emulator in "${EMULATORS[@]}"; do
    filename="${SCREENSHOT_DIR}/${emulator}_${IMAGE_NAME}.png"
    echo "📸 Capturing $emulator..."
    pebble screenshot --emulator "$emulator" "$filename"
    echo ""
done

echo "=========================================="
echo "✅ All screenshots saved to $SCREENSHOT_DIR"
