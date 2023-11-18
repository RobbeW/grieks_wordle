<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { getWordOfTheDay, allWords } from './words'
import Keyboard from './Keyboard.vue'
import { LetterState } from './types'


// Code voor de model en de copy van custom word of the day: 
let isModalVisible = ref(false);
let customWord = ref('');
let generatedUrl = ref('');

function openModal() {
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
}

function generateUrl() {
  if (customWord.value && customWord.value.length === 5) {
    const encodedWord = btoa(customWord.value.toLowerCase());
    generatedUrl.value = `http://latijnwordle.netlify.app/?${encodedWord}`;
    showMessage('URL gereed om te kopiëren.');
  } else {
    showMessage('Voer een woord in met quinque karaters!');
  }
}

function copyUrlToClipboard() {
  navigator.clipboard.writeText(generatedUrl.value)
    .then(() => showMessage('URL gekopieerd naar jouw klembord.'))
    .catch(err => showMessage('Kopiëren van URL mislukt. Probeer het zelf.'));
}

// Krijg het woord van de dag: 
const answer = getWordOfTheDay()

// Koppel het woord van de dag aan de URL voor de woordenboekfunctie:
const dictionaryUrl = $computed(() => `https://www.perseus.tufts.edu/hopper/morph?l=${answer}&la=la`);
  
// Board state instellen: 
const board = $ref(
  Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({
      letter: '',
      state: LetterState.INITIAL
    }))
  )
)

let gameFinished = $ref(false);
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
  if (/^[a-zA-Z]$/.test(key)) {
    fillTile(key.toLowerCase())
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
  if (currentRow.every((tile) => tile.letter)) {
    const guess = currentRow.map((tile) => tile.letter).join('');
    if (!allWords.includes(guess) && guess !== answer) {
      shake();
      showMessage(`non in glossario`);
      return;
    }

    // Marking the state of each tile in the current row
    const answerLetters = answer.split('');
    // First pass: mark correct ones
    currentRow.forEach((tile, i) => {
      if (answerLetters[i] === tile.letter) {
        tile.state = letterStates[tile.letter] = LetterState.CORRECT;
        answerLetters[i] = null;
      }
    });
    // Second pass: mark present ones
    currentRow.forEach((tile) => {
      if (tile.state !== LetterState.CORRECT && answerLetters.includes(tile.letter)) {
        tile.state = letterStates[tile.letter] = LetterState.PRESENT;
        answerLetters[answerLetters.indexOf(tile.letter)] = null;
      }
    });
    // Third pass: mark absent ones
    currentRow.forEach((tile) => {
      if (!tile.state) {
        tile.state = letterStates[tile.letter] = LetterState.ABSENT;
      }
    });

    // Check if the row is entirely correct
    if (currentRow.every((tile) => tile.state === LetterState.CORRECT)) {
      setTimeout(() => {
        grid = genResultGrid();
        showMessage('Victoria!', 3000);
        success = true;
        gameFinished = true; // Game is uigesteld, verander variabelen. 
      }, 3000);
    } else if (currentRowIndex < board.length - 1) {
      // Move to the next row
      currentRowIndex++;
      setTimeout(() => {
        allowInput = true;
      }, 1600);
    } else {
      // Game over logic
      setTimeout(() => {
        showMessage('responsum emendatum ' + answer.toUpperCase(), 3000);
      }, 1600);
    }
  } else {
    shake();
    showMessage('litterae non sufficiunt');
  }
}


function showMessage(msg: string, time = 1000) {
  message = msg
  if (time > 0) {
    setTimeout(() => {
      message = ''
    }, time)
  }
}

function shake() {
  shakeRowIndex = currentRowIndex
  setTimeout(() => {
    shakeRowIndex = -1
  }, 1000)
}

const icons = {
  [LetterState.CORRECT]: '🟩',
  [LetterState.PRESENT]: '🟨',
  [LetterState.ABSENT]: '⬜',
  [LetterState.INITIAL]: null
}

function genResultGrid() {
  return board
    .slice(0, currentRowIndex + 1)
    .map((row) => {
      return row.map((tile) => icons[tile.state]).join('')
    })
    .join('\n')
}

function promptForCustomWord() {
  const customWord = window.prompt('Voer een Latijns woord in met vijf tekens:');
  if (customWord && customWord.length === 5) {
    const encodedWord = btoa(customWord.toLowerCase());
    const newUrl = `http://latijnwordle.netlify.app/?${encodedWord}`;
    // Sla de URL op in een state of data-eigenschap in plaats van direct te proberen te kopiëren
    this.generatedUrl = newUrl;
    // Geef aan de gebruiker aan dat ze op een knop moeten klikken om de URL te kopiëren
    showMessage('Klik op de knop om de URL te kopiëren.');
  } else {
    showMessage('Voer een woord in met quinque karaters!');
  }
}


</script>
<!-- Roboto Font inladen -->
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&amp;display=swap" rel="stylesheet">

<template>
<div v-if="isModalVisible" class="custom-modal">
  <input v-model="customWord" type="text" placeholder="Voer een Latijns woord in met vijf tekens">
  <button class="button" @click="generateUrl">Genereer URL</button>
  <button class="button" @click="copyUrlToClipboard">Kopieer URL</button>
  <button class="button" @click="closeModal">Sluit</button>
</div>
  <Transition>
    <div class="message" v-if="message">
      {{ message }}
      <pre v-if="grid">{{ grid }}</pre>
    </div>
  </Transition>
  <header>
    <h1>LATIJNSE VVORDLE</h1>

  <!--Knoppen bovenaan de pagina.-->
  <div class="button-container">
  
  <!-- knop 1 -->
  <button class="button" @click="openModal">Stel een eigen woord in!</button>

  <!-- knop 2 -->
   <a :href="dictionaryUrl"
   :class="{'button-disabled': !gameFinished, 'button': gameFinished}"
   @click="gameFinished ? null : $event.preventDefault()"
   class="button"
   target="_blank">Zoek het woord op!</a>

  
  <!-- knop 3 -->
  <a 
    class="button"
    href="https://www.robbewulgaert.be" 
    target="_blank"
  >Vragen, opmerkingen?</a>
  </div>


  </header>
  <div id="board">
    <div
      v-for="(row, index) in board"
      :class="[
        'row',
        shakeRowIndex === index && 'shake',
        success && currentRowIndex === index && 'jump'
      ]"
    >
      <div
        v-for="(tile, index) in row"
        :class="['tile', tile.letter && 'filled', tile.state && 'revealed']"
      >
        <div class="front" :style="{ transitionDelay: `${index * 300}ms` }">
          {{ tile.letter }}
        </div>
        <div
          :class="['back', tile.state]"
          :style="{
            transitionDelay: `${index * 300}ms`,
            animationDelay: `${index * 100}ms`
          }"
        >
          {{ tile.letter }}
        </div>
      </div>
    </div>
  </div>
  <Keyboard @key="onKey" :letter-states="letterStates" />
</template>

<style scoped>
#board {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  grid-gap: 5px;
  padding: 10px;
  box-sizing: border-box;
  --height: min(420px, calc(var(--vh, 100vh) - 310px));
  height: var(--height);
  width: min(350px, calc(var(--height) / 6 * 5));
  margin: 0px auto;
}
.message {
  position: absolute;
  left: 50%;
  top: 80px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.85);
  padding: 16px 20px;
  z-index: 2;
  border-radius: 4px;
  transform: translateX(-50%);
  transition: opacity 3s ease-out;
  font-weight: 600;
}

@media (max-width: 768px) {  
  .message {
    top: 200px;  
  }
}

.message.v-leave-to {
  opacity: 0;
}
.row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 5px;
}
.tile {
  width: 100%;
  font-size: 2rem;
  line-height: 2rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
  user-select: none;
  position: relative;
}
.tile.filled {
  animation: zoom 0.2s;
}
.tile .front,
.tile .back {
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.tile .front {
  border: 2px solid #d3d6da;
}
.tile.filled .front {
  border-color: #999;
}
.tile .back {
  transform: rotateX(180deg);
}
.tile.revealed .front {
  transform: rotateX(180deg);
}
.tile.revealed .back {
  transform: rotateX(0deg);
}

@keyframes zoom {
  0% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0% {
    transform: translate(1px);
  }
  10% {
    transform: translate(-2px);
  }
  20% {
    transform: translate(2px);
  }
  30% {
    transform: translate(-2px);
  }
  40% {
    transform: translate(2px);
  }
  50% {
    transform: translate(-2px);
  }
  60% {
    transform: translate(2px);
  }
  70% {
    transform: translate(-2px);
  }
  80% {
    transform: translate(2px);
  }
  90% {
    transform: translate(-2px);
  }
  100% {
    transform: translate(1px);
  }
}

.jump .tile .back {
  animation: jump 0.5s;
}

@keyframes jump {
  0% {
    transform: translateY(0px);
  }
  20% {
    transform: translateY(5px);
  }
  60% {
    transform: translateY(-25px);
  }
  90% {
    transform: translateY(3px);
  }
  100% {
    transform: translateY(0px);
  }
}

@media (max-height: 680px) {
  .tile {
    font-size: 3vh;
  }
}

.custom-modal {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.custom-modal .button {
  display: inline-block;
  padding: 10px 20px;
  margin: 5px;
  font-size: 16px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  outline: none;
  color: #fff;
  background-color: #5200ff;
  border: none;
  border-radius: 5px;
  box-shadow: 0 9px #999;
}


</style>
