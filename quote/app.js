/* 작성한 견적서는 이 브라우저에만 저장합니다. */
const STORAGE_KEY = 'saetbyeol-quote-v1';
const won = value => `${Math.round(value).toLocaleString('ko-KR')} 원`;
const numberText = value => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const $ = id => document.getElementById(id);
function freshQuote(example = false) {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  return { number: `견적-${date.replaceAll('-', '')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`, date,
    recipient: example ? '김○○ 학부모님' : '', recipientContact: example ? '010-0000-0001' : '',
    sender: example ? '샛별중학교' : '', senderPerson: example ? '김○○' : '', senderContact: example ? '010-0000-0001' : '',
    notes: example ? '본 견적은 가상의 작성 예시입니다.\n세부 내용은 담당자에게 문의해 주십시오.' : '',
    items: [{ name: example ? '해외 수학여행' : '', quantity: example ? 1 : 0, price: example ? 1200000 : 0 }] };
}
let state = freshQuote(true);
let storageAvailable = true;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.every(item => item && typeof item.name === 'string' && Number.isFinite(item.quantity) && item.quantity >= 0 && item.quantity <= 1000000 && Number.isFinite(item.price) && item.price >= 0 && item.price <= 1000000000) || !['number','date','recipient','recipientContact','sender','senderPerson','senderContact','notes'].every(key => typeof parsed[key] === 'string')) throw new Error('저장 내용 확인 필요');
    state = parsed;
  }
} catch (error) { storageAvailable = false; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; $('save-status').textContent = '자동 저장 완료'; }
  catch (error) { storageAvailable = false; $('save-status').textContent = '저장되지 않았습니다. 파일로 받아 주세요.'; }
}
function totals() {
  const subtotal = state.items.reduce((sum, item) => sum + Math.round(item.quantity * item.price), 0);
  const tax = Math.round(subtotal * 0.1);
  return { subtotal, tax, total: subtotal + tax };
}
function updateTotals() {
  const sums = totals();
  ['subtotal','tax','total'].forEach(key => $(key).textContent = won(sums[key]));
  document.querySelector('.document').classList.toggle('compact', state.items.length > 6);
  $('print-warning').textContent = state.items.length > 10 ? '품목이 많으면 A4 한 장에 맞추기 위해 인쇄 글자가 작아집니다.' : '';
}
/* 입력값을 글자로 따로 준비해 종이에는 서류만 나오게 합니다. */
function syncPrint(input) { input.nextElementSibling.textContent = input.value || '—'; }
function addPrintValue(input) {
  const span = document.createElement('span'); span.className = 'print-value'; input.after(span); syncPrint(input);
}
function renderRows() {
  $('items').replaceChildren();
  state.items.forEach((item, index) => {
    const row = document.createElement('tr');
    const specs = [['name','품목','text'], ['quantity','수량','text'], ['price','단가','text']];
    specs.forEach(([key,label,type]) => {
      const cell = document.createElement('td'); cell.dataset.label = label;
      const input = document.createElement('input'); input.type = type; input.setAttribute('aria-label', `${index + 1}번째 ${label}`);
      input.value = key === 'name' ? item[key] : numberText(item[key]);
      if (key === 'name') input.maxLength = 120;
      else { input.className = 'money-input'; input.inputMode = 'decimal'; input.maxLength = 18; }
      cell.append(input); addPrintValue(input); row.append(cell);
      input.addEventListener('input', () => {
        if (key === 'name') item[key] = input.value;
        else {
          const raw = input.value.replaceAll(',', '');
          const value = Number(raw);
          const max = key === 'quantity' ? 1000000 : 1000000000;
          if (!/^\d*(\.\d{0,2})?$/.test(raw) || !Number.isFinite(value) || value > max) {
            input.setCustomValidity(`0부터 ${numberText(max)}까지, 소수 둘째 자리까지 입력해 주세요.`); input.reportValidity(); return;
          }
          input.setCustomValidity(''); item[key] = value;
        }
        syncPrint(input); row.querySelector('.amount').textContent = won(item.quantity * item.price); updateTotals(); save();
      });
      input.addEventListener('blur', () => { if (key !== 'name') { input.value = numberText(item[key]); input.setCustomValidity(''); syncPrint(input); } });
    });
    const amount = document.createElement('td'); amount.className = 'amount'; amount.dataset.label = '금액'; amount.textContent = won(item.quantity * item.price); row.append(amount);
    const control = document.createElement('td'); control.className = 'no-print';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-item'; remove.textContent = '삭제'; remove.setAttribute('aria-label', `${index + 1}번째 품목 삭제`);
    remove.addEventListener('click', () => { state.items.splice(index, 1); renderRows(); updateTotals(); save(); const next = $('items').querySelectorAll('button')[Math.min(index, state.items.length - 1)]; (next || $('add-item')).focus(); });
    control.append(remove); row.append(control); $('items').append(row);
  });
}
function render() {
  $('quote-number').textContent = state.number; $('quote-date').textContent = state.date;
  document.querySelectorAll('[data-field]').forEach(input => { input.value = state[input.dataset.field]; if (!input.nextElementSibling?.classList.contains('print-value')) addPrintValue(input); else syncPrint(input); });
  renderRows(); updateTotals();
}
document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => { state[input.dataset.field] = input.value; syncPrint(input); save(); }));
$('add-item').addEventListener('click', () => { state.items.push({ name:'', quantity:1, price:0 }); renderRows(); updateTotals(); save(); $('items').lastElementChild.querySelector('input').focus(); });
$('clear').addEventListener('click', () => {
  if (!window.confirm('작성한 내용을 모두 지우시겠습니까? 지운 내용은 되돌릴 수 없습니다.')) return;
  state = freshQuote(false); render(); save(); $('recipient').focus();
});
$('print').addEventListener('click', () => window.print());
/* A4의 여백 안쪽 높이에 맞추며, 인쇄가 끝나면 화면 크기로 돌아옵니다. */
window.addEventListener('beforeprint', () => {
  const paper = document.querySelector('.document');
  paper.style.setProperty('--print-scale', '1');
  const availableHeight = 270 * 96 / 25.4;
  const scale = Math.min(1, availableHeight / paper.getBoundingClientRect().height);
  paper.style.setProperty('--print-scale', String(scale));
});
window.addEventListener('afterprint', () => document.querySelector('.document').style.removeProperty('--print-scale'));
/* 한글이 엑셀에서도 잘 보이도록 표시를 넣고, 쉼표와 줄바꿈을 보호합니다. */
function csvCell(value) {
  let text = String(value);
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
$('export').addEventListener('click', () => {
  const sums = totals();
  const rows = [['견적서'],['견적 번호',state.number],['작성일',state.date],['받는 곳',state.recipient],['받는 곳 연락처',state.recipientContact],['보내는 곳',state.sender],['담당자',state.senderPerson],['보내는 곳 연락처',state.senderContact],[],['품목','수량','단가 (원)','금액 (원)'],...state.items.map(item => [item.name,item.quantity,item.price,Math.round(item.quantity * item.price)]),[],['공급가액 (원)',sums.subtotal],['부가세 10% (원)',sums.tax],['총 견적 금액 (원)',sums.total],['안내 사항',state.notes]];
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${state.number}.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
if (storageAvailable) save();
else $('save-status').textContent = '이전 저장 내용을 불러오지 못했습니다. 입력 후 저장 상태를 확인해 주세요.';
