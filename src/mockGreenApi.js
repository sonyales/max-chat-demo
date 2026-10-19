// Local-only adapter: no fetch, WebSocket, SDK or real credentials.
export function normalizePhone(value) {
  if (!/^[+\d\s()-]+$/.test(value)) throw new Error('Введите номер телефона, например +7 999 123-45-67.');
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!/^[1-9]\d{9,14}$/.test(digits)) throw new Error('Номер должен содержать от 10 до 15 цифр с кодом страны.');
  return digits;
}
export class MockGreenApi {
  constructor({ idInstance, apiTokenInstance }, { delay = 350, replyDelay = 1200 } = {}) {
    if (!/^\d+$/.test(idInstance) || !apiTokenInstance.trim()) throw new Error('Заполните idInstance (цифры) и apiTokenInstance.');
    this.delay = delay;
    this.replyDelay = replyDelay;
    this.queue = [];
    this.timers = new Set();
    this.closed = false;
    this.receipt = 0;
  }
  async sendMessage({ chatId, message }) {
    if (this.closed) throw new Error('Сеанс завершён.');
    if (!/^\d{10,15}@c\.us$/.test(chatId)) throw new Error('Некорректный получатель.');
    if (!message.trim() || message.length > 4000) throw new Error('Сообщение должно содержать от 1 до 4000 символов.');
    await new Promise(resolve => setTimeout(resolve, this.delay));
    if (this.closed) throw new Error('Сеанс завершён.');
    const idMessage = crypto.randomUUID();
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.closed) return;
      const text = /привет|здравствуй/i.test(message)
        ? 'Привет! Сообщение получил 👋'
        : /спасибо/i.test(message) ? 'Пожалуйста! На связи 🙂'
        : 'Сообщение получил! Спасибо, что написал.';
      this.queue.push({ receiptId: ++this.receipt, body: {
        typeWebhook: 'incomingMessageReceived', idMessage: crypto.randomUUID(), timestamp: Math.floor(Date.now() / 1000),
        senderData: { chatId, sender: chatId, senderName: `+${chatId.split('@')[0]}` },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } }
      } });
    }, this.replyDelay);
    this.timers.add(timer);
    return { idMessage };
  }
  async receiveNotification() { return this.closed ? null : (this.queue[0] ?? null); }
  async deleteNotification(receiptId) {
    const index = this.queue.findIndex(item => item.receiptId === receiptId);
    if (index === -1) return { result: false };
    this.queue.splice(index, 1);
    return { result: true };
  }
  dispose() {
    this.closed = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.queue = [];
  }
}
