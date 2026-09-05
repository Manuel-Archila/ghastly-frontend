/**
 * UUIDv7: 48 bits de timestamp (ordenable en el tiempo) + resto aleatorio.
 * El servidor nunca asigna IDs de entidades de dominio — se generan acá
 * (CLAUDE.md).
 *
 * Usa `Math.random()`, no un CSPRNG: un id de entidad no es un secreto,
 * solo necesita ser único. Evita cargar `react-native-get-random-values` +
 * una librería de uuid solo para esto (CLAUDE.md: "antes de instalar una
 * dependencia, evaluar si son 40 líneas propias").
 */
export function uuidv7(): string {
  const timestamp = Date.now();
  const bytes = new Uint8Array(16);

  bytes[0] = (timestamp / 2 ** 40) & 0xff;
  bytes[1] = (timestamp / 2 ** 32) & 0xff;
  bytes[2] = (timestamp / 2 ** 24) & 0xff;
  bytes[3] = (timestamp / 2 ** 16) & 0xff;
  bytes[4] = (timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  for (let i = 6; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versión 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
