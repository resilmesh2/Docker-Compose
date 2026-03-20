#!/bin/bash

git fetch --tags -q
git -C ".." checkout origin/main -- Scripts/

./releases.sh