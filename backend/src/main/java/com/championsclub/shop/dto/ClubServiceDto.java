package com.championsclub.shop.dto;

import com.championsclub.shop.domain.ServiceType;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubServiceDto {
    private UUID id;
    private String code;
    private String name;
    private ServiceType serviceType;
    private BigDecimal basePrice;
    private String description;
    private Boolean active;
}
