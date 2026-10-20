'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { dayKey } from '../lib/calendar.mjs';

type Habit = { id: string; name: string; target_minutes: number };
type CheckIn = { habit_id: string; local_date: string };
const examples = [ ['Guitar practice', '5', '♫'], ['Sales calls', '10', '↗'], ['Push-ups', '5', '↑'], ['Time together', '10', '♡'] ];
const demoKey = 'daily-practice-demo-v1';
const promptKey = 'daily-practice-save-prompt-v1';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checks, setChecks] = useState<CheckIn[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [today, setToday] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('5');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savePrompt, setSavePrompt] = useState(false);
  const saveDialog = useRef<HTMLDialogElement>(null);
  const actionLock = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const userId = session?.user.id;

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!supabase) { enterDemo(); setReady(true); return; }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true); });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session); setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const tick = () => setToday(dayKey(timezone));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  const refresh = useCallback(async () => {
    if (!supabase || !userId || !today || demo || profileFor !== userId) return;
    setLoading(true);
    try {
      const [h, c] = await Promise.all([
        supabase.from('habits').select('id,name,target_minutes').eq('user_id', userId).order('created_at'),
        supabase.from('check_ins').select('habit_id,local_date').eq('user_id', userId).eq('local_date', today),
      ]);
      if (h.error) throw h.error;
      if (c.error) throw c.error;
      setHabits(h.data); setChecks(c.data); setLoaded(true);
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }, [userId, today, demo, profileFor]);

  useEffect(() => {
    if (!supabase || !userId || demo) return;
    const client = supabase;
    let cancelled = false;
    setLoaded(false); setHabits([]); setChecks([]); setProfileFor(null);
    void (async () => {
      const result = await client.from('profiles').upsert({ user_id: userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (result.error) { setError(result.error.message); return; }
      const profile = await client.from('profiles').select('timezone').eq('user_id', userId).single();
      if (cancelled) return;
      if (profile.error) setError(profile.error.message);
      else { setTimezone(profile.data.timezone); setToday(dayKey(profile.data.timezone)); setProfileFor(userId); }
    })();
    return () => { cancelled = true; };
  }, [userId, demo]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { if (!actionLock.current) void refresh(); };
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 30000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(timer); };
  }, [refresh]);

  function message(e: unknown) { return e instanceof Error ? e.message : (e as { message?: string })?.message || 'Something went wrong. Please try again.'; }
  function saveDemo(nextHabits: Habit[], nextChecks: CheckIn[]) {
    localStorage.setItem(demoKey, JSON.stringify({ habits: nextHabits, checks: nextChecks }));
  }
  function enterDemo() {
    setError(''); setNotice('');
    try {
      const saved = JSON.parse(localStorage.getItem(demoKey) || 'null');
      setHabits(saved?.habits || []); setChecks(saved?.checks || []);
      setLoaded(true); setDemo(true);
      if (saved?.habits?.length >= 2 && !localStorage.getItem(promptKey)) setSavePrompt(true);
    } catch { setError('Local storage is unavailable. Please allow browser storage to try the demo.'); }
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      setNotice('Check your email for a sign-in link. Open it on this device. Use the same email on your other device.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function addHabit(e: React.FormEvent) {
    e.preventDefault(); if (actionLock.current) return;
    const target = Number(minutes);
    if (!name.trim() || name.trim().length > 80 || !Number.isInteger(target) || target < 5 || target > 15) return;
    actionLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      let habit: Habit;
      if (demo) {
        habit = { id: crypto.randomUUID(), name: name.trim(), target_minutes: target };
        saveDemo([...habits, habit], checks);
      } else {
        if (!supabase || !userId) throw new Error('Please sign in again.');
        const result = await supabase.from('habits').insert({ user_id: userId, name: name.trim(), target_minutes: target }).select('id,name,target_minutes').single();
        if (result.error) throw result.error;
        habit = result.data;
      }
      setHabits(prev => [...prev, habit]); setName('');
      if (demo && habits.length + 1 === 2 && !localStorage.getItem(promptKey)) setSavePrompt(true); setNotice('Habit added. Your next small step is ready.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); actionLock.current = false; }
  }
  async function toggle(habit: Habit) {
    if (actionLock.current || !today) return;
    actionLock.current = true; setPending(habit.id); setError(''); setNotice('');
    const done = checks.some(c => c.habit_id === habit.id && c.local_date === today);
    const next = done ? checks.filter(c => !(c.habit_id === habit.id && c.local_date === today)) : [...checks, { habit_id: habit.id, local_date: today }];
    try {
      if (demo) saveDemo(habits, next);
      else {
        if (!supabase || !userId) throw new Error('Please sign in again.');
        const result = done
          ? await supabase.from('check_ins').delete().eq('habit_id', habit.id).eq('user_id', userId).eq('local_date', today)
          : await supabase.from('check_ins').upsert({ user_id: userId, habit_id: habit.id, local_date: today }, { onConflict: 'habit_id,local_date', ignoreDuplicates: true });
        if (result.error) throw result.error;
      }
      setChecks(next); setNotice(done ? 'Completion undone.' : `${habit.name} complete. A little progress counts.`);
    } catch (e) { setError(message(e)); }
    finally { setPending(null); actionLock.current = false; }
  }
  async function leave() {
    if (!demo && supabase) {
      const result = await supabase.auth.signOut();
      if (result.error) { setError(result.error.message); return; }
    }
    setDemo(false); setSession(null); setHabits([]); setChecks([]); setLoaded(false); setNotice(''); setError('');
  }

  useEffect(() => {
    const dialog = saveDialog.current;
    if (savePrompt && dialog && !dialog.open) dialog.showModal();
  }, [savePrompt]);
  function dismissSavePrompt() {
    setSavePrompt(false);
    try { localStorage.setItem(promptKey, 'dismissed'); } catch { /* The session can continue without persistent preferences. */ }
    saveDialog.current?.close();
  }

  const completed = habits.filter(h => checks.some(c => c.habit_id === h.id && c.local_date === today)).length;
  const active = demo || !!session;
  return <main>
    <header><a href="/" className="brand"><span className="brand-icon">↗</span> daily practice<span className="beta">FIRST STEPS</span></a>{active && (demo ? <button className="text-button" onClick={() => setSavePrompt(true)}>Save my habits ↗</button> : <button className="text-button" onClick={leave} disabled={busy || !!pending}>Sign out</button>)}</header>
    {!ready ? <p className="loading" role="status">Getting things ready…</p> : !active ? <section className="welcome">
      <div className="intro"><p className="eyebrow">A LITTLE TIME. EVERY DAY.</p><h1>Small steps.<br /><em>Steady progress.</em></h1><p className="lede">Five to fifteen minutes for the things you want to get better at. Show up, check in, and come back tomorrow.</p><div className="sample"><span>♫</span><div><strong>Guitar practice</strong><small>5 minutes · every day</small></div><span className="sample-check">✓</span></div></div>
      <div className="panel signin"><p className="eyebrow">YOUR DAILY PRACTICE</p><h2>Make a little time.</h2><p>Sign in with an email link. Your habits follow you from your laptop to your phone.</p>
        {supabase ? <form onSubmit={signIn}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} /><button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link →'}</button></form> : <p className="setup-note">Cloud sign-in is waiting for the Supabase connection. You can try the flow below.</p>}
        <button className="secondary" onClick={enterDemo}>Try the local demo</button><small className="muted">Demo data stays in this browser and does not sync.</small>
      </div>
    </section> : <>
      <div className="account-bar"><span className="status-dot" />{demo ? 'GUEST · Saved on this device' : session?.user.email}<span className="zone">{timezone}</span></div>
      <section className="heading"><div><p className="eyebrow">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone }).format(new Date())}</p><h1>A little better,<br /><em>one day at a time.</em></h1></div><p className="heading-note">You don’t need hours.<br />Just a few minutes of intention.</p></section>
      <div className="dashboard"><section className="habits"><div className="section-title"><h2>Today’s practice</h2><span>{completed} of {habits.length} complete</span></div><div className="progress" role="progressbar" aria-label="Today's completed habits" aria-valuemin={0} aria-valuemax={Math.max(habits.length, 1)} aria-valuenow={completed}><div style={{ width: `${habits.length ? completed / habits.length * 100 : 0}%` }} /></div>
        {!loaded && <p role="status">{loading ? 'Loading your habits…' : 'Your habits could not be loaded.'}</p>}
        {loaded && habits.length === 0 && <div className="empty"><span>↗</span><h3>Start with one small thing.</h3><p>Add a habit you can make time for today.<br />Five minutes is a great place to start.</p><button className="text-button" onClick={() => nameInput.current?.focus()}>Add your first habit →</button></div>}
        {habits.map(h => { const done = checks.some(c => c.habit_id === h.id && c.local_date === today); return <article key={h.id} className={`habit ${done ? 'done' : ''}`}><button className="check" aria-label={`${done ? 'Undo' : 'Complete'} ${h.name}`} aria-pressed={done} disabled={!!pending || busy || loading} onClick={() => toggle(h)}>{pending === h.id ? '…' : done ? '✓' : ''}</button><div><h3>{h.name}</h3><p>{h.target_minutes} minutes · every day</p></div><span className="habit-state">{done ? 'Done for today' : 'Your small step'}</span></article>; })}
        {!!habits.length && completed === habits.length && <p className="celebration">✓ You showed up today. See you tomorrow.</p>}
        {!demo && <button className="text-button refresh" disabled={loading || busy || !!pending} onClick={() => { setError(''); void refresh(); }}>{loading ? 'Refreshing…' : '↻ Refresh from cloud'}</button>}
      </section><aside className="panel add-panel"><p className="eyebrow">BUILD YOUR ROUTINE</p><h2>Add a daily habit</h2><p>Keep it small enough to show up again tomorrow.</p><form onSubmit={addHabit}><label htmlFor="habit-name">What will you practice?</label><input ref={nameInput} id="habit-name" placeholder="e.g. Guitar practice" maxLength={80} required value={name} onChange={e => setName(e.target.value)} /><label htmlFor="minutes">Daily commitment</label><select id="minutes" value={minutes} onChange={e => setMinutes(e.target.value)}>{Array.from({ length: 11 }, (_, i) => i + 5).map(n => <option key={n} value={n}>{n} minutes</option>)}</select><button className="primary" disabled={busy || !!pending || !loaded}>{busy ? 'Adding…' : '+ Add habit'}</button></form><div className="suggestions"><span>NEED AN IDEA?</span>{examples.map(([label, min, icon]) => <button key={label} onClick={() => { setName(label); setMinutes(min); nameInput.current?.focus(); }}><span>{icon}</span>{label}<span>+</span></button>)}</div></aside></div>
    </>}
    <dialog ref={saveDialog} className="save-dialog" aria-labelledby="save-title" aria-describedby="save-description" onCancel={dismissSavePrompt}>
      <div className="save-icon" aria-hidden="true">↗</div>
      <p className="eyebrow">KEEP YOUR MOMENTUM</p>
      <h2 id="save-title">Make these habits yours.</h2>
      <p id="save-description">You’ve started your routine. Create an account to save your habits and pick up on any device.</p>
      <div className="saved-preview">{habits.map(h => <span key={h.id}>✓ {h.name}<small>{h.target_minutes} minutes a day</small></span>)}</div>
      <button className="primary" disabled>Create an account · coming soon</button>
      <p className="signup-note">Account creation isn’t connected in this test yet. Your habits are saved in this browser for now.</p>
      <button className="secondary" autoFocus onClick={dismissSavePrompt}>Keep going as a guest</button>
    </dialog>
    <div className="messages" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice">{notice}</p>}</div><footer>A few minutes today. A little momentum tomorrow.</footer>
  </main>;
}
