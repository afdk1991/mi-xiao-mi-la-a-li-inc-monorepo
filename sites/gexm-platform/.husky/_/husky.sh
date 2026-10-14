#!/usr/bin/env sh
# husky shim
# This script is a shim for Husky's internal usage.
# The actual implementation is provided by the husky package.

if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY" = "debug" ]; then
      printf 'husky:debug %s\n' "$*"
    fi
  }

  husky_userinstall () {
    # Check for user's husky installation
    if [ -f "$1/node_modules/husky/husky.sh" ]; then
      debug "found husky.sh in $1/node_modules/husky"
      . "$1/node_modules/husky/husky.sh"
      return 0
    fi
    return 1
  }

  husky_local_install () {
    # Find the nearest package.json
    husky_dir="$PWD"
    while [ "$husky_dir" != "/" ]; do
      if [ -f "$husky_dir/package.json" ]; then
        if husky_userinstall "$husky_dir"; then
          return 0
        fi
      fi
      husky_dir="$(dirname "$husky_dir")"
    done
    return 1
  }

  if ! husky_local_install; then
    printf 'husky: not found\n' >&2
    printf 'husky: you may reinstall husky by running `npm install husky`\n' >&2
    exit 1
  fi
fi
