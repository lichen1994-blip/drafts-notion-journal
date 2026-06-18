# Privacy Notes

The script processes the following information only when the user explicitly runs the sync action:

| Service | Data sent | Purpose |
| --- | --- | --- |
| Notion | Note text, timestamps, tags, coordinates, address, and weather | Store the journal entry |
| OpenStreetMap Nominatim | Latitude and longitude | Convert coordinates into an address |
| Open-Meteo | Coordinates and creation date | Retrieve weather near the creation time |

## Information Not Stored in the Public Source Code

- Notion OAuth token
- Notion database URL or data source ID
- Draft text
- Personal addresses or coordinates

Drafts manages the Notion OAuth token. The database configuration is stored on the user's device through Drafts Credential.

## Public API Usage

This project is designed for personal, low-frequency, user-triggered syncing. Do not adapt it into a high-volume batch geocoding tool.
