package com.championsclub.member.service;

import com.championsclub.common.error.BusinessValidationException;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
public class QrCodeService {

    private final String secretKey;
    private final long tokenValiditySeconds;

    public QrCodeService(
            @Value("${app.security.qr-secret:champions-club-super-secure-qr-signing-key-32chars}") String secretKey,
            @Value("${app.security.qr-validity-seconds:2592000}") long tokenValiditySeconds // Default 30 days
    ) {
        this.secretKey = secretKey;
        this.tokenValiditySeconds = tokenValiditySeconds;
    }

    public String generateQrToken(UUID memberId, String memberNo) {
        long expiresAt = Instant.now().getEpochSecond() + tokenValiditySeconds;
        String payload = memberId.toString() + "|" + memberNo + "|" + expiresAt;
        String signature = calculateHmac(payload);
        String rawToken = payload + "|" + signature;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes(StandardCharsets.UTF_8));
    }

    public record VerifiedQrToken(UUID memberId, String memberNo, Instant expiresAt) {}

    public VerifiedQrToken verifyQrToken(String token) {
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(token.trim());
            String rawToken = new String(decoded, StandardCharsets.UTF_8);
            String[] parts = rawToken.split("\\|");
            if (parts.length != 4) {
                throw new BusinessValidationException("Malformed or invalid QR token format", "INVALID_QR_TOKEN");
            }

            UUID memberId = UUID.fromString(parts[0]);
            String memberNo = parts[1];
            long expiryEpoch = Long.parseLong(parts[2]);
            String signature = parts[3];

            String expectedPayload = memberId + "|" + memberNo + "|" + expiryEpoch;
            String expectedSignature = calculateHmac(expectedPayload);

            if (!expectedSignature.equals(signature)) {
                throw new BusinessValidationException("QR token signature verification failed (tampered token)", "TAMPERED_QR_TOKEN");
            }

            Instant expiresAt = Instant.ofEpochSecond(expiryEpoch);
            if (Instant.now().isAfter(expiresAt)) {
                throw new BusinessValidationException("QR token has expired. Please refresh the member badge.", "EXPIRED_QR_TOKEN");
            }

            return new VerifiedQrToken(memberId, memberNo, expiresAt);
        } catch (BusinessValidationException bve) {
            throw bve;
        } catch (Exception ex) {
            throw new BusinessValidationException("Unable to decode QR token: " + ex.getMessage(), "INVALID_QR_TOKEN");
        }
    }

    public String generateQrCodeDataUrl(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            byte[] imageBytes = outputStream.toByteArray();

            return "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
        } catch (Exception e) {
            return null;
        }
    }

    private String calculateHmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC signature", e);
        }
    }
}
