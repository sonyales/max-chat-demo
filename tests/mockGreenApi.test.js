import test from 'node:test';
import assert from 'node:assert/strict';
import { MockGreenApi, normalizePhone } from '../src/mockGreenApi.js';
const make = () => new MockGreenApi({ idInstance: '7100000001', apiTokenInstance: 'demo' }, { delay: 0, replyDelay: 5 });
const wait = () => new Promise(resolve => setTimeout(resolve, 25));
test('Нормализация номера и отклонение неверного ввода', () => {
  assert.equal(normalizePhone('+7 (999) 123-45-67'), '79991234567');
  assert.equal(normalizePhone('8 999 123 45 67'), '79991234567');
  for (const value of ['123', '+7abc9991234567', '00000000000', '']) assert.throws(() => normalizePhone(value));
});
test('Вход требует оба поля', () => {
  assert.throws(() => new MockGreenApi({ idInstance: '', apiTokenInstance: 'demo' }));
  assert.throws(() => new MockGreenApi({ idInstance: '123', apiTokenInstance: '' }));
});
test('Ответы сохраняют порядок, получателя и требуют подтверждения', async () => {
  const api = make();
  try {
    assert.equal(await api.receiveNotification(), null);
    const first = await api.sendMessage({ chatId: '79991234567@c.us', message: 'Привет' });
    const second = await api.sendMessage({ chatId: '79997654321@c.us', message: 'Спасибо' });
    assert.notEqual(first.idMessage, second.idMessage);
    await wait();
    const notification = await api.receiveNotification();
    assert.equal(notification.body.senderData.chatId, '79991234567@c.us');
    assert.equal(notification.body.messageData.typeMessage, 'textMessage');
    assert.deepEqual(await api.receiveNotification(), notification);
    assert.deepEqual(await api.deleteNotification(notification.receiptId), { result: true });
    assert.deepEqual(await api.deleteNotification(notification.receiptId), { result: false });
    const next = await api.receiveNotification();
    assert.equal(next.body.senderData.chatId, '79997654321@c.us');
    await api.deleteNotification(next.receiptId);
    assert.equal(await api.receiveNotification(), null);
  } finally { api.dispose(); }
});
test('Пустой текст и сообщения длиннее 4000 символов отклоняются', async () => {
  const api = make();
  try {
    for (const message of ['  ', 'a'.repeat(4001)]) await assert.rejects(api.sendMessage({ chatId: '79991234567@c.us', message }));
  } finally { api.dispose(); }
});
test('Выход отменяет ожидающие ответы и блокирует отправку', async () => {
  const api = make();
  await api.sendMessage({ chatId: '79991234567@c.us', message: 'Проверка' });
  api.dispose();
  await wait();
  assert.equal(await api.receiveNotification(), null);
  await assert.rejects(api.sendMessage({ chatId: '79991234567@c.us', message: 'После выхода' }));
});
