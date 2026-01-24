#!/bin/bash

# Pebble Build and Install Script
# Supports building and installing to either phone or emulator

VERSION="1.0.0"

show_help() {
    cat << EOF
Pebble Build and Install Script v${VERSION}

USAGE:
    $(basename "$0") [OPTIONS] [PHONE_IP]

DESCRIPTION:
    Builds and installs Pebble app to either a physical device or emulator.
    Default behavior is to build for phone if PHONE_IP is provided, otherwise emulator.

OPTIONS:
    -p, --phone PHONE_IP    Build and install to phone with specified IP address
    -e, --emulator          Build and install to emulator (basalt)
    -h, --help              Show this help message
    -v, --version           Show version information
    --usage                 Show usage information

EXAMPLES:
    $(basename "$0") 192.168.1.100          # Build for phone with IP 192.168.1.100
    $(basename "$0") --phone 192.168.1.100  # Same as above
    $(basename "$0") --emulator              # Build for emulator
    $(basename "$0") -e                      # Same as above

NOTES:
    - Script automatically detects and uses 'rebble' if available, falls back to 'pebble'
    - Phone IP address is obtained by putting the Pebble app into developer mode

EOF
}

show_version() {
    echo "Pebble Build and Install Script v${VERSION}"
}

show_usage() {
    echo "Usage: $(basename "$0") [OPTIONS] [PHONE_ID]"
    echo "Try '$(basename "$0") --help' for more information."
}

build_for_phone() {
    local phone_ip="$1"
    local cli_tool="$2"

    if [[ -z "$phone_ip" ]]; then
        echo "Error: Phone IP address is required for phone mode" >&2
        echo "Usage: $(basename "$0") --phone PHONE_IP" >&2
        exit 1
    fi

    if [[ -z "$cli_tool" ]]; then
        echo "Error: No CLI tool detected" >&2
        exit 1
    fi

    echo "Building and installing to phone: $phone_ip (using $cli_tool)"
    "$cli_tool" build && "$cli_tool" install --logs --phone "$phone_ip"
}

build_for_emulator() {
    local cli_tool="$1"

    if [[ -z "$cli_tool" ]]; then
        echo "Error: No CLI tool detected" >&2
        exit 1
    fi

    echo "Building and installing to emulator (basalt) (using $cli_tool)"
    "$cli_tool" build && "$cli_tool" install --emulator basalt
}

# Parse command line arguments
MODE=""
PHONE_IP=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            show_version
            exit 0
            ;;
        --usage)
            show_usage
            exit 0
            ;;
        -p|--phone)
            if [[ "$MODE" == "emulator" ]]; then
                echo "Error: Cannot specify both --phone and --emulator"
                show_usage
                exit 1
            fi
            MODE="phone"
            if [[ -n "$2" && "$2" != -* ]]; then
                PHONE_IP="$2"
                shift 2
            else
                echo "Error: --phone requires a phone IP address argument"
                show_usage
                exit 1
            fi
            ;;
        -e|--emulator)
            if [[ "$MODE" == "phone" ]]; then
                echo "Error: Cannot specify both --phone and --emulator"
                show_usage
                exit 1
            fi
            MODE="emulator"
            shift
            ;;
        -*)
            echo "Error: Unknown option $1"
            show_usage
            exit 1
            ;;
        *)
            # If no mode specified and we have a positional argument, assume it's a phone IP
            if [[ -z "$MODE" ]]; then
                MODE="phone"
                PHONE_IP="$1"
            else
                echo "Error: Unexpected argument $1"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Determine mode if not explicitly set
if [[ -z "$MODE" ]]; then
    if [[ -n "$PHONE_IP" ]]; then
        MODE="phone"
    else
        MODE="emulator"
        echo "No arguments provided. Defaulting to emulator mode."
    fi
fi

# Detect CLI tool to use
detect_cli_tool() {
    if command -v rebble &> /dev/null; then
        echo "rebble"
    elif command -v pebble &> /dev/null; then
        echo "pebble"
    else
        echo "Error: Neither 'rebble' nor 'pebble' CLI tools are available" >&2
        exit 1
    fi
}

CLI_TOOL=$(detect_cli_tool)

# Execute based on mode
case "$MODE" in
    phone)
        build_for_phone "$PHONE_IP" "$CLI_TOOL"
        ;;
    emulator)
        build_for_emulator "$CLI_TOOL"
        ;;
    *)
        echo "Error: Invalid mode"
        show_usage
        exit 1
        ;;
esac