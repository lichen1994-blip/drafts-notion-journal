# Setup Guide

## 1. Prepare the Notion Database

Create every property listed in [notion-schema-en.md](notion-schema-en.md). Property names must match the Chinese names exactly because the script uses them when calling the Notion API.

Using a dedicated database is recommended so Drafts does not need access to unrelated Notion pages.

## 2. Create the Drafts Action

1. Open the Action list in Drafts.
2. Create an Action named `同步感想到 Notion`.
3. Add a `Script` step.
4. Delete the example comments from the script editor.
5. Paste the complete contents of `src/drafts-notion-sync.js`.
6. Leave `Allow asynchronous execution` turned off.
7. Enable `List` visibility for iOS and macOS.
8. Close the editor. Drafts saves the Action automatically.

Creating and editing custom Actions requires Drafts Pro. Consult the current Drafts policy to confirm whether installed Actions remain available after a trial or subscription ends.

## 3. First Authorization

1. Open a test Draft.
2. Run `同步感想到 Notion`.
3. On the Notion authorization page, grant access only to the target database.
4. Return to Drafts and paste the full Notion database URL.
5. Run the Action again to create the first record.

The database configuration is stored in Drafts Credential. To change it, open:

`Settings → Credentials → Drafts Notion Journal Configuration → Forget`

Then run the Action again.

## 4. Location Permission

Drafts can preserve creation coordinates only when it has location permission at the time the note is created. The script cannot reconstruct a historical location for older Drafts that do not contain coordinates.

## 5. Apple Watch Capture

Apple Watch handles quick capture; iPhone runs the sync action:

1. Create a note in Drafts on Apple Watch.
2. Wait for it to sync to Drafts on iPhone through iCloud.
3. Open the Draft on iPhone.
4. Run `同步感想到 Notion`.

The script does not need to run on Apple Watch. If the watch-created Draft does not contain coordinates, its text, timestamps, and tags still sync, but location and weather remain empty.

If the Draft does not appear on iPhone, verify that both devices use the same Apple Account and that Drafts iCloud sync is working.

## 6. Updating

When a new version is released, replace the complete contents of the Action's Script step with the latest `src/drafts-notion-sync.js`.
