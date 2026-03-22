import { useCallback, useRef } from 'react';
import { store } from '@/lib/beltool-store';

type SoundType = 'appointment' | 'survey' | 'milestone' | 'streak' | 'call-start';

const FREQUENCIES: Record<SoundType, { notes: number[]; durations: number[]; type: OscillatorType }> = {
  appointment: {
    // Cha-ching: two ascending tones
    notes: [523, 659, 784, 1047],
    durations: [80, 80, 80, 200],
    type: 'sine',
  },
  survey: {
    // Gentle ding
    notes: [659, 880],
    durations: [100, 200],
    type: 'sine',
  },
  milestone: {
    // Triumphant: ascending major chord
    notes: [523, 659, 784, 1047, 1319],
    durations: [80, 80, 80, 80, 300],
    type: 'sine',
  },
  streak: {
    // Quick triple beep
    notes: [880, 988, 1175],
    durations: [60, 60, 150],
    type: 'triangle',
  },
  'call-start': {
    // Subtle click
    notes: [440],
    durations: [30],
    type: 'sine',
  },
};

function playTone(ctx: AudioContext, frequency: number, duration: number, startTime: number, type: OscillatorType, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration / 1000 + 0.05);
}

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((sound: SoundType) => {
    const enabled = store.get('soundEffects', true);
    if (!enabled) return;

    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const config = FREQUENCIES[sound];
      if (!config) return;

      const volume = sound === 'call-start' ? 0.05 : 0.12;
      let time = ctx.currentTime;

      config.notes.forEach((note, i) => {
        playTone(ctx, note, config.durations[i], time, config.type, volume);
        time += config.durations[i] / 1000;
      });
    } catch {
      // Audio not available — silent fail
    }
  }, [getCtx]);

  const playForResult = useCallback((result: string, streakCount?: number) => {
    if (result === 'afspraak') {
      play('appointment');
    } else if (result === 'enquete') {
      play('survey');
    } else if (result === 'gebeld' && streakCount && streakCount % 10 === 0) {
      // Every 10 calls
      play('milestone');
    }

    // Streak sounds
    if (streakCount && streakCount >= 3 && streakCount % 3 === 0) {
      setTimeout(() => play('streak'), 400);
    }
  }, [play]);

  const toggle = useCallback(() => {
    const current = store.get('soundEffects', true);
    store.set('soundEffects', !current);
    if (!current) {
      // Play a test tone when enabling
      play('survey');
    }
    return !current;
  }, [play]);

  const isEnabled = () => store.get('soundEffects', true);

  return { play, playForResult, toggle, isEnabled };
}
