// Preview passcode gate (client-side only; keeps casual visitors out of the preview).
// Only a salted SHA-256 hash lives here, never the passcode itself.
(function(){var H="9b6e474cea8bc58118a7f32b5280d7c40a20c6bd54b21d2044ca6e45ca7a3212",S="d9b858bd1d72e0cd",K="cl_preview_ok";
var d=document.documentElement;try{if(localStorage.getItem(K)===H)return}catch(e){}d.classList.add("locked");
function hex(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}
document.addEventListener("DOMContentLoaded",function(){var g=document.createElement("div");g.id="gate";
g.innerHTML='<form><div class="logo">🐔 Cluck Life</div><p>Private preview. Enter the passcode.</p><input type="password" autocomplete="off" aria-label="Passcode"><button class="btn go" type="submit" style="width:100%">Enter</button><div class="err" role="alert"></div></form>';
document.body.appendChild(g);var f=g.querySelector("form"),i=g.querySelector("input"),er=g.querySelector(".err");i.focus();
f.addEventListener("submit",function(ev){ev.preventDefault();crypto.subtle.digest("SHA-256",new TextEncoder().encode(S+":"+i.value.trim().toLowerCase())).then(function(b){
if(hex(b)===H){try{localStorage.setItem(K,H)}catch(e){}d.classList.remove("locked");g.remove()}else{er.textContent="Wrong passcode.";i.select()}})})})})();
