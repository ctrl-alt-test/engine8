#define _CRT_SECURE_NO_WARNINGS 1
#define WIN32_LEAN_AND_MEAN
#define WIN32_EXTRA_LEAN
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

#include "wavexport.h"

// Song information (Sointu constants + su_render_song/su_load_gmdls).
#include "../music/music.h"

namespace
{
	// Relative path (from the editor's working directory) to the compiled music
	// object. Used only as a staleness signal: if it's newer than the wav, the
	// music changed and we re-render. If it can't be found we fall back to
	// "render only when the wav is missing".
	const wchar_t* const kMusicObjPath = L"src/music/music.obj";

	bool getWriteTime(const wchar_t* path, FILETIME& out)
	{
		WIN32_FILE_ATTRIBUTE_DATA data;
		if (!GetFileAttributesExW(path, GetFileExInfoStandard, &data))
			return false;
		out = data.ftLastWriteTime;
		return true;
	}

	// True when we must (re)render: wav missing, or older than music.obj.
	bool needsRender(const wchar_t* wavPath)
	{
		FILETIME wavTime;
		if (!getWriteTime(wavPath, wavTime))
			return true; // No wav yet.

		FILETIME objTime;
		if (!getWriteTime(kMusicObjPath, objTime))
			return false; // Can't tell; keep the existing wav.

		return CompareFileTime(&wavTime, &objTime) < 0; // wav older than music.
	}

	bool renderAndWrite(const wchar_t* wavPath)
	{
		fprintf(stdout, "Rendering music to wav, please wait ...\n");

		// The buffer is large (~38 MB), keep it off the stack/BSS.
		const int sampleCount = SU_LENGTH_IN_SAMPLES * SU_CHANNEL_COUNT;
		SUsample* buffer = (SUsample*)malloc(sizeof(SUsample) * sampleCount);
		if (!buffer)
			return false;

#ifdef SU_LOAD_GMDLS
		su_load_gmdls();
#endif
		su_render_song(buffer);

		// 44-byte canonical RIFF/WAVE header for 16-bit stereo PCM @ 44.1 kHz.
		char header[44] =
		{
			'R', 'I', 'F', 'F',
			0, 0, 0, 0,          // filled below: 36 + data size
			'W', 'A', 'V', 'E',
			'f', 'm', 't', ' ',
			16, 0, 0, 0,
			1, 0,                // PCM
			2, 0,                // channels
			0x44, 0xac, 0, 0,    // 44100 Hz
			0x10, 0xB1, 0x02, 0, // byte rate = 44100*2*2
			4, 0,                // block align
			16, 0,               // bits per sample
			'd', 'a', 't', 'a',
			0, 0, 0, 0           // filled below: data size
		};
		const DWORD dataSize = (DWORD)sampleCount * 2u; // 2 bytes per sample
		*((DWORD*)(&header[4])) = dataSize + 36u;
		*((DWORD*)(&header[40])) = dataSize;

		FILE* file = _wfopen(wavPath, L"wb");
		if (!file)
		{
			free(buffer);
			return false;
		}

		fwrite(header, 1, 44, file);
		for (int i = 0; i < sampleCount; i++)
		{
			// Convert float [-1,1] to 16-bit and clip.
			int s = (int)(buffer[i] * 32767.0f);
			if (s > 32767) s = 32767;
			if (s < -32767) s = -32767;
			short out = (short)s;
			fwrite(&out, 2, 1, file);
		}
		fclose(file);
		free(buffer);

		fprintf(stdout, "Music wav ready.\n");
		return true;
	}
}

namespace Leviathan
{
	bool ensureMusicWav(const wchar_t* path)
	{
		if (!needsRender(path))
			return true;
		return renderAndWrite(path);
	}
}
