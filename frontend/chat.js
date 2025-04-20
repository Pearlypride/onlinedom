document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user.name) {
    alert('Пожалуйста, войдите в систему');
    window.location.href = 'login.html';
    return;
  }

  // Используй публичный URL для WebSocket из Codespaces
  const ws = new WebSocket('wss://<уникальный-код>.app.github.dev:3001');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const div = document.createElement('div');
    div.className = `p-2 ${message.user === user.name ? 'text-right text-blue-400' : 'text-left text-gray-200'}`;
    div.textContent = `${message.user}: ${message.text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chatInput.value.trim()) {
      ws.send(JSON.stringify({ user: user.name, text: chatInput.value }));
      chatInput.value = '';
    }
  });
});