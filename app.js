// /** @typedef {import('pear-interface')} */ /* global Pear */
// document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

// Hyperswarm helps to connect people who r interested at one common topic 🍀
// b4a to deal with arrays and buffer 

import Hyperswarm from "hyperswarm"
import crypto from "hypercore-crypto"
import b4a from "b4a"

const swarm = new Hyperswarm()

// Game constants 

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 400
const PADDLE_WIDTH = 10
const PADDLE_HEIGHT = 100
const BALL_SIZE = 10
const PADDLE_SPEED = 15
const BALL_SPEED = 3

class pongGame {
    constructor(canvas, playerId) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")
        this.playerId = playerId
        this.players = new Map()
        this.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED }

        this.scores = {}
        this.isHost = false

        this.ballImage = new Image()
        this.ballImage.src = "kawaii-cute-thinking-pear-fruit-J17X3H.jpg"    //replace with my own image path
        this.ballImage.onload = () => {
            this.ballLoaded = true
        }

        //setting canvas size
        this.canvas.width = CANVAS_WIDTH
        this.canvas.height = CANVAS_HEIGHT

        //Creating player paddle
        this.addPlayer(playerId)

        //Start game loop
        this.gameloop()
    }

    addPlayer(id) {
        if (this.players.size >= 2) return //limit 2 players

        const isleft = this.players.size === 0
        const x = isleft ? 0 : CANVAS_WIDTH - PADDLE_WIDTH
        this.players.set(id, { x, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0, isleft }) // Fixed `playerId.set`
        this.scores[id] = 0

        if (isleft) {
            this.isHost = true
        }
    }

    movePlayer(id, direction) {
        const player = this.players.get(id)

        if (player) {
            player.y += direction * PADDLE_SPEED
            player.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, player.y)) // Fixed `PADDLE_WIDTH` -> `PADDLE_HEIGHT`
        }
    }

    updateBall() {
        if (!this.isHost) return //only host updates the ball

        this.ball.x += this.ball.dx
        this.ball.y += this.ball.dy

        //Ball collision with top and bottom walls
        if (this.ball.y <= 0 || this.ball.y + BALL_SIZE >= CANVAS_HEIGHT) {
            this.ball.dy = -this.ball.dy
        }

        //Ball collision with paddles
        for (const [id, player] of this.players) {
            if (
                (this.ball.dx < 0 && this.ball.x <= player.x + PADDLE_WIDTH && this.ball.x + BALL_SIZE >= player.x) ||
                (this.ball.dx > 0 && this.ball.x + BALL_SIZE >= player.x && this.ball.x <= player.x + PADDLE_WIDTH)
            ) {
                if (this.ball.y + BALL_SIZE >= player.y && this.ball.y <= player.y + PADDLE_HEIGHT) {
                    this.ball.dx = -this.ball.dx

                    // Add a small vertical acceleration to make the game more interesting
                    this.ball.dy += (Math.random() - 0.5) * 2
                    this.ball.dy = Math.max(Math.min(this.ball.dy, BALL_SPEED), -BALL_SPEED) // Fixed `Math.main` -> `Math.min`

                    break
                }
            }
        }

        //Ball out of bounds
        if (this.ball.x <= 0 || this.ball.x + BALL_SIZE >= CANVAS_WIDTH) {
            const scoringPlayer =
                this.ball.x <= 0
                    ? Array.from(this.players.values()).find((p) => p.isleft)
                    : Array.from(this.players.values()).find((p) => p.isleft)

            if (scoringPlayer) {
                const scoringPlayerId = Array.from(this.players.entries()).find(([, p]) => p === scoringPlayer)[0]
                this.scores[scoringPlayerId]++
            }
            this.resetBall()

        }
    }


    draw() {
        //clear Canvas 
        this.ctx.fillStyle = "black"
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        //Draw cross bar
        this.ctx.setLineDash([5, 15])
        this.ctx.beginPath()
        this.ctx.moveTo(CANVAS_WIDTH / 2, 0)
        this.ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT)
        this.ctx.strokeStyle = "white"
        this.ctx.stroke()

        //Draw paddles
        this.ctx.fillStyle = "white"
        for (const player of this.players.values()) {
            this.ctx.fillRect(player.x, player.y, PADDLE_WIDTH, PADDLE_HEIGHT)
        }

        //Draw ball 
        this.ctx.drawImage(this.ballImage, this.ball.x, this.ball.y, BALL_SIZE, BALL_SIZE)

        //Draw Scores
        this.ctx.font = "24px monospace"
        const players = Array.from(this.players.keys())
        if (players.length === 2) {
            this.ctx.fillText("Scores: " + (this.scores)[players[0]] || 0, CANVAS_WIDTH / 4, 30)
            this.ctx.fillText("Scores: " + (this.scores)[players[1]] || 0, CANVAS_WIDTH / 4 * 3, 30)
        }

    }

    gameloop() {
        this.updateBall()
        this.draw()
        requestAnimationFrame(() => this.gameloop())
    }

    getState() {
        return {
            ball: this.ball,
            players: Array.from(this.players.entries()),
            scores: this.scores,
        }
    }

    setState(state) {
        this.ball = state.ball
        this.players = new Map(state.players)
        this.scores = state.scores
    }
}

// Set up game creation and joining
const createGameBtn = document.getElementById("create-game")
const joinForm = document.getElementById("join-form")
const loadingElement = document.getElementById("loading")
const gameElement = document.getElementById("game")
const canvas = document.getElementById("pong-canvas")

createGameBtn.addEventListener("click", createGame)
joinForm.addEventListener("submit", joinGame)

let game = null
let playerId = null

async function createGame() {
    const topicBuffer = crypto.randomBytes(32)
    const topic = b4a.toString(topicBuffer, "hex")
    document.getElementById("join-game-topic").value = topic

    await setupGame(topicBuffer)
}

async function joinGame(e) {
    e.preventDefault()

    const topicStr = document.getElementById("join-game-topic").value
    const topicBuffer = b4a.from(topicStr, "hex");
await setupGame(topicBuffer);

async function setupGame(topicBuffer) {
  try {
    showLoading();
    await joinSwarm(topicBuffer);

    playerId = b4a.toString(swarm.keyPair.publicKey, "hex").slice(0, 6);
    if (!game) {
      game = new PongGame(canvas, playerId);
    } else {
      game.addPlayer(playerId);
    }
    showGame(topicBuffer);
    updatePeerCount(); // Initialize peer count

    // Set up keyboard controls
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

} catch (error) {
    console.error("Error setting up game:", error);
    showSetup();
}
}

async function joinSwarm(topicBuffer) {
    const discovery = swarm.join(topicBuffer, { client: true, server: true });

    await discovery.flushed();
}

function showLoading() {
    document.getElementById("setup").classList.add("hidden");

    loadingElement.classList.remove("hidden");
}

function showGame(topicBuffer) {
    try {

        const topic = b4a.toString(topicBuffer, "hex");
        document.getElementById("game-topic").innerText = topic;

        loadingElement.classList.add("hidden");
        gameElement.classList.remove("hidden");

    } catch (error) {
        console.error("Error showing game:", error);
        showSetup();
    }
}
  
function showGame(topicBuffer) {
    try {
      const topic = b4a.toString(topicBuffer, "hex");
      document.getElementById("game-topic").innerText = topic;
  
      loadingElement.classList.add("hidden");
      gameElement.classList.remove("hidden");
    } catch (error) {
      console.error("Error showing game:", error);
      showSetup();
    }
  }
  
  function showSetup() {
    loadingElement.classList.add("hidden");
    gameElement.classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
  }
  
  // Handle keyboard input
  const keyState = {};
  
  function handleKeyDown(e) {
    keyState[e.key] = true;
  }
  
  function handleKeyUp(e) {
    keyState[e.key] = false; // or delete keyState[e.key]; if you want to remove the key from the object
  }

  //Update player position based on key state
  function updateplayerPosition() {
    if (game && playerId) {
        if(keyState["ArrowUp"]) {
            game.movePlayer(playerId, -1)
        }
        if(keyState["ArrowDown"]){
            game.movePlayer(playerId, 1)
    }
    }
  }

  
// Handle peer connections
swarm.on("connection", (peer) => {
    const peerId = b4a.toString(peer.remotePublicKey, "hex").slice(0, 6);
  
    if (game && !game.players.has(peerId)) {
      game.addPlayer(peerId);
    }
  
    peer.on("data", (message) => {
      try {
        const state = JSON.parse(message);
        if (game) {
          game.setState(state);
        }
      } catch (error) {
        console.error("Error parsing incoming message:", error);
      }
    });
  });

  peer.on("error", () => {
    if (game) {
      game.players.delete(peerId);
    }
  });
  
  updatePeerCount();
  
  function updatePeerCount() {
    const peerCount = swarm.connections.size + 1; // Include the local player
    document.getElementById("peers-count").textContent = peerCount;
  }
  
  swarm.on("connection-closed", () => {
    updatePeerCount();
  });

  // Sync game state with peers
setInterval(() => {
    if (game) {
      updateplayerPosition(); // Update local player's position
  
      const state = game.getState();
      const data = JSON.stringify(state);
  
      for (const peer of swarm.connections) {
        peer.write(data);
      }
    }
  }, 1000 / 60); // 60 times per second for smoother gameplay
}