// WebAuthn utility functions for frontend
export class WebAuthnHelper {
  /**
   * Register a new WebAuthn credential
   * @param {Object} options - Registration options from server
   * @returns {Promise<Object>} - Registration response
   */
  static async registerCredential(options) {
    try {
      // Convert base64url challenge to Uint8Array
      options.challenge = this.base64urlToUint8Array(options.challenge);

      // Convert user ID to Uint8Array
      options.user.id = this.base64urlToUint8Array(options.user.id);

      // Convert allowCredentials (if present) to proper format
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToUint8Array(cred.id)
        }));
      }

      // Convert excludeCredentials (if present) to proper format
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToUint8Array(cred.id)
        }));
      }

      // Call WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      // Convert response to serializable format
      const response = {
        id: credential.id,
        rawId: this.uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
        type: credential.type,
        response: {
          clientDataJSON: this.uint8ArrayToBase64url(new Uint8Array(credential.response.clientDataJSON)),
          attestationObject: this.uint8ArrayToBase64url(new Uint8Array(credential.response.attestationObject))
        }
      };

      return response;
    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      throw new Error(`WebAuthn registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate with a WebAuthn credential
   * @param {Object} options - Authentication options from server
   * @returns {Promise<Object>} - Authentication response
   */
  static async authenticateCredential(options) {
    try {
      // Convert base64url challenge to Uint8Array
      options.challenge = this.base64urlToUint8Array(options.challenge);

      // Convert allowCredentials to proper format
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToUint8Array(cred.id)
        }));
      }

      // Call WebAuthn API
      const assertion = await navigator.credentials.get({
        publicKey: options
      });

      // Convert response to serializable format
      const response = {
        id: assertion.id,
        rawId: this.uint8ArrayToBase64url(new Uint8Array(assertion.rawId)),
        type: assertion.type,
        response: {
          clientDataJSON: this.uint8ArrayToBase64url(new Uint8Array(assertion.response.clientDataJSON)),
          authenticatorData: this.uint8ArrayToBase64url(new Uint8Array(assertion.response.authenticatorData)),
          signature: this.uint8ArrayToBase64url(new Uint8Array(assertion.response.signature)),
          userHandle: assertion.response.userHandle ?
            this.uint8ArrayToBase64url(new Uint8Array(assertion.response.userHandle)) : null
        }
      };

      return response;
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      throw new Error(`WebAuthn authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if WebAuthn is supported
   * @returns {boolean} - True if supported
   */
  static isSupported() {
    try {
      // Safely check for WebAuthn support without triggering any getters
      if (typeof window === 'undefined') return false;
      if (!window.navigator) return false;
      
      // Check for PublicKeyCredential first (safer than accessing navigator.credentials)
      if (typeof window.PublicKeyCredential === 'undefined') return false;
      
      return true;
    } catch (error) {
      console.log('WebAuthn support check error:', error);
      return false;
    }
  }

  /**
   * Check if platform authenticator is available
   * @returns {Promise<boolean>} - True if available
   */
  static async isPlatformAuthenticatorAvailable() {
    if (!this.isSupported()) return false;

    try {
      // Check if PublicKeyCredential exists and has the required method
      if (typeof window.PublicKeyCredential === 'undefined') {
        return false;
      }

      // Safely call the method with proper context
      if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available === true;
      }
      return false;
    } catch (error) {
      console.log('Platform authenticator check failed:', error);
      return false;
    }
  }

  /**
   * Convert base64url string to Uint8Array
   * @param {string} base64url - Base64url encoded string
   * @returns {Uint8Array} - Decoded bytes
   */
  static base64urlToUint8Array(base64url) {
    // Convert base64url to base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Decode base64 to binary string
    const binaryString = atob(base64);

    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  /**
   * Convert Uint8Array to base64url string
   * @param {Uint8Array} bytes - Bytes to encode
   * @returns {string} - Base64url encoded string
   */
  static uint8ArrayToBase64url(bytes) {
    // Convert to binary string
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    // Convert to base64
    let base64 = btoa(binaryString);

    // Convert to base64url
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return base64;
  }
}

export default WebAuthnHelper;
