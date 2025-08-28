package security;

//package com.ms.msde.szr.workspaceplugin.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Formatter;

public class HmacUtils {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    /**
     * Calculates the HMAC-SHA256 signature for a given message and secret.
     * @param secret The shared secret key.
     * @param message The message (e.g., JSON payload) to sign.
     * @return The signature as a lowercase hex string, prefixed with "sha256=".
     * @throws NoSuchAlgorithmException If the HmacSHA256 algorithm is not available.
     * @throws InvalidKeyException If the secret key is invalid.
     */
    public static String calculateSignature(String secret, String message) throws NoSuchAlgorithmException, InvalidKeyException {
        Mac sha256Hmac = Mac.getInstance(HMAC_ALGORITHM);
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
        sha256Hmac.init(secretKey);

        byte[] signatureBytes = sha256Hmac.doFinal(message.getBytes(StandardCharsets.UTF_8));

        return "sha256=" + toHexString(signatureBytes);
    }

    private static String toHexString(byte[] bytes) {
        Formatter formatter = new Formatter();
        for (byte b : bytes) {
            formatter.format("%02x", b);
        }
        return formatter.toString();
    }
}