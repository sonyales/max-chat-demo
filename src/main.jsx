import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MockGreenApi, normalizePhone } from './mockGreenApi.js';
import './styles.css';

function Icon({ name, ...props }) {
  const paths = { send: 'm5 12 14-8-5 16-3-6-6-2Zm6 2 8-10', plus: 'M12 5v14M5 12h14', back: 'm14 6-6 6 6 6', logout: 'M9 4H4v16h5M10 12h10m-4-4 4 4-4 4', chat: 'M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z', check: 'm4 12 4 4L18 6m-5 10 7-8' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]}/></svg>;
}
const time = timestamp => new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
function Login({ onLogin }) {
  const [id, setId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    try { onLogin(new MockGreenApi({ idInstance: id.trim(), apiTokenInstance: token })); }
    catch (e) { setError(e.message); }
  }
  return <main className="login-page"><div className="login-card">
    <div className="logo">м</div><span className="eyebrow">MAX · GREEN-API</span>
    <h1>На связи.<br/>Всё просто.</h1><p className="intro">Войдите, чтобы создать чат<br/>и отправить первое сообщение.</p>
    <form onSubmit={submit}><label>Телефон<input autoFocus value={id} onChange={e => setId(e.target.value)} placeholder="Введите телефон" inputMode="numeric" required autoComplete="off"/></label>
      <label>Пароль<input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Введите пароль" required autoComplete="off"/></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit">Войти в чат <span>→</span></button>
      <button className="text-button" type="button" onClick={() => { setId('7100000001'); setToken('demo-token'); setError(''); }}>Заполнить демо-данные</button>
    </form>
  </div></main>;
}
function Chat({ api, onLogout }) {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [newChat, setNewChat] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const dialog = useRef(null);
  const chat = chats.find(c => c.id === active);
  const draft = drafts[active] ?? '';
  const visible = messages.filter(m => m.chatId === active);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const notification = await api.receiveNotification();
        if (cancelled) return;
        if (notification) {
          const body = notification.body;
          if (body.typeWebhook === 'incomingMessageReceived' && body.messageData.typeMessage === 'textMessage') {
            setMessages(previous => previous.some(m => m.id === body.idMessage) ? previous : [...previous, {
              id: body.idMessage, chatId: body.senderData.chatId, text: body.messageData.textMessageData.textMessage,
              direction: 'in', timestamp: body.timestamp * 1000, status: 'received'
            }]);
          }
          await api.deleteNotification(notification.receiptId);
        }
      } catch { if (!cancelled) setError('Не удалось получить сообщение. Повторяем попытку…'); }
      if (!cancelled) timer = setTimeout(poll, 400);
    }
    poll();
    return () => { cancelled = true; alive.current = false; clearTimeout(timer); };
  }, [api]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [active, messages]);
  useEffect(() => { if (newChat) dialog.current?.showModal(); else dialog.current?.close(); }, [newChat]);
  function createChat(event) {
    event.preventDefault();
    try {
      const number = normalizePhone(phone);
      const id = `${number}@c.us`;
      setChats(previous => previous.some(c => c.id === id) ? previous : [...previous, { id, phone: `+${number}` }]);
      setActive(id); setNewChat(false); setPhone(''); setPhoneError(''); setError('');
    } catch (e) { setPhoneError(e.message); }
  }
  async function send(event) {
    event?.preventDefault();
    if (!active || !draft.trim() || sending.current) return;
    const chatId = active, text = draft.trim(), localId = crypto.randomUUID();
    sending.current = true; setBusy(true); setError('');
    setDrafts(previous => ({ ...previous, [chatId]: '' }));
    setMessages(previous => [...previous, { id: localId, chatId, text, direction: 'out', timestamp: Date.now(), status: 'sending' }]);
    try {
      const result = await api.sendMessage({ chatId, message: text });
      if (alive.current) setMessages(previous => previous.map(m => m.id === localId ? { ...m, id: result.idMessage, status: 'sent' } : m));
    } catch (e) {
      if (alive.current) {
        setMessages(previous => previous.map(m => m.id === localId ? { ...m, status: 'failed' } : m));
        setDrafts(previous => ({ ...previous, [chatId]: previous[chatId] || text }));
        setError(e.message);
      }
    } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  return <main className={`app ${active ? 'has-chat' : ''}`}>
    <aside className="sidebar"><header className="sidebar-header"><div className="brand"><div className="logo small">м</div><strong>MAX</strong></div><button className="icon-button" onClick={onLogout} title="Выйти" aria-label="Выйти"><Icon name="logout"/></button></header>
      <div className="list-heading"><h1>Сообщения</h1><button className="icon-button add" onClick={() => setNewChat(true)} title="Новый чат" aria-label="Новый чат"><Icon name="plus"/></button></div>
      <div className="chat-list">{chats.length === 0 ? <div className="no-chats"><Icon name="chat"/><h2>Здесь будут ваши чаты</h2><p>Добавьте получателя по номеру телефона, чтобы начать общение.</p><button className="text-button" onClick={() => setNewChat(true)}>Создать первый чат</button></div> : chats.map(c => {
        const last = messages.filter(m => m.chatId === c.id).at(-1);
        return <button className={`chat-row ${active === c.id ? 'selected' : ''}`} key={c.id} onClick={() => { setActive(c.id); setError(''); }}><span className="avatar">{c.phone.slice(-2)}</span><span className="chat-copy"><strong>{c.phone}</strong><span>{last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Пока нет сообщений'}</span></span>{last && <time>{time(last.timestamp)}</time>}</button>;
      })}</div>
    </aside>
    <section className="conversation" aria-label="Переписка">{!chat ? <div className="welcome"><div className="welcome-icon"><Icon name="chat"/></div><h2>Начните с простого «Привет»</h2><p>Создайте чат по номеру телефона<br/>и отправьте первое сообщение.</p><button className="primary" onClick={() => setNewChat(true)}><Icon name="plus"/> Новый чат</button><span className="subtle">Только текст. Только самое нужное.</span></div> : <>
      <header className="conversation-header"><button className="icon-button mobile-back" aria-label="К списку чатов" onClick={() => setActive(null)}><Icon name="back"/></button><span className="avatar">{chat.phone.slice(-2)}</span><div><h2>{chat.phone}</h2></div></header>
      <div className="messages" role="log" aria-live="polite" aria-label="Сообщения">{visible.length === 0 && <div className="first-message">Чат создан. Напишите первое сообщение 👋</div>}{visible.map(m => <div className={`message ${m.direction}`} key={m.id}><div className="message-text">{m.text}</div><div className="message-meta"><time>{time(m.timestamp)}</time>{m.direction === 'out' && <span aria-label={m.status === 'sending' ? 'Отправляется' : m.status === 'failed' ? 'Ошибка отправки' : 'Отправлено'}>{m.status === 'sending' ? '◷' : m.status === 'failed' ? '!' : <Icon name="check"/>}</span>}</div></div>)}<div ref={end}/></div>
      <footer className="composer-area">{error && <p role="alert" className="error">{error}</p>}<form className="composer" onSubmit={send}><textarea aria-label="Текст сообщения" placeholder="Напишите сообщение…" value={draft} maxLength={4000} rows={1} onChange={e => setDrafts(previous => ({ ...previous, [active]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}/><button className="send-button" aria-label="Отправить сообщение" disabled={!draft.trim() || busy}><Icon name="send"/></button></form><div className="composer-hint"><span>Enter — отправить · Shift + Enter — новая строка</span><span>{draft.length} / 4000</span></div></footer>
    </>}</section>
    <dialog ref={dialog} onCancel={() => setNewChat(false)} onClick={e => { if (e.target === dialog.current) setNewChat(false); }}><form onSubmit={createChat}><div className="dialog-heading"><h2>Новый чат</h2><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setNewChat(false)}>×</button></div><p>Введите номер телефона получателя с кодом страны.</p><label>Номер телефона<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 999 123-45-67" required autoFocus/></label>{phoneError && <p className="error" role="alert">{phoneError}</p>}<button className="primary">Создать чат</button></form></dialog>
  </main>;
}
function App() {
  const [api, setApi] = useState(null);
  useEffect(() => () => api?.dispose(), [api]);
  return api ? <Chat api={api} onLogout={() => { api.dispose(); setApi(null); }}/> : <Login onLogin={setApi}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
