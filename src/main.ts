import { createApp } from 'vue'
import Game from './Game.vue'
import './game.css'

// resize functie
window.addEventListener('resize', onResize)
// stel de afmetingen in bij opstarten
onResize()

function onResize() {
  // verkrijg de hoogte bij gebruik op smartphone
  document.body.style.setProperty('--vh', window.innerHeight + 'px')
}

createApp(Game).mount('#app')
