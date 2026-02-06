const defaultMessage = ' We gebruiken het standaard woord-van-de-dag.'

export function normalizeGreekWord(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function encodeBase64Unicode(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

function decodeBase64Unicode(value: string) {
  return decodeURIComponent(escape(atob(value)))
}

function seedRandom(seed: number) {
  var m = 0x80000000,
    a = 1103515245,
    c = 12345
  return function () {
    seed = (a * seed + c) % m
    return seed / (m - 1)
  }
}

export function getWordOfTheDay() {
  if (location.search) {
    try {
      const query = normalizeGreekWord(decodeBase64Unicode(location.search.slice(1)))
      if (query.length !== 5) {
        alert(`Incorrect aantal karakters in jouw gekozen woord. ${defaultMessage}`)
      } else {
        return query
      }
    } catch (e) {
      alert(`Oei, foutje in de link. ${defaultMessage}`)
    }
  }

  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const random = seedRandom(seed)
  const randomIndex = Math.floor(random() * answers.length)
  return answers[randomIndex]
}

const defaultAnswers = [
  'ΛΟΓΟΣ',
  'ΑΓΑΠΗ',
  'ΔΩΡΟΝ',
  'ΓΡΑΦΗ',
  'ΤΕΛΟΣ',
  'ΝΟΜΟΣ',
  'ΧΑΡΙΣ',
  'ΣΟΦΟΣ',
  'ΠΟΛΙΣ',
  'ΚΑΙΡΟ',
]

let answers = [...defaultAnswers]
let allowedGuesses = [...defaultAnswers]
export let allWords = [...answers, ...allowedGuesses]

export function setWordList(words: string[]) {
  const normalizedWords = words
    .map((word) => normalizeGreekWord(word))
    .filter((word) => word.length === 5)
  if (normalizedWords.length === 0) {
    return
  }
  answers = normalizedWords
  allowedGuesses = normalizedWords
  allWords = [...answers, ...allowedGuesses]
}

export async function loadWordsFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load word list: ${response.status}`)
  }
  const text = await response.text()
  const matches = [...text.matchAll(/([Α-Ω]{5})\s*:\s*true/g)]
  return matches.map((match) => match[1])
}
