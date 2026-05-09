#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from typing import Any

from ytmusicapi import YTMusic


def normalize(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else " " for ch in value).strip()


def score_album_candidate(item: dict[str, Any], artist: str, album: str) -> float:
    title = normalize(str(item.get("title") or ""))
    album_text = normalize(album)
    artist_text = normalize(artist)
    score = 0.0

    if album_text and album_text in title:
        score += 8
    if artist_text:
        for artist_item in item.get("artists") or []:
            if artist_text in normalize(str(artist_item.get("name") or "")):
                score += 8
                break

    year = str(item.get("year") or "")
    if year == "2016":
        score += 0.5

    return score


def main() -> int:
    if len(sys.argv) >= 3:
        artist = sys.argv[1].strip()
        album = sys.argv[2].strip()
    else:
        payload = json.load(sys.stdin)
        artist = str(payload.get("artist") or "").strip()
        album = str(payload.get("album") or "").strip()
    if not artist or not album:
        raise SystemExit("artist and album are required")

    api = YTMusic()
    results = api.search(f"{artist} {album}", filter="albums", limit=8)

    ranked = sorted(
        results,
        key=lambda item: score_album_candidate(item, artist, album),
        reverse=True,
    )

    best = ranked[0] if ranked else None
    if not best:
        json.dump({"ok": False, "error": "no album candidates"}, sys.stdout)
        return 0

    browse_id = best.get("browseId")
    album_details = api.get_album(browse_id) if browse_id else {}

    json.dump(
        {
            "ok": True,
            "artist": artist,
            "album": album,
            "albumCandidate": {
                "title": best.get("title"),
                "playlistId": best.get("playlistId"),
                "browseId": best.get("browseId"),
                "year": best.get("year"),
                "artists": best.get("artists"),
            },
            "albumDetails": {
                "title": album_details.get("title"),
                "audioPlaylistId": album_details.get("audioPlaylistId"),
                "playlistId": album_details.get("playlistId"),
                "browseId": album_details.get("browseId"),
                "artists": album_details.get("artists"),
                "year": album_details.get("year"),
                "trackCount": len(album_details.get("tracks") or []),
                "tracks": [
                    {
                        "title": track.get("title"),
                        "videoId": track.get("videoId"),
                        "isAvailable": track.get("isAvailable"),
                        "duration": track.get("duration"),
                    }
                    for track in (album_details.get("tracks") or [])
                ],
            },
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
