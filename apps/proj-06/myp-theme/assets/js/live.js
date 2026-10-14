/* MYP 直播 + 弹幕 + 礼物 */
let currentLiveId = 0;

function mypLoadLives() {
  fetch(MYP_API.rest + 'live', { headers: { 'X-WP-Nonce': MYP_API.nonce } })
    .then(r => r.json()).then(r => {
      const list = r.data || [];
      let html = '';
      list.forEach(l => {
        html += `<div style="cursor:pointer;border:1px solid #eee;border-radius:8px;padding:8px;width:160px" onclick="mypEnterLive(${l.id})">
          <div style="background:#222;color:#fff;text-align:center;border-radius:4px">${l.status === 'living' ? '直播中' : '未开播'}</div>
          <div style="font-size:13px;margin-top:4px">${l.title}</div></div>`;
      });
      document.getElementById('myp-live-list').innerHTML = html;
    });
}

function mypEnterLive(id) {
  currentLiveId = id;
  fetch(MYP_API.rest + 'live/' + id, { headers: { 'X-WP-Nonce': MYP_API.nonce } })
    .then(r => r.json()).then(r => {
      if (r.data && r.data.play_url) {
        document.getElementById('myp-live-player').innerHTML =
          '<video src="' + r.data.play_url + '" autoplay controls style="width:100%;height:100%"></video>';
      }
    });
}

function mypSendDanmu() {
  const input = document.getElementById('myp-danmu-input');
  const content = input.value.trim();
  if (!content || !currentLiveId) return;
  fetch(MYP_API.rest + 'live/' + currentLiveId + '/danmu', {
    method: 'POST', headers: { 'X-WP-Nonce': MYP_API.nonce, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  }).then(r => r.json()).then(() => {
    const box = document.getElementById('myp-danmu-box');
    box.innerHTML += '<p>' + content + '</p>';
    input.value = '';
  });
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('myp-live-list')) mypLoadLives();
});
