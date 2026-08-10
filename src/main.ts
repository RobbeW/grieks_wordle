import { createApp } from 'vue'
import Game from './Game.vue'
import './game.css' 
import { loadWordsFromUrl, setWordList } from './words'

async function init() {
  const wordListUrl = (import.meta.env.VITE_WORD_LIST_URL as string | undefined) ?? '/words.js'
  if (wordListUrl) {
    try {
      const words = await loadWordsFromUrl(wordListUrl)
      setWordList(words)
    } catch (error) {
      console.warn('Kon de woordenlijst niet laden:', error)
    }
  }

  createApp(Game).mount('#app')
}

void init()
