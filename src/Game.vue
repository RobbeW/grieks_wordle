<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  getWordOfTheDay,
  allWords,
  encodeBase64Unicode,
  normalizeGreekWord
} from './words'
import Keyboard from './Keyboard.vue'
import { LetterState } from './types'

// Code voor de modal en de copy van custom word of the day:
let isModalVisible = ref(false)
let customWord = ref('')
let generatedUrl = ref('')

function openModal() {
  isModalVisible.value = true
}

function closeModal() {
  isModalVisible.value = false
}

function generateUrl() {
  const normalizedWord = normalizeGreekWord(customWord.value)
  if (normalizedWord && normalizedWord.length === 5) {
    const encodedWord = encodeBase64Unicode(normalizedWord)
    generatedUrl.value = `http://latijnwordle.netlify.app/?${encodedWord}`
    showMessage('URL gereed om te kopiëren.')
  } else {
    showMessage('Voer een woord in met vijf karakters!')
  }
}

function copyUrlToClipboard() {
  navigator.clipboard
    .writeText(generatedUrl.value)
    .then(() => showMessage('URL gekopieerd naar jouw klembord.'))
    .catch(() => showMessage('Kopiëren van URL mislukt. Probeer het zelf.'))
}

// Krijg het woord van de dag:
const answer = getWordOfTheDay()

// Koppel het woord van de dag aan de URL voor de woordenboekfunctie:
const dictionaryUrl = $computed(
  () => `https://www.perseus.tufts.edu/hopper/morph?l=${answer}&la=grc`
)

// Board state instellen:
const board = $ref(
  Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({
      letter: '',
      state: LetterState.INITIAL
    }))
  )
)

let gameFinished = $ref(false)
let gameWin = $ref(false)
let currentRowIndex = $ref(0)
const currentRow = $computed(() => board[currentRowIndex])

let message = $ref('')
let grid = $ref('')
let shakeRowIndex = $ref(-1)
let success = $ref(false)

// Bijhouden van de letters op het toetsenbord
const letterStates: Record<string, LetterState> = $ref({})

// Keyboard input.
let allowInput = true

const onKeyup = (e: KeyboardEvent) => onKey(e.key)

window.addEventListener('keyup', onKeyup)

onUnmounted(() => {
  window.removeEventListener('keyup', onKeyup)
})

function onKey(key: string) {
  if (!allowInput) return

  const normalizedKey = normalizeGreekWord(key)
  if (/^\p{Script=Greek}$/u.test(normalizedKey)) {
    fillTile(normalizedKey)
  } else if (key === 'Backspace') {
    clearTile()
  } else if (key === 'Enter') {
    completeRow()
  }
}

function fillTile(letter: string) {
  for (const tile of currentRow) {
    if (!tile.letter) {
      tile.letter = letter
      break
    }
  }
}

function clearTile() {
  for (const tile of [...currentRow].reverse()) {
    if (tile.letter) {
      tile.letter = ''
      break
    }
  }
}

function completeRow() {
  if (!allowInput) return

  if (currentRow.every((tile) => tile.letter)) {
    const guess = currentRow.map((tile) => tile.letter).join('')

    if (!allWords.includes(guess) && guess !== answer) {
      shake()
      showMessage('Niet in woordenlijst.')
      return
    }

    allowInput = false

    // Markeer de staat van elke tile in de huidige rij
    const answerLetters: (string | null)[] = answer.split('')

    // Eerste pass: markeer correcte letters
    currentRow.forEach((tile, i) => {
      if (answerLetters[i] === tile.letter) {
        tile.state = letterStates[tile.letter] = LetterState.CORRECT
        answerLetters[i] = null
      }
    })

    // Tweede pass: markeer aanwezige letters
    currentRow.forEach((tile) => {
      if (
        tile.state !== LetterState.CORRECT &&
        answerLetters.includes(tile.letter)
      ) {
        tile.state = letterStates[tile.letter] = LetterState.PRESENT
        answerLetters[answerLetters.indexOf(tile.letter)] = null
      }
    })

    // Derde pass: markeer afwezige letters
    currentRow.forEach((tile) => {
      if (!tile.state) {
        tile.state = letterStates[tile.letter] = LetterState.ABSENT
      }
    })

    // Controleer of de rij volledig correct is
    if (currentRow.every((tile) => tile.state === LetterState.CORRECT)) {
      setTimeout(() => {
        grid = genResultGrid()
        showMessage('Gewonnen!', 3000)
        success = true
        gameWin = true
        gameFinished = true // Game is uigesteld, verander variabelen.
        // Kopieer het resultaat naar klembord niet nodig
      }, 3000)
    } else if (currentRowIndex < board.length - 1) {
      // Ga naar de volgende rij
      currentRowIndex++
      setTimeout(() => {
        allowInput = true
      }, 1600)
    } else {
      // Game over logica
      gameFinished = true
      setTimeout(() => {
        showMessage('Juiste antwoord: ' + answer.toUpperCase(), 3000)
      }, 1600)
    }
  } else {
    shake()
    showMessage('Onvoldoende letters.')
  }
}

// Functie om bericht weer te geven
function showMessage(msg: string, time = 1000) {
  message = msg
  if (time > 0) {
    setTimeout(() => {
      message = ''
    }, time)
  }
}

// Functie om de rij te schudden
function shake() {
  shakeRowIndex = currentRowIndex
  setTimeout(() => {
    shakeRowIndex = -1
  }, 1000)
}

// Emoji-iconen voor de verschillende staten
const icons: Record<number, string | null> = {
  [LetterState.CORRECT]: '🟩',
  [LetterState.PRESENT]: '🟨',
  [LetterState.ABSENT]: '⬜',
  [LetterState.INITIAL]: null
}

// Genereer resultaatgrid voor delen
function genResultGrid() {
  return board
    .slice(0, currentRowIndex + 1)
    .map((row) => row.map((tile) => icons[tile.state]).join(''))
    .join('\n')
}

// Functie om deelbaar resultaat te genereren
function generateShareableResult() {
  const title = `GRIEKSE WORDLE ${currentRowIndex + 1}/6`
  const gridText = board
    .slice(0, currentRowIndex + 1)
    .map((row) => row.map((tile) => icons[tile.state]).join(''))
    .join('\n')

  return `${title}\n\n${gridText} // Probeer zelf op latijnwordle.netlify.app`
}

// Functie om resultaat naar klembord te kopiëren
function copyResultToClipboard() {
  const result = generateShareableResult()
  navigator.clipboard
    .writeText(result)
    .then(() => showMessage('Resultaat gekopieerd naar klembord!'))
    .catch(() => showMessage('Kopiëren van resultaat mislukt. Probeer het zelf.'))
}

function promptForCustomWord() {
  const custom = window.prompt('Voer een Grieks woord in met vijf tekens:')
  const normalizedWord = normalizeGreekWord(custom ?? '')
  if (normalizedWord && normalizedWord.length === 5) {
    const encodedWord = encodeBase64Unicode(normalizedWord)
    const newUrl = `http://latijnwordle.netlify.app/?${encodedWord}`
    generatedUrl.value = newUrl
    showMessage('Klik op de knop om de URL te kopiëren.')
  } else {
    showMessage('Voer een woord in met vijf karakters!')
  }
}
</script>

<!-- Roboto Font inladen -->
<link
  href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&amp;display=swap"
  rel="stylesheet"
/>

<template>
  <div class="app">
    <div v-if="isModalVisible" class="custom-modal">
      <div class="custom-modal__panel">
        <input
          v-model="customWord"
          type="text"
          placeholder="Voer een Grieks woord in met vijf tekens"
        />
        <div class="custom-modal__buttons">
          <button class="button" @click="generateUrl">Genereer URL</button>
          <button class="button" @click="copyUrlToClipboard">Kopieer URL</button>
          <button class="button" @click="closeModal">Sluit</button>
        </div>
        <p v-if="generatedUrl" class="custom-modal__url">{{ generatedUrl }}</p>
      </div>
    </div>

    <Transition>
      <div class="message" v-if="message">
        {{ message }}
        <pre v-if="grid">{{ grid }}</pre>
      </div>
    </Transition>

    <header class="header">
      <h1>GRIEKSE WORDLE</h1>

      <div class="button-container">
        <button class="button" @click="openModal">Stel een eigen woord in!</button>

        <a
          :href="dictionaryUrl"
          :class="{ 'button-disabled': !gameFinished, button: gameFinished }"
          @click="gameFinished ? null : $event.preventDefault()"
          class="button"
          target="_blank"
          rel="noreferrer"
        >
          Zoek het woord op!
        </a>

        <a class="button" href="https://www.robbewulgaert.be" target="_blank" rel="noreferrer">
          Vragen, opmerkingen?
        </a>

        <button
          class="button"
          :class="{ 'button-disabled': !gameFinished || !gameWin, button: gameFinished && gameWin }"
          @click="gameFinished && gameWin ? copyResultToClipboard() : null"
        >
          Deel resultaat
        </button>
      </div>
    </header>

    <main class="main">
      <div class="board">
        <div
          v-for="(row, r) in board"
          :key="r"
          class="row"
          :class="{ shake: r === shakeRowIndex }"
        >
          <div
            v-for="(tile, c) in row"
            :key="c"
            class="tile"
            :class="{
              correct: tile.state === LetterState.CORRECT,
              present: tile.state === LetterState.PRESENT,
              absent: tile.state === LetterState.ABSENT
            }"
          >
            {{ tile.letter }}
          </div>
        </div>
      </div>

      <Keyboard :letterStates="letterStates" @key="onKey" />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  font-family: Roboto, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}

.header {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 8px 0 0 0;
  font-size: 24px;
  letter-spacing: 1px;
}

.button-container {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.button {
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: #5200ff;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.button-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.main {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

.board {
  width: 100%;
  display: grid;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.tile {
  height: 52px;
  border-radius: 10px;
  border: 2px solid #e3e3e3;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  text-transform: uppercase;
  background: #fff;
}

.tile.correct {
  border-color: transparent;
  background: #2ea043;
  color: #fff;
}

.tile.present {
  border-color: transparent;
  background: #d29922;
  color: #fff;
}

.tile.absent {
  border-color: transparent;
  background: #8b949e;
  color: #fff;
}

.message {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 20, 0.92);
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  z-index: 20;
  max-width: min(560px, calc(100vw - 24px));
  white-space: pre-wrap;
}

.message pre {
  margin: 10px 0 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  line-height: 1.2;
}

.custom-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 30;
  padding: 16px;
}

.custom-modal__panel {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custom-modal input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 2px solid #e3e3e3;
  font-size: 16px;
}

.custom-modal__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.custom-modal__url {
  margin: 0;
  font-size: 14px;
  word-break: break-all;
  color: #1a224c;
}

@keyframes shake {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
  100% {
    transform: translateX(0);
  }
}

.row.shake {
  animation: shake 0.5s ease-in-out;
}
</style>
