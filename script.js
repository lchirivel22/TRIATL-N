// Global variables
let participants = []
let confirmedParticipants = []
let raceStarted = false
let currentTime = 0 // in seconds
let timerInterval
let speedFactor = 30 // 30x faster - 1 hora real = 2 minutos de simulación

// Constants for the race
const WALKING_DISTANCE = 10000 // 10K en metros
const SWIMMING_DISTANCE = 10000 // 10K en metros
const CYCLING_DISTANCE = 30000 // 30K en metros

// Velocidades máximas según lo especificado (valores realistas)
const WALKING_SPEED_MAX = 7000 / 3600 // 7 km/h convertido a m/s (1.94 m/s)
const SWIMMING_SPEED_MAX = 1.72 // 1.72 m/s
const CYCLING_SPEED_MAX = 45000 / 3600 // 45 km/h convertido a m/s (12.5 m/s)

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  // Tab navigation
  const tabButtons = document.querySelectorAll(".tab-btn")
  const tabContents = document.querySelectorAll(".tab-content")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab")

      // Update active tab button
      tabButtons.forEach((btn) => {
        btn.classList.remove("active")
      })
      button.classList.add("active")

      // Show the selected tab content
      tabContents.forEach((content) => {
        if (content.id === tabId) {
          content.classList.remove("hidden")
          content.classList.add("active")
        } else {
          content.classList.add("hidden")
          content.classList.remove("active")
        }
      })

      // Update confirmation list when switching to event tab
      if (tabId === "event") {
        updateConfirmationList()
      }
    })
  })

  // Registration form submission
  const registrationForm = document.getElementById("registration-form")
  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const cedula = document.getElementById("cedula").value
    const nombre = document.getElementById("nombre").value
    const municipio = document.getElementById("municipio").value
    const edad = Number.parseInt(document.getElementById("edad").value)

    // Check if participant already exists
    if (participants.some((p) => p.cedula === cedula)) {
      alert("Ya existe un participante con esta cédula.")
      return
    }

    // Add participant
    const participant = {
      cedula,
      nombre,
      municipio,
      edad,
      confirmed: false,
      walkingStart: null,
      walkingEnd: null,
      swimmingStart: null,
      swimmingEnd: null,
      cyclingStart: null,
      cyclingEnd: null,
      walkingDistance: 0,
      swimmingDistance: 0,
      cyclingDistance: 0,
      disqualified: false,
      disqualifiedTime: null, // Tiempo en que fue descalificado
      totalTime: null,
      startTime: 0, // Tiempo de inicio en segundos
      currentSpeed: 0, // Velocidad actual en m/s
      // Factores de rendimiento aleatorios para cada participante (entre 0.8 y 1.2)
      walkingFactor: 0.8 + Math.random() * 0.4,
      swimmingFactor: 0.8 + Math.random() * 0.4,
      cyclingFactor: 0.8 + Math.random() * 0.4,
    }

    participants.push(participant)
    updateParticipantsTable()
    updateConfirmationList()

    // Reset form and set select to default
    registrationForm.reset()
    document.getElementById("municipio").selectedIndex = 0
  })

  // Start event button
  const startEventBtn = document.getElementById("start-event")
  startEventBtn.addEventListener("click", () => {
    if (confirmedParticipants.length === 0) {
      alert("No hay participantes confirmados para iniciar el evento.")
      return
    }

    startRace()
    startEventBtn.disabled = true

    // Hide the no race data message
    document.getElementById("no-race-data").style.display = "none"
  })

  // Speed control buttons
  const normalSpeedBtn = document.getElementById("normal-speed")
  const fastSpeedBtn = document.getElementById("fast-speed")

  normalSpeedBtn.addEventListener("click", () => {
    speedFactor = 30 // 30x - 1 hora real = 2 minutos
    normalSpeedBtn.classList.add("bg-gray-700")
    normalSpeedBtn.classList.remove("bg-gray-300")
    normalSpeedBtn.classList.add("text-white")
    normalSpeedBtn.classList.remove("text-gray-700")
    fastSpeedBtn.classList.add("bg-gray-300")
    fastSpeedBtn.classList.remove("bg-gray-700")
    fastSpeedBtn.classList.add("text-gray-700")
    fastSpeedBtn.classList.remove("text-white")

    // Reiniciar el intervalo con la nueva velocidad si la carrera está en curso
    if (raceStarted && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = setInterval(updateRace, 1000 / speedFactor)
    }
  })

  fastSpeedBtn.addEventListener("click", () => {
    speedFactor = 120 // 120x - 1 hora real = 30 segundos
    fastSpeedBtn.classList.add("bg-gray-700")
    fastSpeedBtn.classList.remove("bg-gray-300")
    fastSpeedBtn.classList.add("text-white")
    fastSpeedBtn.classList.remove("text-gray-700")
    normalSpeedBtn.classList.add("bg-gray-300")
    normalSpeedBtn.classList.remove("bg-gray-700")
    normalSpeedBtn.classList.add("text-gray-700")
    normalSpeedBtn.classList.remove("text-white")

    // Reiniciar el intervalo con la nueva velocidad si la carrera está en curso
    if (raceStarted && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = setInterval(updateRace, 1000 / speedFactor)
    }
  })
})

// Modificar la función getRandomSpeed para que no descalifique automáticamente
function getRandomSpeed(maxSpeed, performanceFactor) {
  // Generar una velocidad aleatoria entre 0 y la velocidad máxima ajustada por el factor de rendimiento
  return Math.random() * maxSpeed * performanceFactor
}

// Función para calcular la distancia total recorrida por un participante
function getTotalDistance(participant) {
  // Si ha terminado, devolver la distancia total del triatlón
  if (participant.cyclingEnd) {
    return WALKING_DISTANCE + SWIMMING_DISTANCE + CYCLING_DISTANCE
  }

  // Si está en ciclismo
  if (participant.swimmingEnd) {
    return WALKING_DISTANCE + SWIMMING_DISTANCE + participant.cyclingDistance
  }

  // Si está en natación
  if (participant.walkingEnd) {
    return WALKING_DISTANCE + participant.swimmingDistance
  }

  // Si está en caminata
  return participant.walkingDistance
}

// Función para calcular el tiempo transcurrido para un participante
function getElapsedTime(participant) {
  // Si ha terminado, usar el tiempo total
  if (participant.totalTime) {
    return participant.totalTime
  }

  // Si fue descalificado, usar el tiempo de descalificación
  if (participant.disqualified && participant.disqualifiedTime !== null) {
    return participant.disqualifiedTime - participant.startTime
  }

  // Si no ha terminado ni fue descalificado, calcular el tiempo transcurrido desde el inicio
  return currentTime - participant.startTime
}

// Función para obtener la velocidad máxima actual según la etapa
function getCurrentMaxSpeed(participant) {
  if (participant.swimmingEnd) {
    return CYCLING_SPEED_MAX * participant.cyclingFactor // Está en ciclismo
  } else if (participant.walkingEnd) {
    return SWIMMING_SPEED_MAX * participant.swimmingFactor // Está en natación
  } else {
    return WALKING_SPEED_MAX * participant.walkingFactor // Está en caminata
  }
}

// Update participants table
function updateParticipantsTable() {
  const participantsList = document.getElementById("participants-list")
  const participantsTable = document.getElementById("participants-table")
  const noParticipantsMsg = document.getElementById("no-participants")

  participantsList.innerHTML = ""

  // Show/hide message
  if (participants.length === 0) {
    noParticipantsMsg.style.display = "block"
  } else {
    noParticipantsMsg.style.display = "none"
  }

  participants.forEach((participant) => {
    const row = document.createElement("tr")
    row.className = "hover:bg-gray-50"
    row.innerHTML = `
            <td class="p-3">${participant.cedula}</td>
            <td class="p-3">${participant.nombre}</td>
            <td class="p-3">${participant.municipio}</td>
            <td class="p-3">${participant.edad}</td>
            <td class="p-3">
                <button class="delete-btn p-1 bg-red-600 text-white rounded" data-cedula="${participant.cedula}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </td>
        `
    participantsList.appendChild(row)
  })

  // Add event listeners to delete buttons
  const deleteButtons = document.querySelectorAll(".delete-btn")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const cedula = this.getAttribute("data-cedula")
      participants = participants.filter((p) => p.cedula !== cedula)
      updateParticipantsTable()
      updateConfirmationList()
    })
  })
}

// Update confirmation list with checkboxes
function updateConfirmationList() {
  const confirmationList = document.getElementById("confirmation-list")
  confirmationList.innerHTML = ""

  // Show/hide no participants message
  const noParticipantsConfirmMsg = document.getElementById("no-participants-confirm")
  if (participants.length === 0) {
    noParticipantsConfirmMsg.style.display = "block"
    confirmationList.style.display = "none"
    return
  } else {
    noParticipantsConfirmMsg.style.display = "none"
    confirmationList.style.display = "grid"
  }

  participants.forEach((participant) => {
    const card = document.createElement("div")
    card.className = "bg-white p-4 rounded border border-gray-200 shadow-sm"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = `confirm-${participant.cedula}`
    checkbox.className = "w-5 h-5 mr-2"
    checkbox.checked = participant.confirmed
    checkbox.disabled = raceStarted

    checkbox.addEventListener("change", function () {
      participant.confirmed = this.checked
      updateConfirmedCount()
    })

    const label = document.createElement("label")
    label.htmlFor = `confirm-${participant.cedula}`
    label.className = "flex items-start cursor-pointer"

    const checkboxContainer = document.createElement("div")
    checkboxContainer.className = "flex items-center"
    checkboxContainer.appendChild(checkbox)

    const textContainer = document.createElement("div")
    textContainer.className = "ml-2"
    textContainer.innerHTML = `
            <div class="font-medium">${participant.nombre}</div>
            <div class="text-sm text-gray-600">Cédula: ${participant.cedula}</div>
            <div class="text-sm text-gray-600">Municipio: ${participant.municipio}</div>
            <div class="text-sm text-gray-600">Edad: ${participant.edad}</div>
        `

    label.appendChild(checkboxContainer)
    label.appendChild(textContainer)
    card.appendChild(label)
    confirmationList.appendChild(card)
  })

  updateConfirmedCount()
}

// Update confirmed participants count
function updateConfirmedCount() {
  confirmedParticipants = participants.filter((p) => p.confirmed)
  const confirmedCount = document.getElementById("confirmed-count")
  confirmedCount.textContent = confirmedParticipants.length

  // Enable start button if there are confirmed participants
  const startEventBtn = document.getElementById("start-event")
  startEventBtn.disabled = confirmedParticipants.length === 0 || raceStarted
}

// Format time as HH:MM:SS
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":")
}

// Start the race
function startRace() {
  raceStarted = true
  currentTime = 0

  // Disable all confirmation checkboxes
  const checkboxes = document.querySelectorAll('#confirmation-list input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.disabled = true
  })

  // Initialize race data for confirmed participants
  confirmedParticipants.forEach((participant) => {
    participant.walkingStart = formatTime(currentTime)
    participant.walkingDistance = 0
    participant.swimmingDistance = 0
    participant.cyclingDistance = 0
    participant.disqualified = false
    participant.disqualifiedTime = null
    participant.startTime = currentTime
    participant.currentSpeed = 0
  })

  // Start the timer
  timerInterval = setInterval(updateRace, 1000 / speedFactor)
  updateRaceTable()
}

// Count active participants (not disqualified and not finished)
function countActiveParticipants() {
  return confirmedParticipants.filter((p) => !p.disqualified && p.cyclingEnd === null).length
}

// Modificar la lógica de descalificación en la función updateRace
function updateRace() {
  currentTime += 1
  document.getElementById("current-time").textContent = formatTime(currentTime)

  let allFinished = true

  // Count active participants
  const activeParticipants = countActiveParticipants()

  // No descalificar si solo quedan 2 o menos participantes activos
  const descalificacionHabilitada = activeParticipants > 2

  confirmedParticipants.forEach((participant) => {
    if (participant.disqualified || participant.cyclingEnd !== null) {
      participant.currentSpeed = 0 // No se mueve
      return // Skip disqualified or finished participants
    }

    allFinished = false

    // Probabilidad de descalificación del 30% solo si hay más de 2 participantes activos
    const descalificacionProbabilidad = 0.001 // Ajustar este valor para controlar la tasa de descalificación

    if (descalificacionHabilitada && Math.random() < descalificacionProbabilidad) {
      participant.disqualified = true
      participant.disqualifiedTime = currentTime // Guardar el tiempo de descalificación
      participant.currentSpeed = 0
      return
    }

    // Walking stage
    if (participant.walkingEnd === null) {
      // Generar una velocidad aleatoria
      participant.currentSpeed = getRandomSpeed(WALKING_SPEED_MAX, participant.walkingFactor)

      // La distancia recorrida en este segundo es igual a la velocidad actual
      const progress = participant.currentSpeed

      participant.walkingDistance += progress

      // Check if walking is completed
      if (participant.walkingDistance >= WALKING_DISTANCE) {
        participant.walkingDistance = WALKING_DISTANCE
        participant.walkingEnd = formatTime(currentTime)
        participant.swimmingStart = participant.walkingEnd
        participant.currentSpeed = 0 // Reiniciar velocidad para la siguiente etapa
      }
    }
    // Swimming stage
    else if (participant.swimmingEnd === null) {
      // Generar una velocidad aleatoria
      participant.currentSpeed = getRandomSpeed(SWIMMING_SPEED_MAX, participant.swimmingFactor)

      // La distancia recorrida en este segundo es igual a la velocidad actual
      const progress = participant.currentSpeed

      participant.swimmingDistance += progress

      // Check if swimming is completed
      if (participant.swimmingDistance >= SWIMMING_DISTANCE) {
        participant.swimmingDistance = SWIMMING_DISTANCE
        participant.swimmingEnd = formatTime(currentTime)
        participant.cyclingStart = participant.swimmingEnd
        participant.currentSpeed = 0 // Reiniciar velocidad para la siguiente etapa
      }
    }
    // Cycling stage
    else if (participant.cyclingEnd === null) {
      // Generar una velocidad aleatoria
      participant.currentSpeed = getRandomSpeed(CYCLING_SPEED_MAX, participant.cyclingFactor)

      // La distancia recorrida en este segundo es igual a la velocidad actual
      const progress = participant.currentSpeed

      participant.cyclingDistance += progress

      // Check if cycling is completed
      if (participant.cyclingDistance >= CYCLING_DISTANCE) {
        participant.cyclingDistance = CYCLING_DISTANCE
        participant.cyclingEnd = formatTime(currentTime)
        participant.currentSpeed = 0 // Ya no se mueve

        // Calculate total time
        const startTimeParts = participant.walkingStart.split(":").map(Number)
        const endTimeParts = participant.cyclingEnd.split(":").map(Number)

        const startSeconds = startTimeParts[0] * 3600 + startTimeParts[1] * 60 + startTimeParts[2]
        const endSeconds = endTimeParts[0] * 3600 + endTimeParts[1] * 60 + endTimeParts[2]

        participant.totalTime = endSeconds - startSeconds
      }
    }
  })

  // Actualizar la tabla de carrera cada segundo
  updateRaceTable()

  // Stop the race if all participants have finished or been disqualified
  if (allFinished) {
    clearInterval(timerInterval)
    alert("¡La carrera ha terminado!")
  }
}

// Update race table
function updateRaceTable() {
  const raceList = document.getElementById("race-list")
  const raceTable = document.getElementById("race-table")
  const noRaceData = document.getElementById("no-race-data")

  raceList.innerHTML = ""

  // Show table and hide message when race is started
  if (raceStarted) {
    document.querySelector(".max-h-\\[500px\\]").style.display = "block"
    raceTable.style.display = "table"
    noRaceData.style.display = "none"
  } else {
    document.querySelector(".max-h-\\[500px\\]").style.display = "none"
    raceTable.style.display = "none"
    noRaceData.style.display = "block"
    return
  }

  // Sort participants by:
  // 1. Descalificados al final
  // 2. Mayor distancia recorrida primero
  // 3. Menor tiempo empleado primero
  const sortedParticipants = [...confirmedParticipants].sort((a, b) => {
    // Descalificados al final
    if (a.disqualified && !b.disqualified) return 1
    if (!a.disqualified && b.disqualified) return -1

    // Si ambos están descalificados, ordenar por distancia y tiempo
    if (a.disqualified && b.disqualified) {
      const distanceA = getTotalDistance(a)
      const distanceB = getTotalDistance(b)

      // Si las distancias son diferentes, ordenar por distancia (mayor primero)
      if (distanceA !== distanceB) {
        return distanceB - distanceA
      }

      // Si las distancias son iguales, ordenar por tiempo (menor primero)
      const timeA = getElapsedTime(a)
      const timeB = getElapsedTime(b)
      return timeA - timeB
    }

    // Calcular distancia total recorrida
    const distanceA = getTotalDistance(a)
    const distanceB = getTotalDistance(b)

    // Si las distancias son diferentes, ordenar por distancia (mayor primero)
    if (distanceA !== distanceB) {
      return distanceB - distanceA
    }

    // Si las distancias son iguales, ordenar por tiempo (menor primero)
    const timeA = getElapsedTime(a)
    const timeB = getElapsedTime(b)
    return timeA - timeB
  })

  sortedParticipants.forEach((participant, index) => {
    const row = document.createElement("tr")

    if (participant.disqualified) {
      row.className = "bg-red-50 text-red-800"
    } else if (participant.cyclingEnd) {
      row.className = "bg-green-50 text-green-800"
    } else {
      row.className = "hover:bg-gray-50"
    }

    const status = participant.disqualified
      ? "Descalificado"
      : participant.cyclingEnd
        ? "Finalizado"
        : participant.swimmingEnd
          ? "Ciclismo"
          : participant.walkingEnd
            ? "Natación"
            : "Caminata"

    const statusClass = participant.disqualified
      ? "text-red-600 bg-red-100"
      : participant.cyclingEnd
        ? "text-green-600 bg-green-100"
        : participant.swimmingEnd
          ? "text-blue-600 bg-blue-100"
          : participant.walkingEnd
            ? "text-indigo-600 bg-indigo-100"
            : "text-orange-600 bg-orange-100"

    // Calcular el progreso actual en porcentaje
    let progressPercent = 0
    const totalDistance = WALKING_DISTANCE + SWIMMING_DISTANCE + CYCLING_DISTANCE
    const completedDistance = getTotalDistance(participant)
    progressPercent = Math.round((completedDistance / totalDistance) * 100)

    // Calcular velocidad promedio en m/s
    const elapsedTime = getElapsedTime(participant)
    const avgSpeed = elapsedTime > 0 ? (completedDistance / elapsedTime).toFixed(2) : 0

    // Obtener la velocidad máxima actual según la etapa
    const currentMaxSpeed = getCurrentMaxSpeed(participant)

    // Calcular el porcentaje de la velocidad actual respecto a la máxima
    const speedPercent = currentMaxSpeed > 0 ? Math.round((participant.currentSpeed / currentMaxSpeed) * 100) : 0

    row.innerHTML = `
        <td class="p-3">${index + 1}</td>
        <td class="p-3">${participant.nombre}</td>
        <td class="p-3">${participant.cedula}</td>
        <td class="p-3">${participant.municipio}</td>
        <td class="p-3">${participant.edad}</td>
        <td class="p-3">${participant.walkingStart || "-"}</td>
        <td class="p-3">${participant.walkingEnd || "-"}</td>
        <td class="p-3">${participant.swimmingStart || "-"}</td>
        <td class="p-3">${participant.swimmingEnd || "-"}</td>
        <td class="p-3">${participant.cyclingStart || "-"}</td>
        <td class="p-3">${participant.cyclingEnd || "-"}</td>
        <td class="p-3">${formatTime(elapsedTime)}</td>
        <td class="p-3">
          <div class="flex flex-col">
            <div class="flex items-center mb-1">
              <span class="px-2 py-1 rounded text-xs font-medium ${statusClass} mr-2">${status}</span>
              <div class="w-16 bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
              </div>
              <span class="text-xs ml-1">${progressPercent}%</span>
            </div>
            <div class="text-xs text-gray-600 flex flex-col">
              <div>
                <span class="font-medium">Vel. prom: </span>${avgSpeed} m/s
              </div>
              <div class="mt-1 flex items-center">
                <span class="font-medium mr-1">Vel. actual: </span>
                <span class="mr-1">${participant.currentSpeed.toFixed(2)} m/s</span>
                <div class="w-12 h-1.5 bg-gray-200 rounded-full ml-1">
                  <div class="bg-yellow-500 h-1.5 rounded-full" style="width: ${speedPercent}%"></div>
                </div>
              </div>
            </div>
          </div>
        </td>
    `

    raceList.appendChild(row)
  })
}
