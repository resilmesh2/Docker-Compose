#!/bin/bash

# ============================
# Script to sync ndr-resilmesh from Montimage to your repo
# Automatically skips already-applied commits
# Resolves conflicts by always preferring upstream version ("theirs")
# ============================

# === CONFIGURATION ===
UPSTREAM_REPO="https://github.com/Montimage/maip.git"
UPSTREAM_BRANCH="ndr-resilmesh"
LOCAL_BRANCH="main"                  # your local branch in Network-Detection-Response
REMOTE_NAME="origin"                 # your GitHub repo remote

# === CHECK ARGUMENT ===
OLDEST_COMMIT=$1
if [ -z "$OLDEST_COMMIT" ]; then
    echo "Usage: $0 <oldest_commit_hash>"
    exit 1
fi

echo "Syncing commits from $UPSTREAM_BRANCH starting after $OLDEST_COMMIT ..."

# === FETCH UPSTREAM ===
git fetch $UPSTREAM_REPO $UPSTREAM_BRANCH

# === LIST ALL COMMITS AFTER OLDEST_COMMIT (oldest first) ===
COMMITS=$(git rev-list --reverse $OLDEST_COMMIT..FETCH_HEAD)

if [ -z "$COMMITS" ]; then
    echo "No new commits found to sync."
    exit 0
fi

# === SWITCH TO LOCAL BRANCH ===
git checkout $LOCAL_BRANCH || { echo "Local branch $LOCAL_BRANCH does not exist"; exit 1; }

# === CHERRY-PICK COMMITS ONE BY ONE ===
for commit in $COMMITS; do
    CHERRY=$(git cherry $LOCAL_BRANCH $commit)
    if echo "$CHERRY" | grep -q "^\+"; then
        echo "Cherry-picking $commit ..."
        if ! git cherry-pick $commit; then
            echo "⚠️ Conflict at $commit, resolving with upstream version..."
            git checkout --theirs .
            git add .
            git cherry-pick --continue || {
                echo "❌ Failed to continue cherry-pick at $commit"
                exit 1
            }
        fi
    else
        echo "Skipping $commit (already applied)"
    fi
done

# === PUSH TO YOUR REMOTE ===
git push $REMOTE_NAME $LOCAL_BRANCH

echo "✅ Sync complete!"
