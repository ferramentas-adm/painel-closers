// Limitador simples em memoria - suficiente porque o servidor roda numa
// unica instancia (pm2 fork, sem cluster). Conta so tentativas com falha,
// pra nao atrapalhar uso legitimo.
const tentativas = new Map();

export function checkRateLimit(key, { maxTentativas = 5, janelaMs = 15 * 60 * 1000 } = {}) {
  const agora = Date.now();
  const entrada = tentativas.get(key);

  if (!entrada || agora - entrada.inicio > janelaMs) {
    return { bloqueado: false };
  }
  if (entrada.count >= maxTentativas) {
    return { bloqueado: true, tentarNovamenteEmMs: janelaMs - (agora - entrada.inicio) };
  }
  return { bloqueado: false };
}

export function registrarFalha(key, { janelaMs = 15 * 60 * 1000 } = {}) {
  const agora = Date.now();
  const entrada = tentativas.get(key);
  if (!entrada || agora - entrada.inicio > janelaMs) {
    tentativas.set(key, { count: 1, inicio: agora });
    return;
  }
  entrada.count += 1;
}

export function limparTentativas(key) {
  tentativas.delete(key);
}
