package com.championsclub.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierDto {
    private UUID id;
    private String name;
    private String contactName;
    private String email;
    private String phone;
    private String address;
    private String paymentTerms;
    private Boolean active;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotBlank(message = "Supplier name is required")
        private String name;
        private String contactName;
        private String email;
        private String phone;
        private String address;
        @Builder.Default
        private String paymentTerms = "NET_30";
        @Builder.Default
        private Boolean active = true;
    }
}
