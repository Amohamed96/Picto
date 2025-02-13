import React from "react";
import { useState, useEffect } from "react";
import { GridUL } from "../grid/GridUL";
import { Keyboard } from "../keyboard/Keyboard";
import { InfoModal } from "../modals/InfoModal";
import { StatsModal } from "../modals/StatsModal";
import { SettingsModal } from "../modals/SettingsModal";
import axios from "axios";
import { generateEmojiGrid , getEmojiTiles} from '../../lib/share'
import { Link } from "react-router-dom";
import { getStatusesUL } from "../../lib/statusesUL";
import './pagesUL.scss'
import FireUL from "./FireUL";

import {
  WIN_MESSAGES,
  GAME_COPIED_MESSAGE,
  NOT_ENOUGH_LETTERS_MESSAGE,
  WORD_NOT_FOUND_MESSAGE,
  CORRECT_WORD_MESSAGE_UNLIMITED,
  HARD_MODE_ALERT_MESSAGE,
} from "../../constants/strings";
import {
  MAX_WORD_LENGTH,
  MAX_CHALLENGES,
  REVEAL_TIME_MS,
  GAME_LOST_INFO_DELAY,
  WELCOME_INFO_MODAL_MS,
} from "../../constants/settings";
import {
  isWordInWordListUL,
  isWinningWordUL,
  solutionUL,
  findFirstUnusedReveal,
  unicodeLength,
} from "../../lib/wordsUnlimited";
import { addStatsForCompletedGame, loadStats } from "../../lib/stats";
import {
  loadGameStateFromLocalStorageUL,
  saveGameStateToLocalStorageUL,
  setStoredIsHighContrastMode,
  getStoredIsHighContrastMode,
} from "../../lib/localStorageUL";
import { default as GraphemeSplitter } from "grapheme-splitter";

import "../../App.css";
import { AlertContainer } from "../alerts/AlertContainer";
import { useAlert } from "../../context/AlertContext";
import { NavbarUL } from "../navbar/NavbarUL";
import { getRandomWord, localeAwareUpperCase } from "../../lib/wordsUnlimited";
import { solution } from "../../lib/words";
function Unlimited() {
  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  const { showError: showErrorAlert, showSuccess: showSuccessAlert } =
    useAlert()
  const [currentGuess, setCurrentGuess] = useState('')
  const [statistic, setStatistics] = useState({heatmap: '', attempts: 0})
  const [isGameWon, setIsGameWon] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [currentRowClassUL, setCurrentRowClassUL] = useState('')
  const [isGameLost, setIsGameLost] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme')
      ? localStorage.getItem('theme') === 'dark'
      : prefersDarkMode
      ? true
      : false
  )
  const [isHighContrastMode, setIsHighContrastMode] = useState(
    getStoredIsHighContrastMode()
  )
  const [isRevealing, setIsRevealing] = useState(false)
  const [guesses, setGuesses] = useState<string[]>(() => {
    const loadedUL = loadGameStateFromLocalStorageUL()
    if (loadedUL?.solutionUL !== solutionUL) {
      return []
    }
    const gameWasWon = loadedUL.guesses.includes(solutionUL)
    if (gameWasWon) {
      setIsGameWon(true)
    }
    if (loadedUL.guesses.length === MAX_CHALLENGES && !gameWasWon) {
      setIsGameLost(true)
      showErrorAlert(CORRECT_WORD_MESSAGE_UNLIMITED( loadedUL.solutionUL ), {
        persist: true,
      })
    }
    return loadedUL.guesses
  })


  const [isHardMode, setIsHardMode] = useState(
    localStorage.getItem('gameMode')
      ? localStorage.getItem('gameMode') === 'hard'
      : false
  )

  // useEffect(() => {
  //   // if no game state on load,
  //   // show the user the how-to info modal
  //   if (!loadGameStateFromLocalStorageUL()) {
  //     setTimeout(() => {
  //       setIsInfoModalOpen(true)
  //     }, WELCOME_INFO_MODAL_MS)
  //   }
  // }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (isHighContrastMode) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isDarkMode, isHighContrastMode])

  const handleDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleHardMode = (isHard: boolean) => {
    if (guesses.length === 0 || localStorage.getItem('gameMode') === 'hard') {
      setIsHardMode(isHard)
      localStorage.setItem('gameMode', isHard ? 'hard' : 'normal')
    } else {
      showErrorAlert(HARD_MODE_ALERT_MESSAGE)
    }
  }

  const handleHighContrastMode = (isHighContrast: boolean) => {
    setIsHighContrastMode(isHighContrast)
    setStoredIsHighContrastMode(isHighContrast)
  }

  const clearCurrentRowClassUL = () => {
    setCurrentRowClassUL('')
  }


  let tiles: string[] = []
  const getEmojiTiles = (isDarkMode: boolean, isHighContrastMode: boolean) => {
    tiles.push(isHighContrastMode ? '✅' : '🟩')
    tiles.push(isHighContrastMode ? '1️⃣' : '🟥')
    tiles.push(isHighContrastMode ? '2️⃣' : '🟥')
    tiles.push(isHighContrastMode ? '3️⃣' : '🟧')
    tiles.push(isHighContrastMode ? '5️⃣' : '🟨')
    tiles.push(isHighContrastMode ? '7️⃣' : '🟦')
    tiles.push(isHighContrastMode ? '🔟' : '🟦')
    tiles.push(isDarkMode ? '⬛' : '⬜')
  return tiles
  }
  getEmojiTiles(true,false)
  let heatmap: string = generateEmojiGrid(guesses,tiles)
  

  useEffect(() => {
    if (isGameWon) {
      const winMessage =
        WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
      const delayMs = REVEAL_TIME_MS * MAX_WORD_LENGTH

      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => setIsStatsModalOpen(true),
      })
    }

    if (isGameLost) {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, GAME_LOST_INFO_DELAY)
    }
  }, [isGameWon, isGameLost, showSuccessAlert])

  const onChar = (value: string) => {
    if (
      unicodeLength(`${currentGuess}${value}`) <= MAX_WORD_LENGTH &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setCurrentGuess(`${currentGuess}${value}`)
    }
  }

  const onDelete = () => {
    setCurrentGuess(
      new GraphemeSplitter().splitGraphemes(currentGuess).slice(0, -1).join('')
    )
  }

    const onReset = () => {
      setCurrentGuess('')
      setIsGameWon(false)
      setIsGameLost(false)
      setGuesses([])
      window.location.reload();

  }
  const onEnter = () => {
    if (isGameWon || isGameLost) {
      return
    }

    if (!(unicodeLength(currentGuess) === MAX_WORD_LENGTH)) {
      setCurrentRowClassUL('jiggle')
      return showErrorAlert(NOT_ENOUGH_LETTERS_MESSAGE, {
        onClose: clearCurrentRowClassUL,
      })
    }

    if (!isWordInWordListUL(currentGuess)) {
      setCurrentRowClassUL('jiggle')
      return showErrorAlert(WORD_NOT_FOUND_MESSAGE, {
        onClose: clearCurrentRowClassUL,
      })
    }

    // enforce hard mode - all guesses must contain all previously revealed letters
    if (isHardMode) {
      const firstMissingReveal = findFirstUnusedReveal(currentGuess, guesses)
      if (firstMissingReveal) {
        setCurrentRowClassUL('jiggle')
        return showErrorAlert(firstMissingReveal, {
          onClose: clearCurrentRowClassUL,
        })
      }
    }

    setIsRevealing(true)
    // turn this back off after all
    // chars have been revealed
    setTimeout(() => {
      setIsRevealing(false)
    }, REVEAL_TIME_MS * MAX_WORD_LENGTH)

    const winningWord = isWinningWordUL(currentGuess)

    if (
      unicodeLength(currentGuess) === MAX_WORD_LENGTH &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setGuesses([...guesses, currentGuess])
      setCurrentGuess('')

      if (winningWord) {
        return setIsGameWon(true)
      }

      if (guesses.length === MAX_CHALLENGES - 1) {
        setIsGameLost(true)
        showErrorAlert(CORRECT_WORD_MESSAGE_UNLIMITED(solutionUL), {
          persist: true,
          delayMs: REVEAL_TIME_MS * MAX_WORD_LENGTH + 1,
        })
      }
    }
  }


  // useEffect(() => {
  //   saveGameStateToLocalStorageUL({ guesses, solutionUL })
  // }, [guesses])
const styles = {
  main: {
    height: "82vh"
  },
  button: {
   width: "10em",
   height: "3rem",
   color: "white",
   backgroundColor: " rgb(185 28 28)",
   borderRadius: 12,
   margin: '10px auto',

  },
  text: {
    margin: '5px auto',
    flexDirection: "row",
    justifyContent: 'center',
    alignItems: 'center',  },
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center"
  }

} as const;
 const linkBox = {
  color: "white",
  display: "flex",
  width: "10rem", 
  backgroundColor: "#475568",
  borderRadius: 10, 
  marginTop: "1rem",
  marginBottom: "1rem", 
  marginLeft: "1rem",
  justifyContent: "center",
  marginRight: "1rem", 
  alignItems: "center"
  }
 const linkBoxUL = {
      color: "white",
  display: "flex",
  width: "10rem", 
  backgroundColor: "#475568",
  borderRadius: 10, 
  marginTop: "1rem",
  marginBottom: "1rem", 
  marginLeft: "1rem",
  justifyContent: "center",
  marginRight: "1rem", 
  borderTop: "5px",
  borderColor: "red",
  borderStyle: "solid"

    //   display: flex;
    // margin-left: 1rem;
    // width: 10rem;
    // background-color: rgb(250, 204, 21);
    // border-radius: 10px;
    // margin-top: 1rem;
    // margin-bottom: 1rem;
    // justify-content: center;
    // margin-right: 1rem;
    // border-top: 5px solid red;
    // border-right-color: red;
    // border-bottom-color: red;
    // border-left-color: red;
    // border-right-style: solid;
    // border-bottom-style: solid;
    // border-left-style: solid;
  }
  return (
    <div>
      <div className="h-screen flex flex-col" style={styles.main}>
        <NavbarUL
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
        />
         {/* <FireUL /> */}
       <div style={styles.container}>
      <Link style={linkBoxUL} to="/unlimited">
        <button>UNLIMITED</button>
      </Link>
       <button onClick={onReset} style={linkBox}>      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
</svg></button>
       <Link style={linkBox} to="/">
        <button >DAILY</button>
      </Link>
      </div> 
        <div className="pt-2 px-1 pb-8 md:max-w-7xl w-full mx-auto sm:px-6 lg:px-8 flex flex-col grow">
          <div className="grid-space">
            <GridUL
              guessesUL={guesses}
              currentGuessUL={currentGuess}
              isRevealingUL={isRevealing}
              currentRowClassNameUL={currentRowClassUL}
            />
          </div>
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            guesses={guesses}
            isRevealing={isRevealing}
          />
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            handleClose={() => setIsSettingsModalOpen(false)}
            isHardMode={isHardMode}
            handleHardMode={handleHardMode}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={handleHighContrastMode}
          />
          <AlertContainer />
        </div>
      </div>
    </div>
  );
}

export default Unlimited;
