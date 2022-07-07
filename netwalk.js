import 'dotenv/config'
import Fastify from 'fastify'
import { randomInt } from 'crypto'

const fastify = Fastify()

const emptyCell = ' '
const server = 'S'
const computer = 'C'
const line = '+'

function drawMaze(rows, cols) {
  const arrLength = rows * cols
  const serverIndex = randomInt(arrLength)
  let maze = []
  for (let i = arrLength; i; i--) {
    maze.push(emptyCell)
  }
  maze.splice(serverIndex, 1, server)
  const steps = [-cols, 1, cols, -1]
  const neighborIndex = serverIndex + steps[randomInt(4)]
  if (neighborIndex >= 0 && neighborIndex < arrLength) {
    maze.splice(neighborIndex, 1, line)
  }
  console.log(maze)
}

drawMaze(9, 11)

fastify.listen(process.env.NETWALK, '0.0.0.0')