#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
git push --set-upstream origin HEAD
