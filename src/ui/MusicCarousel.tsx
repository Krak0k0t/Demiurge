import { useEffect, useState } from 'react';
import { AudioLines, Disc3, Pause, Play, SkipBack, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import { etherAudio, type MusicPlaybackState } from '../audio/etherAudio';
import { MUSIC_TRACKS } from '../audio/musicCatalog';
import { SFX_SCHEMES, type SfxSchemeId } from '../audio/sfxSchemes';
import type { TranslationPack } from '../i18n/translations';

interface MusicCarouselProps {
  t: TranslationPack;
  variant: 'compact' | 'full' | 'mini';
  short?: boolean;
}

export function MusicCarousel({ t, variant, short = false }: MusicCarouselProps) {
  const [musicState, setMusicState] = useState<MusicPlaybackState>(() => etherAudio.getMusicState());

  useEffect(() => {
    return etherAudio.subscribeMusicState(setMusicState);
  }, []);

  const currentTrack = MUSIC_TRACKS[musicState.trackIndex] ?? MUSIC_TRACKS[0];
  const currentMeta = t.musicTracks[currentTrack.id];
  const currentSfxMeta = t.sfxSchemes[musicState.sfxScheme];
  const volumePct = Math.round(musicState.volume * 100);
  const isActivelyPlaying = musicState.playing && !musicState.muted;

  if (variant === 'mini') {
    return (
      <div
        data-music-carousel="mini"
        className="stone-panel pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 text-left"
      >
        <Disc3
          className={`h-3.5 w-3.5 shrink-0 ${isActivelyPlaying ? 'text-[#7BE6DB]' : 'text-[#A68A55]'}`}
          aria-hidden="true"
        />
        <select
          aria-label={t.musicCarouselTitle}
          data-music-select="true"
          value={musicState.trackIndex}
          onChange={(e) => etherAudio.playTrack(Number(e.target.value))}
          className="font-body h-[28px] max-w-[148px] cursor-pointer truncate border border-[#6E552C]/75 bg-[#17131F] px-1.5 text-[11px] font-semibold text-[#F6ECDA] outline-none"
        >
          {MUSIC_TRACKS.map((tr, idx) => (
            <option key={tr.id} value={idx} className="bg-[#14111A] text-[#F4ECE0]">
              {idx + 1}. {t.musicTracks[tr.id].title}
            </option>
          ))}
        </select>

        <button
          type="button"
          data-music-prev="true"
          onClick={() => etherAudio.prevTrack()}
          aria-label={t.musicPrevTrack}
          title={t.musicPrevTrack}
          className="stone-btn inline-flex h-[28px] w-[26px] shrink-0 items-center justify-center text-[#EAD9BD]"
        >
          <SkipBack className="h-3 w-3" aria-hidden="true" />
        </button>

        <button
          type="button"
          data-music-toggle="true"
          onClick={() => etherAudio.toggleMusicPlay()}
          aria-label={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
          title={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
          className="stone-btn inline-flex h-[28px] w-[26px] shrink-0 items-center justify-center"
          style={{
            borderColor: isActivelyPlaying ? '#5EC8BE' : '#8C6C36',
            color: isActivelyPlaying ? '#9BF3EA' : '#EAD9BD',
          }}
        >
          {isActivelyPlaying ? (
            <Pause className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Play className="h-3 w-3" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          data-music-next="true"
          onClick={() => etherAudio.nextTrack()}
          aria-label={t.musicNextTrack}
          title={t.musicNextTrack}
          className="stone-btn inline-flex h-[28px] w-[26px] shrink-0 items-center justify-center text-[#EAD9BD]"
        >
          <SkipForward className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        data-music-carousel="compact"
        className={`relative z-10 border border-[#7D6031]/75 bg-[#120F18]/86 text-left ${
          short ? 'px-2 py-1' : 'px-2.5 py-1.5'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Disc3
              className={`h-3.5 w-3.5 shrink-0 ${isActivelyPlaying ? 'text-[#7BE6DB]' : 'text-[#A68A55]'}`}
              aria-hidden="true"
            />
            <select
              aria-label={t.musicCarouselTitle}
              data-music-select="true"
              value={musicState.trackIndex}
              onChange={(e) => etherAudio.playTrack(Number(e.target.value))}
              className="font-body min-h-[28px] min-w-0 flex-1 cursor-pointer truncate border border-[#6E552C] bg-[#191522] px-2 py-0.5 text-[11px] font-semibold text-[#F6ECDA] outline-none"
            >
              {MUSIC_TRACKS.map((tr, idx) => (
                <option key={tr.id} value={idx} className="bg-[#14111A] text-[#F4ECE0]">
                  {idx + 1}. {t.musicTracks[tr.id].title} ({tr.durationLabel})
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              data-music-prev="true"
              onClick={() => etherAudio.prevTrack()}
              aria-label={t.musicPrevTrack}
              title={t.musicPrevTrack}
              className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center text-[#EAD9BD]"
            >
              <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              data-music-toggle="true"
              onClick={() => etherAudio.toggleMusicPlay()}
              aria-label={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
              title={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
              className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center"
              style={{
                borderColor: isActivelyPlaying ? '#5EC8BE' : '#8C6C36',
                color: isActivelyPlaying ? '#9BF3EA' : '#EAD9BD',
              }}
            >
              {isActivelyPlaying ? (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              data-music-next="true"
              onClick={() => etherAudio.nextTrack()}
              aria-label={t.musicNextTrack}
              title={t.musicNextTrack}
              className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center text-[#EAD9BD]"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <div className="ml-1 hidden items-center gap-1 sm:flex">
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#C8A35E]" aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={100}
                value={volumePct}
                aria-label={t.musicVolumeLabel}
                data-music-volume="true"
                onChange={(e) => etherAudio.setMusicVolume(Number(e.target.value) / 100)}
                className="h-1.5 w-16 cursor-pointer accent-[#D7A447]"
              />
              <span className="font-num w-7 text-right text-[10px] text-[#C8B9A2]">{volumePct}%</span>
            </div>
          </div>
        </div>

        {/* SFX Sound Scheme + Music Mode Row */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#A67F38]/20 pt-1">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <AudioLines className="h-3.5 w-3.5 shrink-0 text-[#E2B354]" aria-hidden="true" />
            <span className="font-display hidden text-[9.5px] font-bold uppercase tracking-wider text-[#C8A66A] sm:inline">
              {t.sfxSchemeLabel}
            </span>
            <select
              aria-label={t.sfxSchemeLabel}
              data-sfx-select="true"
              value={musicState.sfxScheme}
              onChange={(e) => etherAudio.setSfxScheme(e.target.value as SfxSchemeId, true)}
              className="font-body min-h-[26px] min-w-0 flex-1 cursor-pointer truncate border border-[#6E552C] bg-[#191522] px-2 py-0.5 text-[11px] font-semibold text-[#FFE8AE] outline-none"
            >
              {SFX_SCHEMES.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-[#14111A] text-[#F4ECE0]">
                  {t.sfxSchemes[sc.id].name}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-sfx-preview="true"
              onClick={() => etherAudio.previewSfxScheme()}
              title={t.sfxSchemePreview}
              aria-label={t.sfxSchemePreview}
              className="stone-btn inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center text-[#FFE29A]"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          {!short && (
            <div className="flex items-center gap-2 text-[10px] text-[#A89B86]">
              <span className="hidden truncate italic md:inline">{currentMeta.mood}</span>
              <button
                type="button"
                data-music-mode="true"
                onClick={() =>
                  etherAudio.setMusicMode(musicState.musicMode === 'carousel' ? 'dynamic' : 'carousel')
                }
                title={t.musicModeLabel}
                className="font-display shrink-0 cursor-pointer border border-[#5EC8BE]/45 bg-[#121D21] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7BE6DB] hover:border-[#9BF3EA]"
              >
                {musicState.musicMode === 'dynamic' ? t.musicModeDynamic : t.musicModeCarousel}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-music-carousel="full"
      className="border border-[#7E6334]/80 bg-[#120F18]/95 p-2.5 text-left"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#A67F38]/30 pb-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Disc3
            className={`h-3.5 w-3.5 shrink-0 ${isActivelyPlaying ? 'text-[#7BE6DB]' : 'text-[#A68A55]'}`}
            aria-hidden="true"
          />
          <span className="font-display truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#E2B354]">
            {t.musicCarouselTitle}
          </span>
        </div>
        <button
          type="button"
          data-music-mode="true"
          onClick={() =>
            etherAudio.setMusicMode(musicState.musicMode === 'carousel' ? 'dynamic' : 'carousel')
          }
          title={t.musicModeLabel}
          className="font-display shrink-0 cursor-pointer border border-[#5EC8BE]/50 bg-[#121D21] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7BE6DB] hover:border-[#9BF3EA]"
        >
          {t.musicModeLabel}:{' '}
          {musicState.musicMode === 'dynamic' ? t.musicModeDynamic : t.musicModeCarousel}
        </button>
      </div>

      {/* Active Track & Transport Controls */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display truncate text-xs font-bold text-[#FBF2E1]">
            {musicState.trackIndex + 1}. {currentMeta.title}
          </div>
          <div className="font-body truncate text-[10px] italic text-[#BFB29E]">
            {currentMeta.mood} · {currentTrack.durationLabel}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            data-music-prev="true"
            onClick={() => etherAudio.prevTrack()}
            aria-label={t.musicPrevTrack}
            title={t.musicPrevTrack}
            className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center text-[#EAD9BD]"
          >
            <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-music-toggle="true"
            onClick={() => etherAudio.toggleMusicPlay()}
            aria-label={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
            title={isActivelyPlaying ? t.musicPauseTrack : t.musicPlayTrack}
            className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center"
            style={{
              borderColor: isActivelyPlaying ? '#5EC8BE' : '#8C6C36',
              color: isActivelyPlaying ? '#9BF3EA' : '#EAD9BD',
            }}
          >
            {isActivelyPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-music-next="true"
            onClick={() => etherAudio.nextTrack()}
            aria-label={t.musicNextTrack}
            title={t.musicNextTrack}
            className="stone-btn inline-flex h-[28px] w-[28px] items-center justify-center text-[#EAD9BD]"
          >
            <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Subdued Volume Slider */}
      <div className="mt-1.5 flex items-center gap-2 border-t border-[#A67F38]/20 pt-1.5">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#C8A35E]" aria-hidden="true" />
        <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-[#C8B9A2]">
          {t.musicVolumeLabel}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={volumePct}
          aria-label={t.musicVolumeLabel}
          data-music-volume="true"
          onChange={(e) => etherAudio.setMusicVolume(Number(e.target.value) / 100)}
          className="h-1.5 flex-1 cursor-pointer accent-[#D7A447]"
        />
        <span className="font-num w-8 text-right text-[10px] font-bold text-[#FFE29A]">{volumePct}%</span>
      </div>

      {/* 5-Track Carousel Selector */}
      <div className="mt-1 flex max-h-[108px] flex-col gap-0.5 overflow-y-auto pr-0.5">
        {MUSIC_TRACKS.map((tr, idx) => {
          const active = idx === musicState.trackIndex;
          const info = t.musicTracks[tr.id];
          return (
            <button
              key={tr.id}
              type="button"
              data-music-track={tr.id}
              onClick={() => etherAudio.playTrack(idx)}
              className="flex items-center justify-between gap-2 border px-2 py-0.5 text-left text-[11px] transition-colors"
              style={{
                borderColor: active ? '#5EC8BE' : '#4E412D',
                background: active
                  ? 'linear-gradient(180deg, #1A2F33 0%, #101D20 100%)'
                  : '#17141E',
                color: active ? '#A8F3EC' : '#DFD3C1',
              }}
            >
              <span className="min-w-0 truncate font-semibold">
                {idx + 1}. {info.title}
              </span>
              <span className="font-num shrink-0 text-[10px] text-[#B8AB98]">{tr.durationLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Selectable SFX Sound Scheme */}
      <div className="mt-2 border-t border-[#A67F38]/30 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AudioLines className="h-3.5 w-3.5 text-[#E2B354]" aria-hidden="true" />
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#E2B354]">
              {t.sfxSchemeLabel}
            </span>
          </div>
          <button
            type="button"
            data-sfx-preview="true"
            onClick={() => etherAudio.previewSfxScheme()}
            className="stone-btn font-display inline-flex min-h-[24px] items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FFE29A]"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>{t.sfxSchemePreview}</span>
          </button>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {SFX_SCHEMES.map((sc) => {
            const active = sc.id === musicState.sfxScheme;
            const info = t.sfxSchemes[sc.id];
            return (
              <button
                key={sc.id}
                type="button"
                data-sfx-option={sc.id}
                onClick={() => etherAudio.setSfxScheme(sc.id, true)}
                className="border px-2 py-1 text-left text-[10.5px] transition-colors"
                style={{
                  borderColor: active ? '#E2B354' : '#4E412D',
                  background: active
                    ? 'linear-gradient(180deg, #332717 0%, #1B140C 100%)'
                    : '#17141E',
                  color: active ? '#FFE8AE' : '#CFC3B2',
                }}
              >
                <div className="font-display truncate font-bold">{info.name}</div>
              </button>
            );
          })}
        </div>
        <div className="font-body mt-1 truncate text-[10px] italic text-[#A99B88]">
          {currentSfxMeta.desc}
        </div>
      </div>
    </div>
  );
}
