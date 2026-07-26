#pragma once

namespace Leviathan
{
	// Editor-only helper. Renders the Sointu song to a 16-bit PCM .wav file at
	// `path` so the DirectShow-based Song player (used for seeking/scrubbing)
	// has something to play. The render only happens when the file is missing
	// or older than the compiled music (src/music/music.obj); otherwise this is
	// a cheap no-op so editor launches stay instant.
	//
	// Returns true if a usable wav exists at `path` afterwards.
	bool ensureMusicWav(const wchar_t* path);
}
