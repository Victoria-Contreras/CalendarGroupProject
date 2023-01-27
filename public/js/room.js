const chatInput = document.getElementsByClassName("chatInput");
let roomNumber = chatInput[0].id;

const socket = io({query:`room=${roomNumber}`});

window.onload=function () {
  let messages = document.getElementById('messages');
  messages.scrollTop = messages.scrollHeight;
}

socket.on('chat message', function(msg) {
  let lastMessage = document.getElementById('messages').lastElementChild;
  let localDate = new Date(msg.date);
  lastMessage.insertAdjacentHTML('afterend', `<div><h4>${msg.name}</h4><p style="font-size: 10px">${localDate}</p><p>${msg.message}</p></div><br>`);
  messages.scrollTo(0, messages.scrollHeight);
});