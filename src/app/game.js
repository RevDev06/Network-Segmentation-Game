export function mountGame(root) {
  const missions = [
    {
      name: "La tormenta de broadcast",
      short: "Detecta la tormenta",
      tag: "RECONOCIMIENTO",
      difficulty: "Intermedio",
      brief:
        "PC-01 está a punto de emitir un broadcast. Predice sus destinos antes de disparar y elige cómo contener el siguiente.",
      goals: [
        "Marca los 3 receptores en el mapa",
        "Lanza el broadcast para comprobarlo",
        "Elige el equipo que separa dominios",
      ],
      hint: "Un switch inunda todos los puertos salvo el de origen. Un router separa dominios; otro switch o un hub no lo hacen.",
      concept:
        "No todos los paquetes necesitan cruzar toda la red. Tu primera defensa es reconocer quién recibe un broadcast.",
    },
    {
      name: "Rescate del segmento saturado",
      short: "Equilibra el tráfico",
      tag: "REORGANIZACIÓN",
      difficulty: "Intermedio +",
      brief:
        "Red A está sobrecargada. Redistribuye equipos hasta dejar exactamente 7 unidades de tráfico en cada red. Después prueba ambos dominios.",
      goals: [
        "Equilibra la carga: 7 / 7",
        "Prueba un broadcast desde Red A",
        "Prueba un broadcast desde Red B",
      ],
      hint: "La carga inicial es 11 / 3. Mueve PC-01 (4 u) a B, o mueve PC-03 y PC-04 (2 u cada una). Importa la carga, no el número de PCs.",
      concept:
        "Balancear cantidad de equipos no siempre equilibra tráfico. La carga de cada dispositivo también cuenta.",
    },
    {
      name: "Construye la frontera",
      short: "Diseña las subredes",
      tag: "INGENIERÍA",
      difficulty: "Avanzado",
      brief:
        "Parte de 192.168.1.0/24. Crea exactamente 2 subredes iguales para 100 hosts cada una: ajusta el prefijo y coloca sus direcciones de red.",
      goals: [
        "Elige un prefijo para 100 hosts",
        "Coloca las dos direcciones de red",
        "Valida tu diseño completo",
      ],
      hint: "/25 deja 126 hosts por subred. Sus redes empiezan en .0 y .128. .64 y .192 no son fronteras válidas para /25.",
      concept:
        "El prefijo define tanto la capacidad como las fronteras. Una máscara correcta con una dirección de red incorrecta sigue siendo un diseño inválido.",
    },
    {
      name: "Cuatro equipos, cero conflictos",
      short: "Configura las IP",
      tag: "CONFIGURACIÓN",
      difficulty: "Avanzado",
      brief:
        "Conecta 4 PCs en dos subredes /25. Introduce sus IP sin usar direcciones de red, broadcast, gateways ni direcciones duplicadas.",
      goals: [
        "Configura las 2 PCs de Subred A",
        "Configura las 2 PCs de Subred B",
        "Ejecuta la prueba de conectividad",
      ],
      hint: "A admite .2–.126 y B admite .130–.254. .1 y .129 son gateways reservados. Cada PC necesita una dirección diferente.",
      concept:
        "Las direcciones de red y broadcast no son hosts. Además, una IP válida puede fallar si ya está en uso.",
    },
    {
      name: "Operación: cero ruido",
      short: "Despliega la empresa",
      tag: "MISIÓN FINAL",
      difficulty: "Experto",
      brief:
        "Ventas necesita 50 hosts, TI 35 y RR. HH. 25. Elige la máscara uniforme más pequeña en capacidad que soporte a todos, asigna 3 bloques distintos y reserva el cuarto.",
      goals: [
        "Dimensiona los bloques sin desperdicio",
        "Asigna una red única por departamento",
        "Activa y prueba el aislamiento",
      ],
      hint: "/26 tiene 62 hosts utilizables y produce 4 bloques: .0, .64, .128 y .192. Usa 3 distintos. /27 no alcanza para Ventas ni TI.",
      concept:
        "Una buena segmentación combina capacidad suficiente, bloques sin solapamiento y espacio para crecer.",
    },
  ]
  const state = {
    level: 0,
    unlocked: 0,
    done: false,
    busy: false,
    phase: 0,
    recipients: [],
    assignment: [0, 0, 0, 0, 1, 1],
    selectedPC: 0,
    tested: [],
    prefix: 24,
    blocks: [null, null],
    token: null,
    addresses: ["", "", "", ""],
    activePC: 0,
    departments: [null, null, null],
    hint: false,
    penalties: [0, 0, 0, 0, 0],
    hintUsed: [false, false, false, false, false],
    awards: [null, null, null, null, null],
    errors: 0,
    streak: 0,
    modal: "",
    feedback:
      "Selecciona en el mapa las PCs que recibirán el broadcast de PC-01.",
    tone: "info",
  }
  const timers = new Set()
  const weights = [4, 3, 2, 2, 1, 2]
  const reduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const delay = (callback, milliseconds) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      callback()
    }, milliseconds)
    timers.add(timer)
  }
  const score = () => state.awards.reduce((sum, award) => sum + (award ?? 0), 0)
  const rank = () =>
    score() >= 1400 ? "S" : score() >= 1200 ? "A" : score() >= 900 ? "B" : "C"
  const icon = (name, size = 20) => {
    const shapes = {
      network:
        '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v4H5v4m7-4h7v4"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      lock: '<rect x="6" y="10" width="12" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      play: '<path d="m9 5 11 7-11 7Z"/>',
      refresh:
        '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
      bulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 3H9Z"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      shield:
        '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
      star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
      bolt: '<path d="m14 2-9 12h6l-1 8 9-12h-6Z"/>',
      book: '<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.network}</svg>`
  }
  const button = (action, text, secondary = false, disabled = false) =>
    `<button data-action="${action}" ${
      disabled ? "disabled" : ""
    } class="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-3 text-[12px] font-semibold transition hover:brightness-110 disabled:opacity-40 ${
      secondary
        ? "border-border bg-secondary text-foreground"
        : "border-primary bg-primary text-primary-foreground"
    }">${text}</button>`
  const groupAction = (action) =>
    `data-action="${action}" tabindex="0" role="button" class="cursor-pointer focus:outline-none focus:stroke-primary"`
  const feedback = (message, tone = "info") => {
    state.feedback = message
    state.tone = tone
  }
  function mistake(message) {
    state.penalties[state.level] += 15
    state.errors += 1
    state.streak = 0
    feedback(`${message} −15 XP · Puedes volver a intentarlo.`, "error")
  }
  function success(message) {
    state.streak += 1
    feedback(message, "success")
  }
  function finish(message) {
    state.done = true
    const award = Math.max(75, 300 - state.penalties[state.level])
    if (state.awards[state.level] === null) state.awards[state.level] = award
    state.unlocked = Math.max(state.unlocked, Math.min(4, state.level + 1))
    success(`${message} Misión completada: ${state.awards[state.level]} XP.`)
  }
  const wire = (path, highlighted = false) =>
    `<path d="${path}" fill="none" stroke="${
      highlighted ? "#b1ed87" : "#3d5446"
    }" stroke-width="${highlighted ? 2 : 1.5}"/>`
  function device(
    x,
    y,
    type,
    label,
    action = "",
    selected = false,
    subtitle = "",
  ) {
    const color = selected ? "#b1ed87" : "#7e9686"
    const drawing =
      type === "pc"
        ? `<rect x="-26" y="-23" width="52" height="40" rx="7" fill="#202c24" stroke="${color}"/><rect x="-19" y="-16" width="38" height="24" rx="2" fill="#111a14" stroke="${color}"/><path d="M0 17v9m-9 0h18" stroke="${color}" stroke-width="2"/>`
        : `<rect x="-37" y="-21" width="74" height="42" rx="${
            type === "router" ? 21 : 7
          }" fill="#243329" stroke="${color}"/><path d="M-22-5h44m-5-4 4 4-4 4M22 7h-44m5-4-4 4 4 4" fill="none" stroke="${color}" stroke-width="1.5"/>${
            type === "switch"
              ? '<path d="M-23 16h5m4 0h5m4 0h5m4 0h5" stroke="#b1ed87" stroke-width="3"/>'
              : ""
          }`
    return `<g ${
      action ? groupAction(action) : 'class="pointer-events-none"'
    } aria-label="${label}${
      subtitle ? `, ${subtitle}` : ""
    }" transform="translate(${x},${y})">${
      action
        ? `<rect x="-34" y="-31" width="68" height="66" rx="10" fill="${
            selected ? "#b1ed8715" : "transparent"
          }" stroke="${selected ? "#b1ed87" : "#3d5545"}" stroke-dasharray="${
            selected ? "0" : "3 4"
          }"/>`
        : ""
    }${drawing}<text y="47" text-anchor="middle" fill="${
      selected ? "#b1ed87" : "#d8e4dc"
    }" font-size="11" font-family="sans-serif">${label}</text><text y="63" text-anchor="middle" fill="${
      selected ? "#b1ed87" : "#92a497"
    }" font-size="10" font-family="monospace">${subtitle}</text></g>`
  }
  function zone(
    x,
    y,
    width,
    height,
    title,
    subtitle,
    action = "",
    blue = false,
  ) {
    return `<g ${action ? groupAction(action) : ""} ${
      action.startsWith("zone-") ? `data-drop="${action.slice(5)}"` : ""
    } aria-label="${title}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${
      blue ? "#1c2b31" : "#203023"
    }" fill-opacity=".55" stroke="${
      blue ? "#557889" : "#638253"
    }" stroke-dasharray="5 5"/><text x="${x + 17}" y="${y + 26}" fill="${
      blue ? "#add4e8" : "#b1ed87"
    }" font-size="11" font-family="monospace" letter-spacing="1">${title}</text><text x="${x + 17}" y="${y + 45}" fill="#97ada0" font-size="10" font-family="monospace">${subtitle}</text></g>`
  }
  const loads = () =>
    [0, 1].map((network) =>
      state.assignment.reduce(
        (sum, team, index) => sum + (team === network ? weights[index] : 0),
        0,
      ),
    )
  const balanced = () => loads().every((load) => load === 7)
  function networkMarkup() {
    let content = ""
    if (state.level === 0) {
      const positions = [
        [130, 165],
        [590, 165],
        [130, 340],
        [590, 340],
      ]
      content = zone(
        55,
        75,
        610,
        360,
        "DOMINIO 01 · ALERTA DE TORMENTA",
        "Selecciona los destinos. PC-01 es el origen.",
      )
      positions.forEach(([x, y], index) => {
        content += wire(
          `M${x} ${y}H${x < 360 ? 250 : 470}V245H360`,
          state.recipients.includes(index),
        )
        content += device(
          x,
          y,
          "pc",
          `PC-0${index + 1}`,
          state.phase === 0 && !state.done ? `recipient-${index}` : "",
          index === 0 || state.recipients.includes(index),
          index === 0
            ? "ORIGEN"
            : state.recipients.includes(index)
              ? "DESTINO MARCADO"
              : "¿RECIBIRÁ?",
        )
      })
      content += device(
        360,
        245,
        "switch",
        "SWITCH-01",
        "",
        true,
        "FF:FF:FF:FF:FF:FF",
      )
    } else if (state.level === 1) {
      const load = loads()
      content =
        zone(
          25,
          115,
          320,
          340,
          `RED A · ${load[0]}/7 u`,
          `${
            state.tested.includes(0)
              ? "BROADCAST AISLADO ✓"
              : "PENDIENTE DE PRUEBA"
          }`,
          "zone-0",
        ) +
        zone(
          375,
          115,
          320,
          340,
          `RED B · ${load[1]}/7 u`,
          `${
            state.tested.includes(1)
              ? "BROADCAST AISLADO ✓"
              : "PENDIENTE DE PRUEBA"
          }`,
          "zone-1",
          true,
        ) +
        wire("M360 60H185V205") +
        wire("M360 60H535V205") +
        device(360, 60, "router", "ROUTER", "", true)
      ;[0, 1].forEach((network) => {
        const center = network === 0 ? 185 : 535
        content += device(
          center,
          205,
          "switch",
          `SWITCH-${network === 0 ? "A" : "B"}`,
        )
        state.assignment
          .map((team, index) => ({ team, index }))
          .filter((pc) => pc.team === network)
          .forEach(({ index }, slot) => {
            const x = center - 100 + (slot % 3) * 100
            const y = 285 + Math.floor(slot / 3) * 100
            content +=
              wire(`M${center} 205V${y - 40}H${x}V${y}`) +
              device(
                x,
                y,
                "pc",
                `PC-0${index + 1}`,
                state.done ? "" : `pc-${index}`,
                state.selectedPC === index,
                `${weights[index]} u de tráfico`,
              )
          })
      })
    } else if (state.level === 2) {
      content = `<text x="360" y="65" fill="#b1ed87" text-anchor="middle" font-size="14" font-family="monospace">192.168.1.0 /24</text><text x="360" y="88" fill="#a1b3a6" text-anchor="middle" font-size="10">RED ORIGINAL · 256 DIRECCIONES</text>${wire("M360 115V185H185V235", state.done)}${wire("M360 185H535V235", state.done)}${device(360, 135, "router", `PREFIJO /${state.prefix}`, "", state.done)}`
      ;[0, 1].forEach((index) => {
        const x = index === 0 ? 35 : 385
        content += zone(
          x,
          230,
          300,
          190,
          `SUBRED ${index === 0 ? "A" : "B"} · 100 HOSTS`,
          "Selecciona una ficha y coloca aquí",
          `slot-${index}`,
          index === 1,
        )
        content += `<text x="${x + 150}" y="335" text-anchor="middle" fill="${
          state.blocks[index] === null ? "#5d7765" : "#d9e8dc"
        }" font-size="20" font-family="monospace">${
          state.blocks[index] === null
            ? "+ RED"
            : `192.168.1.${state.blocks[index]}`
        }</text><text x="${x + 150}" y="365" text-anchor="middle" fill="#a1b3a6" font-size="11" font-family="monospace">/${state.prefix} · ${2 ** (32 - state.prefix) - 2} hosts útiles</text>`
      })
    } else if (state.level === 3) {
      content =
        zone(
          35,
          150,
          300,
          295,
          "SUBRED A · 192.168.1.0/25",
          "Gateway .1 · broadcast .127",
        ) +
        zone(
          385,
          150,
          300,
          295,
          "SUBRED B · 192.168.1.128/25",
          "Gateway .129 · broadcast .255",
          "",
          true,
        ) +
        wire("M360 60H185V230") +
        wire("M360 60H535V230") +
        device(360, 60, "router", "ROUTER", "", true) +
        device(185, 230, "switch", "SWITCH-A") +
        device(535, 230, "switch", "SWITCH-B")
      ;[0, 1, 2, 3].forEach((index) => {
        const center = index < 2 ? 185 : 535
        const x = center - 72 + (index % 2) * 144
        content +=
          wire(`M${center} 230V295H${x}V345`, !!state.addresses[index]) +
          device(
            x,
            345,
            "pc",
            `PC-0${index + 1}`,
            state.done ? "" : `configure-${index}`,
            state.activePC === index,
            state.addresses[index]
              ? `192.168.1.${state.addresses[index]}`
              : "SIN DIRECCIÓN",
          )
      })
    } else {
      content = device(360, 65, "router", "CORE", "", true)
      ;["VENTAS", "TI", "RR. HH."].forEach((department, index) => {
        const x = 135 + index * 225
        content +=
          wire(`M360 65H${x}V250`, state.done) +
          zone(
            x - 100,
            150,
            200,
            280,
            department,
            `${[50, 35, 25][index]} HOSTS REQUERIDOS`,
            `department-${index}`,
            index === 1,
          ) +
          `<text x="${x}" y="220" text-anchor="middle" fill="${
            state.departments[index] === null ? "#5d7765" : "#b1ed87"
          }" font-size="13" font-family="monospace">${
            state.departments[index] === null
              ? "+ ASIGNAR RED"
              : `192.168.1.${state.departments[index]}/${state.prefix}`
          }</text>` +
          device(x, 280, "switch", `SW-${index + 1}`) +
          wire(`M${x} 280V350`) +
          device(x, 365, "pc", `${[50, 35, 25][index]} EQUIPOS`)
      })
    }
    return `<svg id="network-map" viewBox="0 0 720 495" class="h-auto w-full min-w-[460px] [&_text]:pointer-events-none [&_path]:pointer-events-none" aria-label="Mapa interactivo de la misión ${state.level + 1}">${content}<g id="packets" class="pointer-events-none"></g></svg>`
  }
  function prefixControls() {
    const capacity = 2 ** (32 - state.prefix) - 2
    return `<p class="mb-2 font-mono text-[9px] tracking-[1px] text-muted-foreground">AJUSTA LA MÁSCARA</p><div class="flex items-center justify-between rounded-lg border border-border bg-background p-2"><button data-action="prefix-down" aria-label="Reducir prefijo" ${
      state.prefix <= 24 ? "disabled" : ""
    } class="h-9 w-9 rounded-md bg-secondary text-xl disabled:opacity-30">−</button><span class="font-mono text-2xl text-primary">/${state.prefix}</span><button data-action="prefix-up" aria-label="Aumentar prefijo" ${
      state.prefix >= 28 ? "disabled" : ""
    } class="h-9 w-9 rounded-md bg-secondary text-xl disabled:opacity-30">+</button></div><div class="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>${2 ** (state.prefix - 24)} subredes</span><span>${capacity} hosts / red</span></div><p class="mt-2 text-center font-mono text-[10px] text-muted-foreground">255.255.255.${256 - 2 ** (32 - state.prefix)}</p>`
  }
  function tokenControls() {
    return `<div class="mt-5"><p class="mb-2 font-mono text-[9px] tracking-[1px] text-muted-foreground">1. ELIGE UNA FICHA · 2. TOCA SU DESTINO</p><div class="grid grid-cols-2 gap-2">${[0, 64, 128, 192].map((block) => `<button data-action="token-${block}" aria-pressed="${state.token === block}" class="rounded-lg border px-2 py-3 font-mono text-[12px] ${state.token === block ? "border-primary bg-[#2c3b22] text-primary" : "border-border bg-secondary text-foreground hover:border-[#71895d]"}">192.168.1.${block}</button>`).join("")}</div></div>`
  }
  function controls() {
    if (state.done)
      return `<div class="mb-4 rounded-lg border border-[#617d43] bg-[#26351e] p-4 text-center"><span class="mb-2 flex justify-center gap-1 text-primary">${icon("star", 19)}${
        state.awards[state.level] >= 200 ? icon("star", 19) : ""
      }${
        state.awards[state.level] >= 275 ? icon("star", 19) : ""
      }</span><p class="text-[12px] text-primary">+${state.awards[state.level]} XP · Misión despejada</p></div>${button(state.level === 4 ? "certificate" : "next", `${state.level === 4 ? "Ver certificación" : "Siguiente misión"} ${icon("arrow", 16)}`)}`
    if (state.level === 0)
      return state.phase === 0
        ? `<p class="mb-3 text-center font-mono text-[11px] text-primary">${state.recipients.length} destinos marcados</p>${button("predict", `${icon("play", 15)} Lanzar broadcast`, false, state.busy)}`
        : `<p class="mb-3 text-[11px] leading-5 text-muted-foreground">La tormenta necesita una frontera. Instala el equipo adecuado:</p><div class="space-y-2">${["Switch", "Hub", "Router"].map((type) => button(`equipment-${type.toLowerCase()}`, `${icon("network", 16)} Instalar ${type}`, true)).join("")}</div>`
    if (state.level === 1)
      return `<div class="mb-4 rounded-lg border border-border bg-background p-3"><p class="font-mono text-[11px] text-primary">PC-0${state.selectedPC + 1} · ${weights[state.selectedPC]} u</p><p class="mt-1 text-[10px] leading-5 text-muted-foreground">Arrastra cualquier PC o selecciónala y toca una red en el mapa.</p><div class="mt-2 grid grid-cols-2 gap-2">${button("zone-0", "→ Red A", true)}${button("zone-1", "→ Red B", true)}</div></div><div class="space-y-2">${button("test-0", `${icon("play", 14)} Probar Red A ${state.tested.includes(0) ? "✓" : ""}`, false, state.busy)}${button("test-1", `${icon("play", 14)} Probar Red B ${state.tested.includes(1) ? "✓" : ""}`, true, state.busy)}</div>`
    if (state.level === 2 || state.level === 4)
      return `${prefixControls()}${tokenControls()}<div class="mt-4">${button(state.level === 2 ? "validate-design" : "activate", `${icon("play", 15)} ${state.busy ? "Probando…" : state.level === 2 ? "Validar diseño" : "Activar Red"}`, false, state.busy)}</div>`
    return `<p class="mb-3 font-mono text-[11px] text-primary">CONFIGURANDO PC-0${state.activePC + 1} · SUBRED ${
      state.activePC < 2 ? "A" : "B"
    }</p><div class="mb-4 grid grid-cols-4 gap-1">${[0, 1, 2, 3].map((index) => `<button data-action="configure-${index}" class="rounded-md border py-2 font-mono text-[10px] ${index === state.activePC ? "border-primary text-primary" : "border-border text-muted-foreground"}">PC-0${index + 1}${state.addresses[index] ? " ✓" : ""}</button>`).join("")}</div><form id="ip-form"><label for="ip-host" class="mb-2 block text-[11px] text-muted-foreground">Dirección IP del equipo</label><div class="flex items-center rounded-lg border border-border bg-background px-3 focus-within:border-primary"><span class="font-mono text-[12px] text-muted-foreground">192.168.1.</span><input id="ip-host" name="host" type="number" min="0" max="255" required inputmode="numeric" autocomplete="off" value="${state.addresses[state.activePC]}" placeholder="host" class="min-w-0 w-full bg-transparent px-2 py-3 font-mono text-[15px] text-primary outline-none" /></div><div class="mt-3">${button("assign-ip", `Asignar IP ${icon("arrow", 15)}`)}</div></form><p class="my-3 text-center font-mono text-[10px] text-muted-foreground">${state.addresses.filter(Boolean).length}/4 equipos configurados</p>${button("ping", `${icon("bolt", 15)} Probar conectividad`, true, state.busy)}`
  }
  function goals() {
    if (state.done) return [true, true, true]
    if (state.level === 0)
      return [
        state.recipients.length === 3 &&
          [1, 2, 3].every((index) => state.recipients.includes(index)),
        state.phase === 1,
        false,
      ]
    if (state.level === 1)
      return [balanced(), state.tested.includes(0), state.tested.includes(1)]
    if (state.level === 2)
      return [
        state.prefix === 25,
        state.blocks[0] === 0 && state.blocks[1] === 128,
        false,
      ]
    if (state.level === 3)
      return [
        state.addresses.slice(0, 2).every(Boolean),
        state.addresses.slice(2).every(Boolean),
        false,
      ]
    return [
      state.prefix === 26,
      state.departments.every((block) => block !== null) &&
        new Set(state.departments).size === 3,
      false,
    ]
  }
  function render() {
    const mission = missions[state.level]
    const completed = state.awards.filter((award) => award !== null).length
    const statuses = goals()
    const stats = [
      ["XP ACUMULADO", `${score()}`, `/ 1500`],
      ["RACHA ACTUAL", `${state.streak}`, "aciertos seguidos"],
      ["REINTENTOS", `${state.errors}`, "sin límite"],
      [
        "BOTÍN DE MISIÓN",
        `${Math.max(75, 300 - state.penalties[state.level])}`,
        "XP disponibles",
      ],
    ]
    root.innerHTML = `<div class="min-h-screen bg-background text-foreground"><header class="border-b border-border bg-[#141916]"><div class="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between gap-3 px-5 lg:px-9"><a href="#" data-action="home" aria-label="Reiniciar campaña" class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">${icon("network", 23)}</span><span class="text-[23px] font-semibold tracking-[-.5px]">segmenta<span class="text-primary">.</span></span><span class="ml-4 hidden border-l border-border pl-5 font-mono text-[10px] tracking-[2px] text-muted-foreground sm:block">NETWORK OPS</span></a><div class="flex items-center gap-4"><span class="hidden items-center gap-2 rounded-full border border-[#52633e] bg-[#26301f] px-3 py-1.5 font-mono text-[10px] text-primary md:flex">${icon("bolt", 13)} MODO DESAFÍO</span><button data-action="guide" class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] text-[#c1cbc4] hover:bg-secondary">${icon("book", 16)} Cómo jugar</button></div></div></header>
    <div class="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[245px_minmax(0,1fr)]"><aside class="border-b border-border px-5 py-6 lg:border-r lg:border-b-0 lg:px-6 lg:py-9"><p class="mb-3 hidden font-mono text-[10px] tracking-[1.7px] text-muted-foreground lg:block">CAMPAÑA · 5 MISIONES</p><h2 class="mb-7 hidden text-[18px] font-medium leading-7 lg:block">Tu red está en peligro.<br><span class="text-primary">Toma el control.</span></h2><nav aria-label="Misiones" class="flex gap-2 overflow-auto lg:flex-col">${missions.map((item, index) => `<button data-action="level-${index}" ${index > state.unlocked ? "disabled" : ""} aria-current="${index === state.level ? "step" : "false"}" class="flex min-w-[170px] items-center gap-3 rounded-lg border px-3 py-4 text-left lg:min-w-0 ${index === state.level ? "border-[#57733f] bg-[#273320]" : "border-transparent hover:bg-card"} ${index > state.unlocked ? "opacity-40" : ""}"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] ${index === state.level ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}">${state.awards[index] !== null ? icon("check", 14) : `0${index + 1}`}</span><span class="flex-1"><span class="mb-1 block font-mono text-[9px] tracking-[1px] ${index === state.level ? "text-primary" : "text-muted-foreground"}">MISIÓN ${index + 1}</span><span class="block text-[12px]">${item.short}</span></span>${index > state.unlocked ? icon("lock", 12) : ""}</button>`).join("")}</nav><div class="mt-9 hidden rounded-xl border border-border bg-card p-4 lg:block"><span class="mb-3 block text-primary">${icon("star", 24)}</span><p class="text-[12px] font-medium">Cada decisión cuenta</p><p class="mt-2 text-[11px] leading-5 text-muted-foreground">300 XP por misión.<br>Error: −15 XP · Pista: −25 XP.<br>Reintentos ilimitados; tu botín mínimo es de 75 XP.</p></div><p class="mt-7 hidden font-mono text-[9px] text-muted-foreground lg:block">CCNA · SUBNETTING TÁCTICO</p></aside>
    <main class="min-w-0 px-5 py-7 lg:px-8 lg:py-9 xl:px-10"><div class="mb-6 flex flex-wrap items-center justify-between gap-3"><p class="font-mono text-[10px] tracking-[1.6px] text-primary">MÓDULO 11.4 / SEGMENTACIÓN DE RED</p><span class="flex items-center gap-2 rounded-full border border-[#645239] bg-[#2a251c] px-3 py-1 text-[10px] text-[#e6c18c]">${icon("bolt", 13)} Dificultad aumentada</span></div><h1 class="text-[29px] font-medium sm:text-[34px]">Operación: <span class="text-primary">cero ruido.</span></h1><p class="mt-2 text-[13px] text-muted-foreground">No respondas un cuestionario. Construye una red que sobreviva a las pruebas.</p><div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">${stats.map(([label, value, description], index) => `<div class="rounded-xl border ${index === 3 ? "border-[#4c6239] bg-[#20291c]" : "border-border bg-card"} p-4"><p class="mb-2 font-mono text-[9px] tracking-[1px] text-muted-foreground">${label}</p><div class="flex flex-wrap items-baseline gap-2"><strong class="font-mono text-[25px] font-medium ${index === 0 || index === 3 ? "text-primary" : "text-foreground"}">${value}</strong><span class="text-[10px] text-muted-foreground">${description}</span></div></div>`).join("")}</div><div class="mt-6 flex items-center gap-4"><span class="shrink-0 text-[11px] text-muted-foreground">Nivel <strong class="text-foreground">${state.level + 1}</strong> de 5</span><div class="grid h-1.5 flex-1 grid-cols-5 gap-1.5" role="progressbar" aria-valuenow="${completed * 20}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de campaña">${missions.map((_, index) => `<span class="rounded-full ${state.awards[index] !== null ? "bg-primary" : index === state.level ? "bg-[#698650]" : "bg-[#2b342e]"}"></span>`).join("")}</div><span class="font-mono text-[10px] text-muted-foreground">${completed}/5</span></div>
    <section class="mt-8"><div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><span class="font-mono text-sm text-primary">0${state.level + 1} /</span><h2 class="text-[20px] font-medium">${mission.name}</h2></div><span class="rounded-full bg-[#232d22] px-3 py-1.5 font-mono text-[9px] text-[#bbd1ae]">${mission.difficulty}</span></div><div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]"><div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card"><div class="flex h-14 items-center justify-between gap-2 border-b border-border px-5"><span class="flex items-center gap-2 text-[12px] font-medium">${icon("network", 16)} Campo de operaciones</span><span class="flex items-center gap-2 font-mono text-[9px] tracking-[1px] ${
      state.busy ? "text-primary" : "text-muted-foreground"
    }"><span class="h-1.5 w-1.5 rounded-full bg-primary"></span>${
      state.busy ? "PRUEBA EN CURSO" : "INTERACTIVO"
    }</span></div><div class="relative overflow-auto bg-[radial-gradient(#354239_1px,transparent_1px)] bg-[size:20px_20px]">${networkMarkup()}${
      state.busy
        ? '<div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#618449] bg-[#263721] px-4 py-2 text-[11px] text-primary">Analizando tráfico…</div>'
        : ""
    }</div><div class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5"><span class="flex items-center gap-2 text-[10px] text-muted-foreground"><span class="h-2 w-2 rounded-sm border border-dashed border-primary"></span>Contorno punteado = interactúa aquí</span><button data-action="reset" ${
      state.busy ? "disabled" : ""
    } class="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40">${icon("refresh", 12)} Rehacer misión</button></div></div><aside class="rounded-xl border border-border bg-card p-5"><p class="mb-3 flex items-center gap-2 font-mono text-[9px] tracking-[1.5px] text-primary">${icon("shield", 15)} ${mission.tag}</p><p class="text-[12px] leading-[1.8] text-[#a9b8ae]">${mission.brief}</p><div class="my-5 space-y-3">${mission.goals.map((goal, index) => `<div class="flex items-start gap-2.5 text-[11px] ${statuses[index] ? "text-primary" : "text-[#c1ccc4]"}"><span class="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${statuses[index] ? "border-primary bg-[#2e4325]" : "border-[#55645a]"}">${statuses[index] ? icon("check", 10) : ""}</span>${goal}</div>`).join("")}</div>${controls()}<button data-action="hint" aria-expanded="${state.hint}" class="mt-4 flex w-full items-center justify-center gap-2 text-[11px] text-muted-foreground hover:text-primary">${icon("bulb", 14)} ${
      state.hint
        ? "Ocultar pista"
        : state.hintUsed[state.level]
          ? "Ver pista utilizada"
          : "Solicitar pista · −25 XP"
    }</button>${
      state.hint
        ? `<p class="mt-3 rounded-lg border border-[#495b37] bg-[#242e1f] p-3 text-[11px] leading-5 text-[#c3d8b5]">${mission.hint}</p>`
        : ""
    }</aside></div>
    <div role="status" aria-live="polite" aria-atomic="true" class="mt-5 flex min-h-[64px] items-center gap-3 rounded-lg border ${
      state.tone === "error"
        ? "border-[#765a3c] bg-[#2b231a]"
        : state.tone === "success"
          ? "border-[#4a6337] bg-[#202c1c]"
          : "border-border bg-[#191f1b]"
    } px-4 py-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
      state.tone === "error"
        ? "bg-[#42331f] text-[#ecc18b]"
        : "bg-[#2c3825] text-primary"
    }">${icon(state.tone === "success" ? "check" : "info", 16)}</span><p class="text-[12px] leading-5 ${
      state.tone === "error" ? "text-[#ecc18b]" : "text-[#b8c8b4]"
    }">${state.feedback}</p></div><div class="mt-5 flex gap-3 rounded-xl border border-border px-5 py-4"><span class="mt-0.5 text-[#90a382]">${icon("bulb", 20)}</span><div><p class="mb-1 text-[12px] font-medium">Bitácora de operaciones</p><p class="text-[11px] leading-5 text-muted-foreground">${mission.concept}</p></div></div></section><footer class="mt-7 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#839087]"><span>Diseña. Prueba. Optimiza. Repite.</span><span>Sin cronómetro · La precisión es tu ventaja</span></footer></main></div>${modalMarkup()}</div>`
    bindDrag()
  }
  function modalMarkup() {
    if (!state.modal) return ""
    const certificate = state.modal === "certificate"
    const restart = state.modal === "restart"
    const title = certificate
      ? "¡Certificación de Segmentación Completada!"
      : restart
        ? "¿Reiniciar la campaña?"
        : "Tu misión: salvar la red."
    const text = certificate
      ? "Has contenido una tormenta, equilibrado el tráfico, diseñado subredes, evitado conflictos de IP y desplegado una empresa segmentada."
      : restart
        ? "Se borrarán los XP, las medallas y las misiones completadas. Rehacer una sola misión mantiene tu progreso y no permite acumular XP extra."
        : "Interactúa directamente con las PCs y los destinos punteados. Arrastra equipos, coloca fichas de red y escribe direcciones IP. Cada misión da hasta 300 XP; un error resta 15 y la primera pista resta 25. No hay límite de intentos ni cronómetro. Las pistas se cobran una sola vez por misión."
    return `<div class="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/75 p-5 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1" class="relative my-auto w-full max-w-[540px] rounded-2xl border border-[#48613b] bg-[#191f1b] p-7 shadow-2xl"><button data-action="close" aria-label="Cerrar diálogo" class="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-secondary">${icon("close", 18)}</button><div class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#66834c] bg-[#2d3d23] text-primary">${icon(certificate ? "star" : "shield", 32)}</div><p class="mb-3 font-mono text-[10px] tracking-[2px] text-primary">${
      certificate ? "CAMPAÑA COMPLETADA · 5 / 5" : "NETWORK OPS · BRIEFING"
    }</p><h2 id="dialog-title" class="text-[25px] font-medium leading-8">${title}</h2><p class="mt-4 text-[13px] leading-6 text-muted-foreground">${text}</p>${
      certificate
        ? `<div class="my-6 grid grid-cols-3 gap-2 rounded-xl border border-border p-5 text-center"><div><strong class="block font-mono text-3xl text-primary">${rank()}</strong><span class="text-[10px] text-muted-foreground">Rango final</span></div><div><strong class="block font-mono text-2xl text-primary">${score()}</strong><span class="text-[10px] text-muted-foreground">XP / 1500</span></div><div><strong class="block font-mono text-2xl text-primary">${state.errors}</strong><span class="text-[10px] text-muted-foreground">Reintentos</span></div></div><p class="mb-5 text-[10px] text-muted-foreground">Reconocimiento educativo; no equivale a una certificación oficial Cisco. Rango S: 1400 XP · A: 1200 · B: 900 · C: menos de 900.</p>`
        : '<div class="h-6"></div>'
    }<div class="space-y-2">${button(restart ? "confirm-restart" : "close", restart ? "Sí, reiniciar desde cero" : certificate ? "Volver al laboratorio" : `Aceptar misión ${icon("arrow", 16)}`)}${
      certificate
        ? button("home", "Nueva campaña", true)
        : restart
          ? button("close", "Conservar mi progreso", true)
          : ""
    }</div></section></div>`
  }
  function animate(paths, callback) {
    state.busy = true
    render()
    const seconds = reduced() ? ".01" : "1.2"
    root.querySelector("#packets").innerHTML = paths
      .map(
        (path, index) =>
          `<circle r="5" fill="#c4f39f" filter="drop-shadow(0 0 5px #b1ed87)"><animateMotion dur="${seconds}s" begin="${
            reduced() ? 0 : index * 0.15
          }s" path="${path}" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.05;.9;1" dur="${seconds}s" begin="${
            reduced() ? 0 : index * 0.15
          }s" fill="freeze"/></circle>`,
      )
      .join("")
    delay(
      () => {
        state.busy = false
        callback()
        render()
        if (state.modal) focusDialog()
      },
      reduced() ? 100 : 1700 + paths.length * 150,
    )
  }
  function resetLevel(index) {
    timers.forEach(clearTimeout)
    timers.clear()
    Object.assign(state, {
      level: index,
      done: false,
      busy: false,
      phase: 0,
      recipients: [],
      assignment: [0, 0, 0, 0, 1, 1],
      selectedPC: 0,
      tested: [],
      prefix: 24,
      blocks: [null, null],
      token: null,
      addresses: ["", "", "", ""],
      activePC: 0,
      departments: [null, null, null],
      hint: false,
      modal: "",
      tone: "info",
      feedback:
        index === 0
          ? "Marca los receptores del broadcast de PC-01. Después lanza el paquete."
          : "Nueva misión. Interactúa con los elementos punteados y valida tu estrategia.",
    })
    render()
  }
  function assignIP() {
    const input = root.querySelector("#ip-host")
    if (!input || !input.reportValidity()) return
    const last = Number(input.value)
    if (!Number.isInteger(last) || last < 0 || last > 255) {
      mistake("Introduce un octeto entero entre 0 y 255.")
      render()
      return
    }
    const firstSubnet = state.activePC < 2
    if ([0, 128].includes(last))
      mistake(`.${last} identifica una red, no un host.`)
    else if ([127, 255].includes(last))
      mistake(`.${last} es una dirección de broadcast.`)
    else if ([1, 129].includes(last))
      mistake(`.${last} está reservada para un gateway.`)
    else if (firstSubnet ? last > 126 : last < 130)
      mistake(
        `.${last} no pertenece a la Subred ${
          firstSubnet ? "A" : "B"
        } de esta PC.`,
      )
    else if (
      state.addresses.some(
        (address, index) =>
          index !== state.activePC && address === String(last),
      )
    )
      mistake(`192.168.1.${last} ya está en uso. Evita el conflicto.`)
    else if (state.addresses[state.activePC] === String(last))
      feedback(
        "Este equipo ya tiene esa dirección. No hay cambios que aplicar.",
      )
    else {
      const pc = state.activePC
      state.addresses[pc] = String(last)
      success(
        `PC-0${pc + 1} conectada con 192.168.1.${last}. ${state.addresses.filter(Boolean).length}/4 equipos listos.`,
      )
      const next = state.addresses.findIndex((address) => !address)
      if (next !== -1) state.activePC = next
    }
    render()
    root.querySelector("#ip-host")?.focus()
  }
  function act(action) {
    if (state.busy && !["guide", "close"].includes(action)) return
    if (action === "assign-ip") {
      assignIP()
      return
    }
    if (
      action.startsWith("recipient-") &&
      state.level === 0 &&
      state.phase === 0 &&
      !state.done
    ) {
      const index = Number(action.split("-")[1])
      state.recipients = state.recipients.includes(index)
        ? state.recipients.filter((item) => item !== index)
        : [...state.recipients, index]
      feedback(
        "Predicción preparada. Lanza el broadcast para comprobar los destinos.",
      )
    }
    if (action === "predict" && state.level === 0 && state.phase === 0) {
      if (
        state.recipients.length !== 3 ||
        ![1, 2, 3].every((index) => state.recipients.includes(index))
      ) {
        mistake(
          state.recipients.includes(0)
            ? "PC-01 es el origen: el switch no le devuelve su propio broadcast."
            : "El broadcast llega a todos los otros equipos del dominio. Revisa los destinos.",
        )
        render()
        return
      }
      feedback("Predicción registrada. Comprobando la propagación…")
      animate(
        [
          "M130 165H250V245H360",
          "M360 245H470V165H590",
          "M360 245H250V340H130",
          "M360 245H470V340H590",
        ],
        () => {
          state.phase = 1
          success(
            "¡Impacto confirmado! Los 3 receptores recibieron el paquete. Ahora instala una frontera.",
          )
        },
      )
      return
    }
    if (
      action.startsWith("equipment-") &&
      state.level === 0 &&
      state.phase === 1 &&
      !state.done
    ) {
      if (action === "equipment-router")
        finish(
          "Router instalado: has elegido el equipo que separa dominios de broadcast.",
        )
      else
        mistake(
          "Un switch o un hub amplía el dominio; no detiene el broadcast. Busca una frontera de capa 3.",
        )
    }
    if (action.startsWith("pc-") && state.level === 1 && !state.done) {
      state.selectedPC = Number(action.split("-")[1])
      feedback(
        `PC-0${state.selectedPC + 1} seleccionada. Toca la Red A o B para reubicar sus ${weights[state.selectedPC]} u de tráfico.`,
      )
    }
    if (action.startsWith("zone-") && state.level === 1 && !state.done) {
      const destination = Number(action.split("-")[1])
      if (state.assignment[state.selectedPC] !== destination) {
        state.assignment[state.selectedPC] = destination
        state.tested = []
      }
      feedback(
        balanced()
          ? "¡Equilibrio perfecto: 7 / 7! Prueba un broadcast desde cada dominio."
          : `Carga actual: ${loads().join(" / ")} u. Objetivo: 7 / 7.`,
      )
    }
    if (action.startsWith("test-") && state.level === 1 && !state.done) {
      const network = Number(action.split("-")[1])
      if (!balanced()) {
        mistake(
          "Hay sobrecarga. Equilibra ambos segmentos a 7 u antes de probar.",
        )
        render()
        return
      }
      if (state.tested.includes(network)) {
        feedback("Este dominio ya pasó la prueba. Comprueba el otro.")
        render()
        return
      }
      const center = network === 0 ? 185 : 535
      const peers = state.assignment
        .map((team, index) => ({ team, index }))
        .filter((pc) => pc.team === network)
      const paths = peers.map((pc, slot) => {
        const x = center - 100 + (slot % 3) * 100
        const y = 285 + Math.floor(slot / 3) * 100
        return slot === 0
          ? `M${x} ${y}V${y - 40}H${center}V205`
          : `M${center} 205V${y - 40}H${x}V${y}`
      })
      feedback(
        `Probando Red ${
          network === 0 ? "A" : "B"
        }: observa cómo el router bloquea el broadcast.`,
      )
      animate(paths, () => {
        state.tested.push(network)
        if (state.tested.length === 2)
          finish("Ambos dominios aislados y carga equilibrada.")
        else success("Dominio verificado. Ahora prueba el otro segmento.")
      })
      return
    }
    if (
      action.startsWith("prefix-") &&
      [2, 4].includes(state.level) &&
      !state.done
    ) {
      state.prefix = Math.max(
        24,
        Math.min(28, state.prefix + (action === "prefix-up" ? 1 : -1)),
      )
      feedback(
        `/${state.prefix}: ${2 ** (state.prefix - 24)} subredes, ${2 ** (32 - state.prefix) - 2} hosts por subred. Comprueba capacidad y fronteras.`,
      )
    }
    if (
      action.startsWith("token-") &&
      [2, 4].includes(state.level) &&
      !state.done
    ) {
      state.token = Number(action.split("-")[1])
      feedback(
        `Ficha 192.168.1.${state.token} seleccionada. Toca ${
          state.level === 2 ? "una subred" : "un departamento"
        } en el mapa.`,
      )
    }
    if (action.startsWith("slot-") && state.level === 2 && !state.done) {
      if (state.token === null)
        feedback("Primero selecciona una ficha de dirección de red.")
      else {
        state.blocks[Number(action.split("-")[1])] = state.token
        state.token = null
        feedback(
          "Ficha colocada. Puedes sustituirla seleccionando otra dirección.",
        )
      }
    }
    if (action === "validate-design" && state.level === 2 && !state.done) {
      if (state.prefix !== 25)
        mistake(
          state.prefix === 24
            ? "No has dividido /24: necesitamos 2 subredes."
            : "Ese prefijo crea más de 2 subredes y no deja 100 hosts por bloque.",
        )
      else if (state.blocks[0] !== 0 || state.blocks[1] !== 128)
        mistake(
          "Subred A debe comenzar en .0 y Subred B en .128. Coloca las fronteras correctas.",
        )
      else {
        feedback("Diseño aceptado. Comprobando ambas fronteras…")
        animate(["M360 135V185H185V335", "M360 135V185H535V335"], () =>
          finish("Dos subredes /25: 126 hosts útiles por bloque."),
        )
        return
      }
    }
    if (action.startsWith("configure-") && state.level === 3 && !state.done) {
      state.activePC = Number(action.split("-")[1])
      feedback(
        `Configura PC-0${state.activePC + 1} en Subred ${
          state.activePC < 2 ? "A" : "B"
        }. Introduce el último octeto.`,
      )
    }
    if (action === "ping" && state.level === 3 && !state.done) {
      if (!state.addresses.every(Boolean))
        mistake(
          "Todavía hay equipos sin dirección. Configura las 4 PCs antes de probar.",
        )
      else {
        feedback("Comprobando hosts, conflictos y conectividad local…")
        animate(
          [
            "M113 345V295H185V230",
            "M185 230V295H257V345",
            "M463 345V295H535V230",
            "M535 230V295H607V345",
          ],
          () =>
            finish(
              "Cuatro IP únicas, rangos correctos y conectividad verificada.",
            ),
        )
        return
      }
    }
    if (action.startsWith("department-") && state.level === 4 && !state.done) {
      if (state.token === null)
        feedback(
          "Selecciona una ficha antes de asignar una red al departamento.",
        )
      else {
        state.departments[Number(action.split("-")[1])] = state.token
        state.token = null
        feedback(
          "Bloque asignado. Cada departamento debe tener una red distinta.",
        )
      }
    }
    if (action === "activate" && state.level === 4 && !state.done) {
      if (state.prefix !== 26)
        mistake(
          state.prefix > 26
            ? "Capacidad insuficiente: Ventas necesita 50 hosts y TI 35. Aumenta el tamaño de cada bloque."
            : "Hay demasiado desperdicio y no obtienes los 4 bloques requeridos. Busca la máscara uniforme mínima que cumpla todo.",
        )
      else if (state.departments.some((block) => block === null))
        mistake("Falta asignar la red de algún departamento.")
      else if (new Set(state.departments).size !== 3)
        mistake(
          "Dos departamentos comparten una red. Eso rompe el aislamiento: asigna 3 bloques distintos.",
        )
      else {
        const reserved = [0, 64, 128, 192].find(
          (block) => !state.departments.includes(block),
        )
        feedback("Desplegando la empresa y lanzando pruebas de aislamiento…")
        animate(
          [135, 360, 585].flatMap((x) => [`M${x} 365V280`, `M${x} 280V365`]),
          () => {
            finish(
              `Empresa operativa. 3 dominios aislados; 192.168.1.${reserved}/26 reservada para crecer.`,
            )
            state.modal = "certificate"
          },
        )
        return
      }
    }
    if (action === "hint") {
      if (!state.hint && !state.hintUsed[state.level] && !state.done) {
        state.hintUsed[state.level] = true
        state.penalties[state.level] += 25
        feedback(
          "Pista desbloqueada: −25 XP. Puedes consultarla otra vez sin coste adicional.",
        )
      }
      state.hint = !state.hint
    }
    if (action === "next" && state.done && state.level < 4) {
      resetLevel(state.level + 1)
      return
    }
    if (action === "reset") {
      resetLevel(state.level)
      return
    }
    if (action.startsWith("level-")) {
      const index = Number(action.split("-")[1])
      if (index <= state.unlocked) {
        resetLevel(index)
        return
      }
    }
    if (action === "guide") state.modal = "guide"
    if (
      action === "certificate" &&
      state.awards.every((award) => award !== null)
    )
      state.modal = "certificate"
    if (action === "home") state.modal = "restart"
    if (action === "confirm-restart") {
      Object.assign(state, {
        unlocked: 0,
        penalties: [0, 0, 0, 0, 0],
        hintUsed: [false, false, false, false, false],
        awards: [null, null, null, null, null],
        errors: 0,
        streak: 0,
      })
      resetLevel(0)
      return
    }
    if (action === "close") state.modal = ""
    render()
    if (state.modal) focusDialog()
    else if (action.startsWith("configure-"))
      root.querySelector("#ip-host")?.focus()
    else
      root
        .querySelector(`[data-action="${action}"]`)
        ?.focus({ preventScroll: true })
  }
  function focusDialog() {
    root.querySelector('[role="dialog"]')?.focus()
  }
  let dragged = false
  function bindDrag() {
    root.querySelectorAll('[data-action^="pc-"]').forEach((pc) => {
      let origin = null
      pc.classList.add("touch-none")
      pc.addEventListener("pointerdown", (event) => {
        if (state.busy) return
        origin = { x: event.clientX, y: event.clientY }
        pc.setPointerCapture(event.pointerId)
      })
      pc.addEventListener("pointermove", (event) => {
        if (!origin) return
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 7)
          return
        dragged = true
        const svg = root.querySelector("#network-map")
        const point = svg.createSVGPoint()
        point.x = event.clientX
        point.y = event.clientY
        const position = point.matrixTransform(svg.getScreenCTM().inverse())
        pc.setAttribute("transform", `translate(${position.x},${position.y})`)
        pc.classList.add("opacity-70")
      })
      pc.addEventListener("pointerup", (event) => {
        if (!origin) return
        origin = null
        if (!dragged) return
        state.selectedPC = Number(pc.dataset.action.slice(3))
        const destination = [...root.querySelectorAll("[data-drop]")].find(
          (zone) => {
            const bounds = zone.getBoundingClientRect()
            return (
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom
            )
          },
        )
        if (destination) act(`zone-${destination.dataset.drop}`)
        else {
          feedback(
            "Suelta el equipo dentro de Red A o Red B. También puedes seleccionarlo y pulsar el destino.",
          )
          render()
        }
        delay(() => {
          dragged = false
        }, 0)
      })
      pc.addEventListener("pointercancel", () => {
        origin = null
        dragged = false
        render()
      })
    })
  }
  function onClick(event) {
    if (dragged) return
    const control = event.target.closest("[data-action]")
    if (control && !control.disabled) {
      event.preventDefault()
      act(control.dataset.action)
    }
  }
  function onSubmit(event) {
    if (event.target.id === "ip-form") {
      event.preventDefault()
      if (!state.busy && !state.done) assignIP()
    }
  }
  function onKey(event) {
    if (state.modal) {
      if (event.key === "Escape") {
        event.preventDefault()
        act("close")
        return
      }
      if (event.key === "Tab") {
        const buttons = [...root.querySelectorAll('[role="dialog"] button')]
        if (
          event.shiftKey &&
          (document.activeElement === buttons[0] ||
            document.activeElement.getAttribute("role") === "dialog")
        ) {
          event.preventDefault()
          buttons.at(-1).focus()
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons.at(-1)
        ) {
          event.preventDefault()
          buttons[0].focus()
        }
      }
    }
    if (
      ["Enter", " "].includes(event.key) &&
      event.target.matches('[role="button"][data-action]')
    ) {
      event.preventDefault()
      act(event.target.dataset.action)
    }
  }
  root.addEventListener("click", onClick)
  root.addEventListener("keydown", onKey)
  root.addEventListener("submit", onSubmit)
  render()
  return () => {
    timers.forEach(clearTimeout)
    root.removeEventListener("click", onClick)
    root.removeEventListener("keydown", onKey)
    root.removeEventListener("submit", onSubmit)
    root.innerHTML = ""
  }
}
