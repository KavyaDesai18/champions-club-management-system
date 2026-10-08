package com.championsclub.shop.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @Column(name = "variant_id")
    private UUID variantId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "on_hand", nullable = false)
    @Builder.Default
    private Integer onHand = 0;

    @Column(name = "reserved", nullable = false)
    @Builder.Default
    private Integer reserved = 0;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public int getAvailable() {
        int h = (onHand != null) ? onHand : 0;
        int r = (reserved != null) ? reserved : 0;
        return Math.max(0, h - r);
    }
}
