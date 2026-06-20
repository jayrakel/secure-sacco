package com.jaytechwave.sacco.modules.paymentproducts.domain.entity;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_type", nullable = false, length = 20)
    private ModuleType moduleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gl_account_id", nullable = false)
    private Account glAccount;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "required_amount", precision = 14, scale = 2)
    private BigDecimal requiredAmount;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean isSystem = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}