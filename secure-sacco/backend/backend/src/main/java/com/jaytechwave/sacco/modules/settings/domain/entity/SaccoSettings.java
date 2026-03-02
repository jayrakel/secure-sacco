package com.jaytechwave.sacco.modules.settings.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "sacco_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaccoSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sacco_name", nullable = false)
    private String saccoName;

    @Column(name = "member_number_prefix", nullable = false, length = 3)
    private String memberNumberPrefix;

    @Column(name = "member_number_pad_length", nullable = false)
    @Builder.Default
    private Integer memberNumberPadLength = 7;

    // Hibernate 6 native JSON mapping
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "enabled_modules", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Boolean> enabledModules = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "registration_fee", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal registrationFee = new BigDecimal("1000.00");
}