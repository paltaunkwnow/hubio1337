// xd
/**
 * Simple Encryption Utility for Hubio Messages
 * Note: For production-grade E2EE, a more complex Diffie-Hellman key exchange should be used.
 * This provides a basic layer of obfuscation/encryption at the data level.
 */

export function encryptMessage(text: string): string {
  // Simple Base64 + Obfuscation for this demo
  // A real implementation would use SubtleCrypto with AES-GCM
  try {
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return `enc_${encoded.split('').reverse().join('')}`;
  } catch {
    return text;
  }
}

export function decryptMessage(encrypted: string): string {
  if (!encrypted.startsWith('enc_')) return encrypted;
  try {
    const data = encrypted.replace('enc_', '').split('').reverse().join('');
    return decodeURIComponent(escape(atob(data)));
  } catch {
    return "Error al descifrar mensaje";
  }
}
