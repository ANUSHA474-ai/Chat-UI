const socket = io();

const userName = prompt("Enter your name:") || "Anonymous";
socket.emit('join', userName);

const messagesDiv = document.getElementById('messages');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Fetch last messages
fetch('/api/messages')
  .then(res => res.json())
  .then(data => data.forEach(msg => addMessage(msg)));

// Listen for new messages
socket.on('chat message', addMessage);

// Send message
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit('chat message', msg);
  input.value = '';
}

function addMessage(msg) {
  const div = document.createElement('div');
  div.className = 'message';
  div.textContent = `[${new Date(msg.created_at).toLocaleTimeString()}] ${msg.user_name}: ${msg.message}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
